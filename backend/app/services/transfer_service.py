"""Transferência (seção 16): nunca é receita ou despesa. Diminui a conta de
origem e aumenta a de destino atomicamente via duas linhas no ledger."""
from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.account import AccountTransactionType
from app.models.misc import Transfer
from app.schemas.transfer import TransferCreate
from app.services import account_service, balance_service


def list_transfers(db: Session, user_id: str) -> list[Transfer]:
    return (
        db.query(Transfer)
        .filter(Transfer.user_id == user_id)
        .order_by(Transfer.transfer_date.desc(), Transfer.created_at.desc())
        .all()
    )


def get_transfer(db: Session, user_id: str, transfer_id: str) -> Transfer:
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id, Transfer.user_id == user_id).first()
    if not transfer:
        raise NotFoundError("Transferência não encontrada")
    return transfer


def create_transfer(db: Session, user_id: str, payload: TransferCreate) -> Transfer:
    # valida que ambas as contas existem e pertencem ao usuário
    account_service.get_account(db, user_id, payload.from_account_id)
    account_service.get_account(db, user_id, payload.to_account_id)

    transfer = Transfer(
        user_id=user_id,
        from_account_id=payload.from_account_id,
        to_account_id=payload.to_account_id,
        amount=payload.amount,
        transfer_date=payload.transfer_date,
        description=payload.description,
    )
    db.add(transfer)
    db.flush()

    description = payload.description or "Transferência entre contas"
    balance_service.record_transaction(
        db, account_id=payload.from_account_id, amount=-payload.amount,
        type=AccountTransactionType.transfer_out, transaction_date=payload.transfer_date,
        reference_type="transfer", reference_id=transfer.id, description=description,
    )
    balance_service.record_transaction(
        db, account_id=payload.to_account_id, amount=payload.amount,
        type=AccountTransactionType.transfer_in, transaction_date=payload.transfer_date,
        reference_type="transfer", reference_id=transfer.id, description=description,
    )

    db.commit()
    db.refresh(transfer)
    return transfer


def delete_transfer(db: Session, user_id: str, transfer_id: str) -> None:
    transfer = get_transfer(db, user_id, transfer_id)
    balance_service.reverse_transactions_for_reference(
        db, reference_type="transfer", reference_id=transfer.id,
        transaction_date=date.today(), description=transfer.description or "Transferência",
    )
    db.delete(transfer)
    db.commit()
