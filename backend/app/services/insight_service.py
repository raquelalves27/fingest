"""Insights (seção 33): todo texto gerado aqui vem de um número calculado a
partir do banco — nunca um texto inventado. Se não há dados suficientes para
uma comparação (ex: mês anterior sem despesas), o insight é simplesmente
omitido em vez de forçar uma afirmação vazia."""
from calendar import monthrange
from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.credit_card import CreditCard, CreditCardInstallment, CreditCardInvoice, InstallmentStatus, InvoiceStatus
from app.models.transaction import Expense, ExpenseStatus
from app.lib.currency import format_brl
from app.services import dashboard_service


def _month_bounds(ref: date) -> tuple[date, date]:
    start = ref.replace(day=1)
    end = date(start.year, start.month, monthrange(start.year, start.month)[1])
    return start, end


def _category_spent(db: Session, user_id: str, category_id: str, start: date, end: date) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == user_id, Expense.category_id == category_id, Expense.deleted_at.is_(None),
            Expense.status == ExpenseStatus.paid, Expense.expense_date >= start, Expense.expense_date <= end,
        )
        .scalar()
    )
    return Decimal(total)


def get_insights(db: Session, user_id: str) -> list[dict]:
    insights: list[dict] = []
    today = date.today()
    start, end = _month_bounds(today)
    prev_start, prev_end = _month_bounds(start - relativedelta(days=1))

    # 1) variação de gasto por categoria vs mês anterior (maior variação percentual)
    categories = db.query(Category).filter(Category.user_id == user_id, Category.deleted_at.is_(None)).all()
    best_variation = None
    for cat in categories:
        current = _category_spent(db, user_id, cat.id, start, end)
        previous = _category_spent(db, user_id, cat.id, prev_start, prev_end)
        if previous > 0 and current > 0:
            pct = float((current - previous) / previous * 100)
            if abs(pct) >= 10 and (best_variation is None or abs(pct) > abs(best_variation[1])):
                best_variation = (cat.name, pct)
    if best_variation:
        name, pct = best_variation
        direction = "aumentaram" if pct > 0 else "diminuíram"
        insights.append({"text": f"Seus gastos com {name} {direction} {abs(pct):.0f}% em relação ao mês anterior."})

    # 2) percentual das despesas do mês que vieram do cartão
    total_expenses_month = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == user_id, Expense.deleted_at.is_(None), Expense.status == ExpenseStatus.paid,
            Expense.expense_date >= start, Expense.expense_date <= end,
        )
        .scalar()
    )
    total_expenses_month = Decimal(total_expenses_month)

    card_installments_month = (
        db.query(func.coalesce(func.sum(CreditCardInstallment.amount), 0))
        .join(CreditCardInvoice, CreditCardInvoice.id == CreditCardInstallment.invoice_id)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(
            CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None),
            CreditCardInstallment.status != InstallmentStatus.cancelled,
            CreditCardInvoice.reference_month == today.month, CreditCardInvoice.reference_year == today.year,
        )
        .scalar()
    )
    card_installments_month = Decimal(card_installments_month)

    combined_total = total_expenses_month + card_installments_month
    if combined_total > 0 and card_installments_month > 0:
        pct = float(card_installments_month / combined_total * 100)
        insights.append({"text": f"Seu cartão representa {pct:.0f}% das suas despesas deste mês."})

    # 3) total comprometido em parcelas futuras (todas as faturas não pagas, exceto a do mês atual)
    future_committed = (
        db.query(func.coalesce(func.sum(CreditCardInstallment.amount), 0))
        .join(CreditCardInvoice, CreditCardInvoice.id == CreditCardInstallment.invoice_id)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(
            CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None),
            CreditCardInstallment.status == InstallmentStatus.pending,
            CreditCardInvoice.status != InvoiceStatus.paid,
        )
        .scalar()
    )
    future_committed = Decimal(future_committed)
    if future_committed > 0:
        insights.append({"text": f"Você possui {format_brl(future_committed)} em parcelas futuras no cartão."})

    return insights
