from decimal import Decimal
from typing import List

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_balance: Decimal
    monthly_income: Decimal
    monthly_expenses: Decimal
    projected_balance: Decimal
    current_invoices_total: Decimal
    accounts_payable_total: Decimal
    accounts_receivable_total: Decimal
    income_change_pct: float | None
    expense_change_pct: float | None


class CashFlowPoint(BaseModel):
    label: str
    income: Decimal
    expense: Decimal
    balance: Decimal


class CashFlowResponse(BaseModel):
    points: List[CashFlowPoint]


class CategoryBreakdownItem(BaseModel):
    category_id: str | None
    category_name: str
    color: str | None
    total: Decimal
    percentage: float


class CategoryBreakdownResponse(BaseModel):
    items: List[CategoryBreakdownItem]
