from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class CreditCardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    bank: Optional[str] = None
    brand: Optional[str] = None
    credit_limit: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    closing_day: int = Field(ge=1, le=31)
    due_day: int = Field(ge=1, le=31)
    color: Optional[str] = None
    last_four_digits: Optional[str] = Field(default=None, max_length=4, min_length=4)

    @field_validator("last_four_digits")
    @classmethod
    def digits_only(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.isdigit():
            raise ValueError("Deve conter apenas dígitos")
        return v


class CreditCardUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    bank: Optional[str] = None
    brand: Optional[str] = None
    credit_limit: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    closing_day: Optional[int] = Field(default=None, ge=1, le=31)
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    color: Optional[str] = None
    is_active: Optional[bool] = None


class CreditCardResponse(BaseModel):
    id: str
    name: str
    bank: Optional[str]
    brand: Optional[str]
    credit_limit: Decimal
    available_limit: Decimal
    closing_day: int
    due_day: int
    color: Optional[str]
    last_four_digits: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True
