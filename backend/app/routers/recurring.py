from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.recurring import (
    RecurringTransactionCreate, RecurringTransactionUpdate, RecurringTransactionResponse
)
from app.services import recurring_service

router = APIRouter(prefix="/recurring-transactions", tags=["Recorrências"])


@router.get("", response_model=list[RecurringTransactionResponse])
def list_recurring(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recurring_service.generate_due_occurrences(db, current_user.id)
    return recurring_service.list_recurring(db, current_user.id)


@router.post("", response_model=RecurringTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_recurring(
    payload: RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return recurring_service.create_recurring(db, current_user.id, payload)


@router.put("/{recurring_id}", response_model=RecurringTransactionResponse)
def update_recurring(
    recurring_id: str,
    payload: RecurringTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return recurring_service.update_recurring(db, current_user.id, recurring_id, payload)


@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(
    recurring_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    recurring_service.delete_recurring(db, current_user.id, recurring_id)
