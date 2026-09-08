from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class TransferCreate(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    transfer_date: date
    description: Optional[str] = None

    @model_validator(mode="after")
    def accounts_must_differ(self):
        if self.from_account_id == self.to_account_id:
            raise ValueError("A conta de origem e destino devem ser diferentes")
        return self


class TransferResponse(BaseModel):
    id: str
    from_account_id: str
    to_account_id: str
    amount: Decimal
    transfer_date: date
    description: Optional[str]

    class Config:
        from_attributes = True
