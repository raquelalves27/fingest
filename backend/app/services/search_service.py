"""Busca global (seção 23): busca textual simples (LIKE) por descrição/nome
entre receitas, despesas, compras no cartão, contas e cartões. Limitado a
poucos resultados por tipo para manter a resposta rápida."""
from sqlalchemy.orm import Session

from app.lib.currency import format_brl
from app.models.account import Account
from app.models.credit_card import CreditCard, CreditCardPurchase
from app.models.transaction import Expense, Income

MAX_PER_TYPE = 5


def search(db: Session, user_id: str, query: str) -> list[dict]:
    if not query or len(query.strip()) < 2:
        return []

    like_pattern = f"%{query.strip()}%"
    results: list[dict] = []

    incomes = (
        db.query(Income)
        .filter(Income.user_id == user_id, Income.deleted_at.is_(None), Income.description.ilike(like_pattern))
        .limit(MAX_PER_TYPE)
        .all()
    )
    for i in incomes:
        results.append({
            "type": "income", "id": i.id, "title": i.description,
            "subtitle": f"Receita · {format_brl(i.amount)} · {i.income_date}",
        })

    expenses = (
        db.query(Expense)
        .filter(Expense.user_id == user_id, Expense.deleted_at.is_(None), Expense.description.ilike(like_pattern))
        .limit(MAX_PER_TYPE)
        .all()
    )
    for e in expenses:
        results.append({
            "type": "expense", "id": e.id, "title": e.description,
            "subtitle": f"Despesa · {format_brl(e.amount)} · {e.expense_date}",
        })

    purchases = (
        db.query(CreditCardPurchase)
        .join(CreditCard, CreditCard.id == CreditCardPurchase.credit_card_id)
        .filter(
            CreditCard.user_id == user_id,
            CreditCardPurchase.deleted_at.is_(None),
            CreditCardPurchase.description.ilike(like_pattern),
        )
        .limit(MAX_PER_TYPE)
        .all()
    )
    for p in purchases:
        parcelas = f" · {p.installments_count}x" if p.installments_count > 1 else ""
        results.append({
            "type": "purchase", "id": p.id, "title": p.description,
            "subtitle": f"Compra no cartão{parcelas} · {format_brl(p.total_amount)}",
        })

    accounts = (
        db.query(Account)
        .filter(Account.user_id == user_id, Account.deleted_at.is_(None), Account.name.ilike(like_pattern))
        .limit(MAX_PER_TYPE)
        .all()
    )
    for a in accounts:
        results.append({
            "type": "account", "id": a.id, "title": a.name, "subtitle": "Conta bancária",
        })

    cards = (
        db.query(CreditCard)
        .filter(CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None), CreditCard.name.ilike(like_pattern))
        .limit(MAX_PER_TYPE)
        .all()
    )
    for c in cards:
        results.append({
            "type": "credit_card", "id": c.id, "title": c.name, "subtitle": "Cartão de crédito",
        })

    return results
