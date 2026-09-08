from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.credit_card import CreditCardCreate, CreditCardUpdate, CreditCardResponse
from app.services import credit_card_service

router = APIRouter(prefix="/credit-cards", tags=["Cartões"])


@router.get("", response_model=list[CreditCardResponse])
def list_credit_cards(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cards = credit_card_service.list_credit_cards(db, current_user.id)
    return [credit_card_service.card_with_computed_fields(db, c) for c in cards]


@router.post("", response_model=CreditCardResponse, status_code=status.HTTP_201_CREATED)
def create_credit_card(
    payload: CreditCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = credit_card_service.create_credit_card(db, current_user.id, payload)
    return credit_card_service.card_with_computed_fields(db, card)


@router.get("/{card_id}", response_model=CreditCardResponse)
def get_credit_card(
    card_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    card = credit_card_service.get_credit_card(db, current_user.id, card_id)
    return credit_card_service.card_with_computed_fields(db, card)


@router.put("/{card_id}", response_model=CreditCardResponse)
def update_credit_card(
    card_id: str,
    payload: CreditCardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = credit_card_service.update_credit_card(db, current_user.id, card_id, payload)
    return credit_card_service.card_with_computed_fields(db, card)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credit_card(
    card_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    credit_card_service.delete_credit_card(db, current_user.id, card_id)
