from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.transaction import IncomeStatus


class IncomeCreate(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    income_date: date
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    status: IncomeStatus = IncomeStatus.received
    notes: Optional[str] = None


class IncomeUpdate(BaseModel):
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    income_date: Optional[date] = None
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    status: Optional[IncomeStatus] = None
    notes: Optional[str] = None


class IncomeResponse(BaseModel):
    id: str
    description: str
    amount: Decimal
    income_date: date
    account_id: Optional[str]
    category_id: Optional[str]
    status: IncomeStatus
    notes: Optional[str]

    class Config:
        from_attributes = True
