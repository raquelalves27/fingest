from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class CalendarDayEntry(BaseModel):
    type: str  # "income" | "expense" | "invoice" | "goal"
    id: str
    description: str
    amount: Decimal


class CalendarDay(BaseModel):
    day: date
    has_income: bool
    has_expense: bool
    has_invoice: bool
    entries: list[CalendarDayEntry]


class CalendarResponse(BaseModel):
    days: list[CalendarDay]
