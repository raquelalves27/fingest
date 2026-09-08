"""Mesma lógica de income_service, espelhada para despesas: só gera saída no
ledger quando status == 'paid' e há account_id definida.
"""
from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.account import AccountTransactionType
from app.models.transaction import Expense, ExpenseStatus
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services import balance_service


def list_expenses(
    db: Session,
    user_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: str | None = None,
    account_id: str | None = None,
    status: ExpenseStatus | None = None,
) -> list[Expense]:
    query = db.query(Expense).filter(Expense.user_id == user_id, Expense.deleted_at.is_(None))
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if account_id:
        query = query.filter(Expense.account_id == account_id)
    if status:
        query = query.filter(Expense.status == status)
    return query.order_by(Expense.expense_date.desc(), Expense.created_at.desc()).all()


def get_expense(db: Session, user_id: str, expense_id: str) -> Expense:
    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.user_id == user_id, Expense.deleted_at.is_(None))
        .first()
    )
    if not expense:
        raise NotFoundError("Despesa não encontrada")
    return expense


def _sync_ledger_for_expense(db: Session, expense: Expense) -> None:
    balance_service.reverse_transactions_for_reference(
        db, reference_type="expense", reference_id=expense.id,
        transaction_date=expense.expense_date, description=expense.description,
    )
    if expense.status == ExpenseStatus.paid and expense.account_id:
        balance_service.record_transaction(
            db, account_id=expense.account_id, amount=-expense.amount,
            type=AccountTransactionType.expense, transaction_date=expense.expense_date,
            reference_type="expense", reference_id=expense.id, description=expense.description,
        )


def create_expense(db: Session, user_id: str, payload: ExpenseCreate) -> Expense:
    expense = Expense(
        user_id=user_id,
        account_id=payload.account_id,
        category_id=payload.category_id,
        description=payload.description,
        amount=payload.amount,
        expense_date=payload.expense_date,
        payment_method=payload.payment_method,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(expense)
    db.flush()

    if expense.status == ExpenseStatus.paid and expense.account_id:
        balance_service.record_transaction(
            db, account_id=expense.account_id, amount=-expense.amount,
            type=AccountTransactionType.expense, transaction_date=expense.expense_date,
            reference_type="expense", reference_id=expense.id, description=expense.description,
        )
    db.commit()
    db.refresh(expense)
    return expense


def update_expense(db: Session, user_id: str, expense_id: str, payload: ExpenseUpdate) -> Expense:
    expense = get_expense(db, user_id, expense_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(expense, field, value)
    db.flush()
    _sync_ledger_for_expense(db, expense)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, user_id: str, expense_id: str) -> None:
    expense = get_expense(db, user_id, expense_id)
    balance_service.reverse_transactions_for_reference(
        db, reference_type="expense", reference_id=expense.id,
        transaction_date=date.today(), description=expense.description,
    )
    expense.deleted_at = date.today()
    db.commit()
