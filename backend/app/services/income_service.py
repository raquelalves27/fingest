"""Regras: uma receita só gera movimentação no ledger (account_transactions)
quando seu status é 'received' e ela tem uma account_id definida. Mudar o
status de/para 'received', trocar de conta, editar o valor, ou excluir a
receita — tudo precisa manter o ledger sincronizado. Nunca editamos uma linha
do ledger existente: sempre estornamos (linha inversa) e, se aplicável,
lançamos uma nova.
"""
from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.account import AccountTransactionType
from app.models.transaction import Income, IncomeStatus
from app.schemas.income import IncomeCreate, IncomeUpdate
from app.services import balance_service


def list_incomes(
    db: Session,
    user_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: str | None = None,
    account_id: str | None = None,
    status: IncomeStatus | None = None,
) -> list[Income]:
    query = db.query(Income).filter(Income.user_id == user_id, Income.deleted_at.is_(None))
    if start_date:
        query = query.filter(Income.income_date >= start_date)
    if end_date:
        query = query.filter(Income.income_date <= end_date)
    if category_id:
        query = query.filter(Income.category_id == category_id)
    if account_id:
        query = query.filter(Income.account_id == account_id)
    if status:
        query = query.filter(Income.status == status)
    return query.order_by(Income.income_date.desc(), Income.created_at.desc()).all()


def get_income(db: Session, user_id: str, income_id: str) -> Income:
    income = (
        db.query(Income)
        .filter(Income.id == income_id, Income.user_id == user_id, Income.deleted_at.is_(None))
        .first()
    )
    if not income:
        raise NotFoundError("Receita não encontrada")
    return income


def _sync_ledger_for_income(db: Session, income: Income) -> None:
    """Garante que o ledger reflita exatamente o estado atual da receita:
    estorna qualquer lançamento anterior associado a ela e, se o status
    atual for 'received' com uma conta definida, lança a entrada."""
    balance_service.reverse_transactions_for_reference(
        db, reference_type="income", reference_id=income.id,
        transaction_date=income.income_date, description=income.description,
    )
    if income.status == IncomeStatus.received and income.account_id:
        balance_service.record_transaction(
            db, account_id=income.account_id, amount=income.amount,
            type=AccountTransactionType.income, transaction_date=income.income_date,
            reference_type="income", reference_id=income.id, description=income.description,
        )


def create_income(db: Session, user_id: str, payload: IncomeCreate) -> Income:
    income = Income(
        user_id=user_id,
        account_id=payload.account_id,
        category_id=payload.category_id,
        description=payload.description,
        amount=payload.amount,
        income_date=payload.income_date,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(income)
    db.flush()  # garante income.id antes de lançar no ledger

    if income.status == IncomeStatus.received and income.account_id:
        balance_service.record_transaction(
            db, account_id=income.account_id, amount=income.amount,
            type=AccountTransactionType.income, transaction_date=income.income_date,
            reference_type="income", reference_id=income.id, description=income.description,
        )
    db.commit()
    db.refresh(income)
    return income


def update_income(db: Session, user_id: str, income_id: str, payload: IncomeUpdate) -> Income:
    income = get_income(db, user_id, income_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(income, field, value)
    db.flush()
    _sync_ledger_for_income(db, income)
    db.commit()
    db.refresh(income)
    return income


def delete_income(db: Session, user_id: str, income_id: str) -> None:
    income = get_income(db, user_id, income_id)
    balance_service.reverse_transactions_for_reference(
        db, reference_type="income", reference_id=income.id,
        transaction_date=date.today(), description=income.description,
    )
    income.deleted_at = date.today()
    db.commit()
