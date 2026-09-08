from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.account import AccountTransactionType
from app.models.credit_card import (
    CreditCard, CreditCardInstallment, CreditCardInvoice, InstallmentStatus, InvoiceStatus
)
from app.services import account_service, balance_service, invoice_service


def list_invoices(db: Session, user_id: str, credit_card_id: str | None = None) -> list[CreditCardInvoice]:
    query = (
        db.query(CreditCardInvoice)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None))
    )
    if credit_card_id:
        query = query.filter(CreditCardInvoice.credit_card_id == credit_card_id)
    return query.order_by(CreditCardInvoice.reference_year.desc(), CreditCardInvoice.reference_month.desc()).all()


def get_invoice(db: Session, user_id: str, invoice_id: str) -> CreditCardInvoice:
    invoice = (
        db.query(CreditCardInvoice)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(CreditCardInvoice.id == invoice_id, CreditCard.user_id == user_id)
        .first()
    )
    if not invoice:
        raise NotFoundError("Fatura não encontrada")
    return invoice


def invoice_with_total(db: Session, invoice: CreditCardInvoice) -> dict:
    return {
        "id": invoice.id,
        "credit_card_id": invoice.credit_card_id,
        "reference_month": invoice.reference_month,
        "reference_year": invoice.reference_year,
        "closing_date": invoice.closing_date,
        "due_date": invoice.due_date,
        "status": invoice.status,
        "total_amount": invoice_service.get_invoice_total(db, invoice.id),
        "paid_at": invoice.paid_at,
        "paid_from_account_id": invoice.paid_from_account_id,
    }


def pay_invoice(db: Session, user_id: str, invoice_id: str, account_id: str) -> CreditCardInvoice:
    """Pagamento de fatura (seção 15): nunca altera saldo diretamente — sempre
    gera uma movimentação real no ledger da conta escolhida, marca a fatura
    como paga e todas as suas parcelas pendentes como pagas. O limite
    disponível do cartão é recalculado automaticamente (é derivado, não
    armazenado) assim que isso acontece."""
    invoice = get_invoice(db, user_id, invoice_id)

    if invoice.status == InvoiceStatus.paid:
        raise ConflictError("Esta fatura já foi paga")

    # valida que a conta pertence ao usuário
    account_service.get_account(db, user_id, account_id)

    total = invoice_service.get_invoice_total(db, invoice.id)

    balance_service.record_transaction(
        db, account_id=account_id, amount=-total,
        type=AccountTransactionType.invoice_payment, transaction_date=date.today(),
        reference_type="invoice", reference_id=invoice.id,
        description=f"Pagamento de fatura {invoice.reference_month:02d}/{invoice.reference_year}",
    )

    invoice.status = InvoiceStatus.paid
    invoice.paid_at = date.today()
    invoice.paid_from_account_id = account_id

    db.query(CreditCardInstallment).filter(
        CreditCardInstallment.invoice_id == invoice.id,
        CreditCardInstallment.status == InstallmentStatus.pending,
    ).update({"status": InstallmentStatus.paid})

    db.commit()
    db.refresh(invoice)
    return invoice
