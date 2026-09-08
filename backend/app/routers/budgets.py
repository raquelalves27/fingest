from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.budget import BudgetSetRequest, BudgetResponse
from app.services import budget_service

router = APIRouter(prefix="/budgets", tags=["Orçamento"])


@router.get("", response_model=BudgetResponse)
def get_budget(
    month: int = Query(ge=1, le=12),
    year: int = Query(ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return budget_service.get_budget(db, current_user.id, month, year)


@router.put("", response_model=BudgetResponse)
def set_budget(
    payload: BudgetSetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return budget_service.set_budget(db, current_user.id, payload)
