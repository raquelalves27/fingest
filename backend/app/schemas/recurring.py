from datetime import date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.misc import RecurrenceFrequency


class RecurringTransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    frequency: RecurrenceFrequency = RecurrenceFrequency.monthly
    start_date: date
    end_date: Optional[date] = None


class RecurringTransactionUpdate(BaseModel):
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class RecurringTransactionResponse(BaseModel):
    id: str
    type: str
    description: str
    amount: Decimal
    category_id: Optional[str]
    account_id: Optional[str]
    frequency: RecurrenceFrequency
    start_date: date
    end_date: Optional[date]
    next_occurrence_date: Optional[date]
    is_active: bool

    class Config:
        from_attributes = True
