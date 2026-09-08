from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.credit_card import PurchaseStatus


class CreditCardPurchaseCreate(BaseModel):
    credit_card_id: str
    category_id: Optional[str] = None
    description: str = Field(min_length=1, max_length=255)
    total_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    purchase_date: date
    installments_count: int = Field(default=1, ge=1, le=48)


class InstallmentResponse(BaseModel):
    id: str
    installment_number: int
    total_installments: int
    amount: Decimal
    status: str
    invoice_id: str

    class Config:
        from_attributes = True


class CreditCardPurchaseResponse(BaseModel):
    id: str
    credit_card_id: str
    category_id: Optional[str]
    description: str
    total_amount: Decimal
    purchase_date: date
    installments_count: int
    status: PurchaseStatus
    installments: list[InstallmentResponse] = []

    class Config:
        from_attributes = True
