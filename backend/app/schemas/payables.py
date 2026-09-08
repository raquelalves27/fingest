from decimal import Decimal

from pydantic import BaseModel

from app.schemas.expense import ExpenseResponse
from app.schemas.income import IncomeResponse


class PayableSummary(BaseModel):
    overdue_total: Decimal
    due_today_total: Decimal
    due_next_7_days_total: Decimal
    due_next_30_days_total: Decimal
    overdue: list[ExpenseResponse]
    due_today: list[ExpenseResponse]
    upcoming: list[ExpenseResponse]


class ReceivableSummary(BaseModel):
    overdue_total: Decimal
    due_today_total: Decimal
    due_next_7_days_total: Decimal
    due_next_30_days_total: Decimal
    overdue: list[IncomeResponse]
    due_today: list[IncomeResponse]
    upcoming: list[IncomeResponse]
