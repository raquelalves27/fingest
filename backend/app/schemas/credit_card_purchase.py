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
    # Recorrência: quando True, installments_count é ignorado (a compra passa a
    # ser mensal e total_amount vira o valor cobrado a cada mês). recurring_day
    # é opcional — se omitido, usa o dia de purchase_date.
    is_recurring: bool = False
    recurring_day: Optional[int] = Field(default=None, ge=1, le=31)


class CreditCardPurchaseUpdate(BaseModel):
    """Edição de um lançamento existente. Todos os campos são opcionais; só o
    que vier é alterado. Valor/parcelas/data só podem mudar enquanto nenhuma
    parcela tiver sido paga (o passado é imutável)."""
    category_id: Optional[str] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)
    total_amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    purchase_date: Optional[date] = None
    installments_count: Optional[int] = Field(default=None, ge=1, le=48)
    recurring_active: Optional[bool] = None
    recurring_day: Optional[int] = Field(default=None, ge=1, le=31)


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
    is_recurring: bool
    recurring_active: bool
    recurring_day: Optional[int] = None
    recurring_next_date: Optional[date] = None

    class Config:
        from_attributes = True
