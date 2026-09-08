from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.credit_card import InvoiceStatus


class InvoicePayRequest(BaseModel):
    account_id: str


class InvoiceResponse(BaseModel):
    id: str
    credit_card_id: str
    reference_month: int
    reference_year: int
    closing_date: date
    due_date: date
    status: InvoiceStatus
    total_amount: Decimal
    paid_at: Optional[date]
    paid_from_account_id: Optional[str]

    class Config:
        from_attributes = True
