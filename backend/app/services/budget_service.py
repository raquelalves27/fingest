"""Orçamento (seção 18): um Budget por mês/ano com uma BudgetCategory por
categoria orçada. 'Gasto' é sempre calculado a partir das despesas reais
(paid) do mês — nunca armazenado, para nunca dessincronizar."""
from calendar import monthrange
from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.misc import Budget, BudgetCategory
from app.models.transaction import Expense, ExpenseStatus
from app.schemas.budget import BudgetSetRequest


def _spent_for_category(db: Session, user_id: str, category_id: str, month: int, year: int) -> Decimal:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    total = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == user_id,
            Expense.category_id == category_id,
            Expense.deleted_at.is_(None),
            Expense.status == ExpenseStatus.paid,
            Expense.expense_date >= start,
            Expense.expense_date <= end,
        )
        .scalar()
    )
    return Decimal(total)


def get_budget(db: Session, user_id: str, month: int, year: int) -> dict:
    budget = (
        db.query(Budget)
        .filter(Budget.user_id == user_id, Budget.reference_month == month, Budget.reference_year == year)
        .first()
    )

    categories_result = []
    if budget:
        for bc in budget.categories:
            category = db.query(Category).filter(Category.id == bc.category_id).first()
            spent = _spent_for_category(db, user_id, bc.category_id, month, year)
            planned = Decimal(bc.planned_amount)
            categories_result.append({
                "category_id": bc.category_id,
                "category_name": category.name if category else "Categoria removida",
                "color": category.color if category else None,
                "planned_amount": planned,
                "spent_amount": spent,
                "available_amount": planned - spent,
                "percentage_used": float(spent / planned * 100) if planned > 0 else 0.0,
            })

    return {"reference_month": month, "reference_year": year, "categories": categories_result}


def set_budget(db: Session, user_id: str, payload: BudgetSetRequest) -> dict:
    budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.reference_month == payload.reference_month,
            Budget.reference_year == payload.reference_year,
        )
        .first()
    )
    if not budget:
        budget = Budget(
            user_id=user_id,
            reference_month=payload.reference_month,
            reference_year=payload.reference_year,
        )
        db.add(budget)
        db.flush()
    else:
        # substitui completamente as categorias orçadas (operação idempotente)
        db.query(BudgetCategory).filter(BudgetCategory.budget_id == budget.id).delete()

    for item in payload.categories:
        db.add(BudgetCategory(
            budget_id=budget.id, category_id=item.category_id, planned_amount=item.planned_amount
        ))

    db.commit()
    return get_budget(db, user_id, payload.reference_month, payload.reference_year)
