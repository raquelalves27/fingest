from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.credit_card_purchase import CreditCardPurchaseCreate, CreditCardPurchaseResponse
from app.services import purchase_service

router = APIRouter(prefix="/credit-card-purchases", tags=["Compras no cartão"])


@router.get("", response_model=list[CreditCardPurchaseResponse])
def list_purchases(
    credit_card_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return purchase_service.list_purchases(db, current_user.id, credit_card_id)


@router.post("", response_model=CreditCardPurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    payload: CreditCardPurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return purchase_service.create_purchase(db, current_user.id, payload)


@router.get("/{purchase_id}", response_model=CreditCardPurchaseResponse)
def get_purchase(
    purchase_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return purchase_service.get_purchase(db, current_user.id, purchase_id)


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_purchase(
    purchase_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    purchase_service.cancel_purchase(db, current_user.id, purchase_id)
