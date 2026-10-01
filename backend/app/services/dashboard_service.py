from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.credit_card import (
    CreditCardInvoice, CreditCard, CreditCardInstallment, InstallmentStatus,
    CreditCardPurchase,
)
from app.models.transaction import Income, Expense, IncomeStatus, ExpenseStatus
from app.services import balance_service
from app.services.invoice_service import current_invoice_ids_for_user


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

    # Total da fatura atual = soma das parcelas (não canceladas) da fatura
    # atual de cada cartão (ver `invoice_service.current_invoice_ids_for_user`). A fatura não guarda
    # um total próprio — é sempre derivado das parcelas, para nunca
    # dessincronizar (seção 11/12 do escopo).
    current_ids = current_invoice_ids_for_user(db, user_id, today)
    invoices_total = (
        db.query(func.coalesce(func.sum(CreditCardInstallment.amount), 0))
        .filter(
            CreditCardInstallment.invoice_id.in_(current_ids),
            CreditCardInstallment.status != InstallmentStatus.cancelled,
        )
        .scalar()
        if current_ids
        else 0
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
    """Gastos por categoria no mês atual — combina despesas avulsas e o que já
    está na fatura atual do cartão de cada cartão (mesma seleção usada em
    `current_invoices_total`), senão categorias só existentes no cartão nunca
    apareceriam aqui."""
    today = date.today()
    start, end = _month_bounds(today)

    expense_rows = (
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
        .all()
    )

    current_ids = current_invoice_ids_for_user(db, user_id, today)
    card_rows = (
        db.query(
            Category.id, Category.name, Category.color,
            func.coalesce(func.sum(CreditCardInstallment.amount), 0).label("total"),
        )
        .select_from(CreditCardInstallment)
        .join(CreditCardPurchase, CreditCardPurchase.id == CreditCardInstallment.purchase_id)
        .join(Category, Category.id == CreditCardPurchase.category_id)
        .filter(
            CreditCardInstallment.invoice_id.in_(current_ids),
            CreditCardInstallment.status != InstallmentStatus.cancelled,
        )
        .group_by(Category.id, Category.name, Category.color)
        .all()
        if current_ids
        else []
    )

    totals: dict[str, dict] = {}
    for r in (*expense_rows, *card_rows):
        entry = totals.setdefault(
            r.id, {"category_id": r.id, "category_name": r.name, "color": r.color, "total": Decimal("0")}
        )
        entry["total"] += Decimal(r.total)

    grand_total = sum((e["total"] for e in totals.values()), Decimal("0"))
    items = []
    for entry in totals.values():
        pct = float(entry["total"] / grand_total * 100) if grand_total > 0 else 0.0
        items.append({**entry, "percentage": round(pct, 1)})
    items.sort(key=lambda i: i["total"], reverse=True)
    return items
