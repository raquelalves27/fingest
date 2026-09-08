from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.credit_card import (
    CreditCard, CreditCardInstallment, CreditCardInvoice, InstallmentStatus, InvoiceStatus
)
from app.schemas.credit_card import CreditCardCreate, CreditCardUpdate


def list_credit_cards(db: Session, user_id: str) -> list[CreditCard]:
    return (
        db.query(CreditCard)
        .filter(CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None))
        .order_by(CreditCard.created_at.asc())
        .all()
    )


def get_credit_card(db: Session, user_id: str, card_id: str) -> CreditCard:
    card = (
        db.query(CreditCard)
        .filter(CreditCard.id == card_id, CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None))
        .first()
    )
    if not card:
        raise NotFoundError("Cartão não encontrado")
    return card


def create_credit_card(db: Session, user_id: str, payload: CreditCardCreate) -> CreditCard:
    card = CreditCard(
        user_id=user_id,
        name=payload.name,
        bank=payload.bank,
        brand=payload.brand,
        credit_limit=payload.credit_limit,
        closing_day=payload.closing_day,
        due_day=payload.due_day,
        color=payload.color,
        last_four_digits=payload.last_four_digits,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def update_credit_card(db: Session, user_id: str, card_id: str, payload: CreditCardUpdate) -> CreditCard:
    card = get_credit_card(db, user_id, card_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(card, field, value)
    db.commit()
    db.refresh(card)
    return card


def delete_credit_card(db: Session, user_id: str, card_id: str) -> None:
    card = get_credit_card(db, user_id, card_id)
    card.deleted_at = date.today()
    card.is_active = False
    db.commit()


def get_available_limit(db: Session, card_id: str, credit_limit: Decimal) -> Decimal:
    """Limite disponível = limite total - soma de parcelas pendentes de
    faturas não pagas (seção 10/15 do escopo)."""
    committed = (
        db.query(func.coalesce(func.sum(CreditCardInstallment.amount), 0))
        .join(CreditCardInvoice, CreditCardInvoice.id == CreditCardInstallment.invoice_id)
        .filter(
            CreditCardInstallment.invoice_id == CreditCardInvoice.id,
            CreditCardInvoice.credit_card_id == card_id,
            CreditCardInvoice.status != InvoiceStatus.paid,
            CreditCardInstallment.status == InstallmentStatus.pending,
        )
        .scalar()
    )
    return credit_limit - Decimal(committed)


def card_with_computed_fields(db: Session, card: CreditCard) -> dict:
    available = get_available_limit(db, card.id, card.credit_limit)
    return {
        "id": card.id,
        "name": card.name,
        "bank": card.bank,
        "brand": card.brand,
        "credit_limit": card.credit_limit,
        "available_limit": available,
        "closing_day": card.closing_day,
        "due_day": card.due_day,
        "color": card.color,
        "last_four_digits": card.last_four_digits,
        "is_active": card.is_active,
    }
