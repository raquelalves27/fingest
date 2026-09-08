"""Calendário financeiro (seção 22): agrega receitas, despesas e vencimentos
de fatura por dia, dentro de um mês/ano. Puramente uma visão — não armazena
nada de novo."""
from calendar import monthrange
from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from app.models.credit_card import CreditCard, CreditCardInvoice, InvoiceStatus
from app.models.transaction import Expense, ExpenseStatus, Income, IncomeStatus
from app.services import invoice_service


def get_calendar(db: Session, user_id: str, month: int, year: int) -> dict:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])

    days_map: dict[date, list[dict]] = defaultdict(list)

    incomes = (
        db.query(Income)
        .filter(
            Income.user_id == user_id, Income.deleted_at.is_(None),
            Income.status != IncomeStatus.cancelled,
            Income.income_date >= start, Income.income_date <= end,
        )
        .all()
    )
    for i in incomes:
        days_map[i.income_date].append({
            "type": "income", "id": i.id, "description": i.description, "amount": i.amount
        })

    expenses = (
        db.query(Expense)
        .filter(
            Expense.user_id == user_id, Expense.deleted_at.is_(None),
            Expense.status != ExpenseStatus.cancelled,
            Expense.expense_date >= start, Expense.expense_date <= end,
        )
        .all()
    )
    for e in expenses:
        days_map[e.expense_date].append({
            "type": "expense", "id": e.id, "description": e.description, "amount": e.amount
        })

    invoices = (
        db.query(CreditCardInvoice)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(
            CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None),
            CreditCardInvoice.due_date >= start, CreditCardInvoice.due_date <= end,
            CreditCardInvoice.status != InvoiceStatus.paid,
        )
        .all()
    )
    for inv in invoices:
        total = invoice_service.get_invoice_total(db, inv.id)
        days_map[inv.due_date].append({
            "type": "invoice", "id": inv.id,
            "description": f"Vencimento fatura {inv.credit_card.name}", "amount": total,
        })

    days = []
    for d in sorted(days_map.keys()):
        entries = days_map[d]
        days.append({
            "day": d,
            "has_income": any(e["type"] == "income" for e in entries),
            "has_expense": any(e["type"] == "expense" for e in entries),
            "has_invoice": any(e["type"] == "invoice" for e in entries),
            "entries": entries,
        })

    return {"days": days}
