"""Contas a pagar/receber (seções 20/21): não são novas entidades — são
visões agrupadas por urgência sobre Expense/Income já pendentes/atrasados.
'Vencida' é derivada comparando a data com hoje, nunca armazenada."""
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.transaction import Expense, ExpenseStatus, Income, IncomeStatus


def get_payables(db: Session, user_id: str) -> dict:
    today = date.today()
    in_7_days = today + timedelta(days=7)
    in_30_days = today + timedelta(days=30)

    pending = (
        db.query(Expense)
        .filter(
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None),
            Expense.status.in_([ExpenseStatus.pending, ExpenseStatus.late]),
        )
        .order_by(Expense.expense_date.asc())
        .all()
    )

    overdue = [e for e in pending if e.expense_date < today]
    due_today = [e for e in pending if e.expense_date == today]
    upcoming = [e for e in pending if today < e.expense_date <= in_30_days]
    due_next_7 = [e for e in pending if today < e.expense_date <= in_7_days]

    return {
        "overdue_total": sum((Decimal(e.amount) for e in overdue), Decimal("0")),
        "due_today_total": sum((Decimal(e.amount) for e in due_today), Decimal("0")),
        "due_next_7_days_total": sum((Decimal(e.amount) for e in due_next_7), Decimal("0")),
        "due_next_30_days_total": sum((Decimal(e.amount) for e in upcoming), Decimal("0")),
        "overdue": overdue,
        "due_today": due_today,
        "upcoming": upcoming,
    }


def get_receivables(db: Session, user_id: str) -> dict:
    today = date.today()
    in_7_days = today + timedelta(days=7)
    in_30_days = today + timedelta(days=30)

    pending = (
        db.query(Income)
        .filter(
            Income.user_id == user_id,
            Income.deleted_at.is_(None),
            Income.status.in_([IncomeStatus.expected, IncomeStatus.late]),
        )
        .order_by(Income.income_date.asc())
        .all()
    )

    overdue = [i for i in pending if i.income_date < today]
    due_today = [i for i in pending if i.income_date == today]
    upcoming = [i for i in pending if today < i.income_date <= in_30_days]
    due_next_7 = [i for i in pending if today < i.income_date <= in_7_days]

    return {
        "overdue_total": sum((Decimal(i.amount) for i in overdue), Decimal("0")),
        "due_today_total": sum((Decimal(i.amount) for i in due_today), Decimal("0")),
        "due_next_7_days_total": sum((Decimal(i.amount) for i in due_next_7), Decimal("0")),
        "due_next_30_days_total": sum((Decimal(i.amount) for i in upcoming), Decimal("0")),
        "overdue": overdue,
        "due_today": due_today,
        "upcoming": upcoming,
    }
