from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.invoice import InvoicePayRequest, InvoiceResponse
from app.services import invoice_payment_service

router = APIRouter(prefix="/invoices", tags=["Faturas"])


@router.get("", response_model=list[InvoiceResponse])
def list_invoices(
    credit_card_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoices = invoice_payment_service.list_invoices(db, current_user.id, credit_card_id)
    return [invoice_payment_service.invoice_with_total(db, inv) for inv in invoices]


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    invoice = invoice_payment_service.get_invoice(db, current_user.id, invoice_id)
    return invoice_payment_service.invoice_with_total(db, invoice)


@router.post("/{invoice_id}/pay", response_model=InvoiceResponse)
def pay_invoice(
    invoice_id: str,
    payload: InvoicePayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = invoice_payment_service.pay_invoice(db, current_user.id, invoice_id, payload.account_id)
    return invoice_payment_service.invoice_with_total(db, invoice)
