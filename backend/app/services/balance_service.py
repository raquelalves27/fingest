"""Serviço responsável pelo ledger de contas (account_transactions).

Regra de ouro do sistema: o saldo de uma conta NUNCA é um campo editado
diretamente. É sempre `initial_balance + SUM(account_transactions.amount)`.
Qualquer evento que mexa em dinheiro (receita recebida, despesa paga,
transferência, pagamento de fatura, estorno) deve passar por este serviço
para gerar a linha correspondente no ledger.
"""
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account, AccountTransaction, AccountTransactionType


def get_account_balance(db: Session, account_id: str) -> Decimal:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return Decimal("0")

    total_moves = (
        db.query(func.coalesce(func.sum(AccountTransaction.amount), 0))
        .filter(AccountTransaction.account_id == account_id)
        .scalar()
    )
    return Decimal(account.initial_balance) + Decimal(total_moves)


def get_total_balance(db: Session, user_id: str) -> Decimal:
    account_ids = [
        a.id for a in db.query(Account.id)
        .filter(Account.user_id == user_id, Account.deleted_at.is_(None), Account.is_active.is_(True))
        .all()
    ]
    total = Decimal("0")
    for account_id in account_ids:
        total += get_account_balance(db, account_id)
    return total


def record_transaction(
    db: Session,
    account_id: str,
    amount: Decimal,
    type: AccountTransactionType,
    transaction_date: date,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    description: Optional[str] = None,
) -> AccountTransaction:
    """Cria uma linha no ledger. Não faz commit — quem chama controla a transação."""
    entry = AccountTransaction(
        account_id=account_id,
        amount=amount,
        type=type,
        reference_type=reference_type,
        reference_id=reference_id,
        description=description,
        transaction_date=transaction_date,
    )
    db.add(entry)
    db.flush()
    return entry


def reverse_transactions_for_reference(
    db: Session, reference_type: str, reference_id: str, transaction_date: date, description: str
) -> None:
    """Gera movimentações inversas para todas as linhas do ledger associadas
    a uma referência (ex: estornar uma despesa paga). Nunca edita/apaga a
    linha original — mantém rastreabilidade total (seção 35/36 do escopo)."""
    original_entries = (
        db.query(AccountTransaction)
        .filter(
            AccountTransaction.reference_type == reference_type,
            AccountTransaction.reference_id == reference_id,
        )
        .all()
    )
    for entry in original_entries:
        record_transaction(
            db,
            account_id=entry.account_id,
            amount=-entry.amount,
            type=AccountTransactionType.adjustment,
            transaction_date=transaction_date,
            reference_type=reference_type,
            reference_id=reference_id,
            description=f"Estorno: {description}",
        )
