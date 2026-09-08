from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.credit_card import (
    CreditCardInvoice, InvoiceStatus, CreditCard, CreditCardInstallment, InstallmentStatus
)
from app.models.transaction import Income, Expense, IncomeStatus, ExpenseStatus
from app.services import balance_service


def _month_bounds(ref: date) -> tuple[date, date]:
    start = ref.replace(day=1)
    end = start + relativedelta(months=1) - relativedelta(days=1)
    return start, end


def _sum_income(db: Session, user_id: str, start: date, end: date) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(
            Income.user_id == user_id,
            Income.deleted_at.is_(None),
            Income.status != IncomeStatus.cancelled,
            Income.income_date >= start,
            Income.income_date <= end,
        )
        .scalar()
    )
    return Decimal(total)


def _sum_expense(db: Session, user_id: str, start: date, end: date) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None),
            Expense.status != ExpenseStatus.cancelled,
            Expense.expense_date >= start,
            Expense.expense_date <= end,
        )
        .scalar()
    )
    return Decimal(total)


def get_summary(db: Session, user_id: str) -> dict:
    today = date.today()
    start, end = _month_bounds(today)
    prev_start, prev_end = _month_bounds(start - relativedelta(days=1))

    total_balance = balance_service.get_total_balance(db, user_id)
    monthly_income = _sum_income(db, user_id, start, end)
    monthly_expenses = _sum_expense(db, user_id, start, end)
    prev_income = _sum_income(db, user_id, prev_start, prev_end)
    prev_expenses = _sum_expense(db, user_id, prev_start, prev_end)

    # Total da fatura atual = soma das parcelas (não canceladas) das faturas
    # abertas/fechadas do mês corrente. A fatura não guarda um total próprio —
    # é sempre derivado das parcelas, para nunca dessincronizar (seção 11/12 do escopo).
    invoices_total = (
        db.query(func.coalesce(func.sum(CreditCardInstallment.amount), 0))
        .join(CreditCardInvoice, CreditCardInvoice.id == CreditCardInstallment.invoice_id)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(
            CreditCard.user_id == user_id,
            CreditCard.deleted_at.is_(None),
            CreditCardInvoice.status.in_([InvoiceStatus.open, InvoiceStatus.closed]),
            CreditCardInvoice.reference_month == today.month,
            CreditCardInvoice.reference_year == today.year,
            CreditCardInstallment.status != InstallmentStatus.cancelled,
        )
        .scalar()
    )

    payable_total = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None),
            Expense.status.in_([ExpenseStatus.pending, ExpenseStatus.late]),
        )
        .scalar()
    )

    receivable_total = (
        db.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(
            Income.user_id == user_id,
            Income.deleted_at.is_(None),
            Income.status.in_([IncomeStatus.expected, IncomeStatus.late]),
        )
        .scalar()
    )

    def pct_change(current: Decimal, previous: Decimal) -> float | None:
        if previous == 0:
            return None
        return float((current - previous) / previous * 100)

    return {
        "total_balance": total_balance,
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "projected_balance": total_balance + monthly_income - monthly_expenses,
        "current_invoices_total": Decimal(invoices_total),
        "accounts_payable_total": Decimal(payable_total),
        "accounts_receivable_total": Decimal(receivable_total),
        "income_change_pct": pct_change(monthly_income, prev_income),
        "expense_change_pct": pct_change(monthly_expenses, prev_expenses),
    }


def get_cash_flow(db: Session, user_id: str, months: int = 6) -> list[dict]:
    today = date.today()
    points = []
    for i in range(months - 1, -1, -1):
        ref = today - relativedelta(months=i)
        start, end = _month_bounds(ref)
        income = _sum_income(db, user_id, start, end)
        expense = _sum_expense(db, user_id, start, end)
        points.append({
            "label": start.strftime("%b/%y"),
            "income": income,
            "expense": expense,
            "balance": income - expense,
        })
    return points


def get_category_breakdown(db: Session, user_id: str) -> list[dict]:
    today = date.today()
    start, end = _month_bounds(today)

    rows = (
        db.query(
            Category.id, Category.name, Category.color,
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
        )
        .join(Expense, Expense.category_id == Category.id)
        .filter(
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None),
            Expense.status != ExpenseStatus.cancelled,
            Expense.expense_date >= start,
            Expense.expense_date <= end,
        )
        .group_by(Category.id, Category.name, Category.color)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )

    grand_total = sum((Decimal(r.total) for r in rows), Decimal("0"))
    items = []
    for r in rows:
        pct = float(Decimal(r.total) / grand_total * 100) if grand_total > 0 else 0.0
        items.append({
            "category_id": r.id,
            "category_name": r.name,
            "color": r.color,
            "total": Decimal(r.total),
            "percentage": round(pct, 1),
        })
    return items
