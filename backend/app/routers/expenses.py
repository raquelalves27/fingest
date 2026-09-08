from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.transaction import ExpenseStatus
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.services import expense_service

router = APIRouter(prefix="/expenses", tags=["Despesas"])


@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    category_id: str | None = Query(default=None),
    account_id: str | None = Query(default=None),
    status_filter: ExpenseStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return expense_service.list_expenses(
        db, current_user.id, start_date, end_date, category_id, account_id, status_filter
    )


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return expense_service.create_expense(db, current_user.id, payload)


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return expense_service.get_expense(db, current_user.id, expense_id)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return expense_service.update_expense(db, current_user.id, expense_id, payload)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    expense_service.delete_expense(db, current_user.id, expense_id)
