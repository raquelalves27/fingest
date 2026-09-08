from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.account import AccountType


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    bank: Optional[str] = Field(default=None, max_length=120)
    type: AccountType = AccountType.checking
    initial_balance: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    color: Optional[str] = None
    icon: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    bank: Optional[str] = None
    type: Optional[AccountType] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class AccountResponse(BaseModel):
    id: str
    name: str
    bank: Optional[str]
    type: AccountType
    initial_balance: Decimal
    current_balance: Decimal
    color: Optional[str]
    icon: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True
