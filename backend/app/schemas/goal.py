from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.misc import GoalStatus


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    target_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    target_date: Optional[date] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    target_amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    target_date: Optional[date] = None
    status: Optional[GoalStatus] = None


class ContributionCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    contribution_date: date
    account_id: Optional[str] = None


class ContributionResponse(BaseModel):
    id: str
    amount: Decimal
    contribution_date: date
    account_id: Optional[str]

    class Config:
        from_attributes = True


class GoalResponse(BaseModel):
    id: str
    name: str
    target_amount: Decimal
    target_date: Optional[date]
    status: GoalStatus
    saved_amount: Decimal
    progress_percentage: float
    contributions: list[ContributionResponse] = []

    class Config:
        from_attributes = True
