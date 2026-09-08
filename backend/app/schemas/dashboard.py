from datetime import date
from decimal import Decimal
from typing import List, Literal, Optional

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


# --- Painel de cartões de crédito (foco em tomada de decisão) ---

class CreditCardInvoiceBrief(BaseModel):
    id: str
    label: str
    reference_month: int
    reference_year: int
    total: Decimal
    status: str
    closing_date: date
    due_date: date
    days_until_due: int


class CreditCardPanel(BaseModel):
    id: str
    name: str
    color: Optional[str]
    brand: Optional[str]
    last_four_digits: Optional[str]
    closing_day: int
    due_day: int
    credit_limit: Decimal
    used_limit: Decimal
    available_limit: Decimal
    utilization_pct: float
    current_invoice: Optional[CreditCardInvoiceBrief]
    next_invoice_total: Decimal
    recurring_monthly_total: Decimal
    health: Literal["ok", "attention", "critical"]


class CreditCardCategoryChild(BaseModel):
    category_id: Optional[str]
    category_name: str
    total: Decimal
    percentage: float


class CreditCardCategoryNode(BaseModel):
    category_id: Optional[str]
    category_name: str
    color: Optional[str]
    total: Decimal
    percentage: float
    is_uncategorized: bool
    children: List[CreditCardCategoryChild] = []


class CreditCardTrendPoint(BaseModel):
    label: str
    total: Decimal
    paid: Decimal
    pending: Decimal


class CreditCardTotals(BaseModel):
    credit_limit: Decimal
    used_limit: Decimal
    available_limit: Decimal
    utilization_pct: float
    current_invoices_total: Decimal
    future_committed_total: Decimal
    recurring_monthly_total: Decimal
    spend_change_pct: float | None


class CreditCardDashboardInsight(BaseModel):
    level: Literal["info", "attention", "critical"]
    text: str


class CreditCardDashboardResponse(BaseModel):
    scope: Literal["current", "open"]
    totals: CreditCardTotals
    cards: List[CreditCardPanel]
    category_breakdown: List[CreditCardCategoryNode]
    trend: List[CreditCardTrendPoint]
    insights: List[CreditCardDashboardInsight]
