"""Relatórios (seção 24): agregações sobre dados já existentes. Reaproveita
a lógica de fluxo de caixa do dashboard_service para evolução mensal."""
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.credit_card import CreditCard, CreditCardInstallment, CreditCardInvoice, InstallmentStatus
from app.models.transaction import Expense, ExpenseStatus
from app.services import dashboard_service


def get_full_report(db: Session, user_id: str, months: int = 12) -> dict:
    monthly_evolution = [
        {"label": p["label"], "income": p["income"], "expense": p["expense"], "net": p["income"] - p["expense"]}
        for p in dashboard_service.get_cash_flow(db, user_id, months)
    ]

    card_rows = (
        db.query(
            CreditCard.id, CreditCard.name,
            func.coalesce(func.sum(CreditCardInstallment.amount), 0).label("total"),
        )
        .join(CreditCardInvoice, CreditCardInvoice.credit_card_id == CreditCard.id)
        .join(CreditCardInstallment, CreditCardInstallment.invoice_id == CreditCardInvoice.id)
        .filter(
            CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None),
            CreditCardInstallment.status != InstallmentStatus.cancelled,
        )
        .group_by(CreditCard.id, CreditCard.name)
        .order_by(func.sum(CreditCardInstallment.amount).desc())
        .all()
    )
    spending_by_card = [
        {"credit_card_id": r.id, "credit_card_name": r.name, "total": Decimal(r.total)} for r in card_rows
    ]

    account_rows = (
        db.query(
            Account.id, Account.name,
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
        )
        .join(Expense, Expense.account_id == Account.id)
        .filter(
            Account.user_id == user_id, Account.deleted_at.is_(None),
            Expense.deleted_at.is_(None), Expense.status == ExpenseStatus.paid,
        )
        .group_by(Account.id, Account.name)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )
    spending_by_account = [
        {"account_id": r.id, "account_name": r.name, "total": Decimal(r.total)} for r in account_rows
    ]

    return {
        "monthly_evolution": monthly_evolution,
        "spending_by_card": spending_by_card,
        "spending_by_account": spending_by_account,
    }


def export_expenses_csv(db: Session, user_id: str) -> str:
    """Gera um CSV simples de todas as despesas não excluídas (seção 24:
    exportar CSV/Excel/PDF — CSV é a base universal; Excel pode ser aberto
    a partir dele, e é o formato mais barato de gerar sem dependências)."""
    import csv
    import io

    expenses = (
        db.query(Expense)
        .filter(Expense.user_id == user_id, Expense.deleted_at.is_(None))
        .order_by(Expense.expense_date.desc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Data", "Descrição", "Valor", "Status", "Forma de pagamento"])
    for e in expenses:
        writer.writerow([
            e.expense_date.isoformat(), e.description, str(e.amount), e.status.value, e.payment_method or "",
        ])
    return buffer.getvalue()
