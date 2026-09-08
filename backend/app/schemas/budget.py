from decimal import Decimal

from pydantic import BaseModel, Field


class BudgetCategoryInput(BaseModel):
    category_id: str
    planned_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)


class BudgetSetRequest(BaseModel):
    """Define (cria ou substitui) o orçamento de um mês/ano com uma lista de
    categorias e valores planejados — operação idempotente e completa."""
    reference_month: int = Field(ge=1, le=12)
    reference_year: int = Field(ge=2000, le=2100)
    categories: list[BudgetCategoryInput]


class BudgetCategoryResult(BaseModel):
    category_id: str
    category_name: str
    color: str | None
    planned_amount: Decimal
    spent_amount: Decimal
    available_amount: Decimal
    percentage_used: float


class BudgetResponse(BaseModel):
    reference_month: int
    reference_year: int
    categories: list[BudgetCategoryResult]
