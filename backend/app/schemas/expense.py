from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.transaction import ExpenseStatus


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    expense_date: date
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    payment_method: Optional[str] = None
    status: ExpenseStatus = ExpenseStatus.paid
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    expense_date: Optional[date] = None
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[ExpenseStatus] = None
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: str
    description: str
    amount: Decimal
    expense_date: date
    account_id: Optional[str]
    category_id: Optional[str]
    payment_method: Optional[str]
    status: ExpenseStatus
    notes: Optional[str]

    class Config:
        from_attributes = True
