from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.transaction import IncomeStatus
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse
from app.services import income_service

router = APIRouter(prefix="/incomes", tags=["Receitas"])


@router.get("", response_model=list[IncomeResponse])
def list_incomes(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    category_id: str | None = Query(default=None),
    account_id: str | None = Query(default=None),
    status_filter: IncomeStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return income_service.list_incomes(
        db, current_user.id, start_date, end_date, category_id, account_id, status_filter
    )


@router.post("", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income(
    payload: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return income_service.create_income(db, current_user.id, payload)


@router.get("/{income_id}", response_model=IncomeResponse)
def get_income(
    income_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return income_service.get_income(db, current_user.id, income_id)


@router.put("/{income_id}", response_model=IncomeResponse)
def update_income(
    income_id: str,
    payload: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return income_service.update_income(db, current_user.id, income_id, payload)


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    income_service.delete_income(db, current_user.id, income_id)
