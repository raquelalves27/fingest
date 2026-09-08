from decimal import Decimal

from pydantic import BaseModel


class MonthlyEvolutionPoint(BaseModel):
    label: str
    income: Decimal
    expense: Decimal
    net: Decimal


class CardSpendingItem(BaseModel):
    credit_card_id: str
    credit_card_name: str
    total: Decimal


class AccountSpendingItem(BaseModel):
    account_id: str
    account_name: str
    total: Decimal


class ReportResponse(BaseModel):
    monthly_evolution: list[MonthlyEvolutionPoint]
    spending_by_card: list[CardSpendingItem]
    spending_by_account: list[AccountSpendingItem]
