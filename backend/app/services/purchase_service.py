"""Regra central (seções 12, 13, 14 do escopo):

Uma compra parcelada NUNCA é uma única despesa — é uma entidade `Compra` com
N `Parcelas` filhas, cada uma associada à fatura correta pela data da compra
mais N meses e a regra de fechamento do cartão. Uma compra à vista é apenas
uma compra com installments_count=1: mesmo modelo, sem caso especial.

Divisão de centavos: a última parcela absorve o resto da divisão, para que
a soma das parcelas seja sempre exatamente igual ao total da compra.
"""
from datetime import date
from decimal import ROUND_DOWN, Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.credit_card import (
    CreditCardInstallment, CreditCardPurchase, InstallmentStatus, PurchaseStatus
)
from app.schemas.credit_card_purchase import CreditCardPurchaseCreate
from app.services import credit_card_service, invoice_service


def list_purchases(db: Session, user_id: str, credit_card_id: str | None = None) -> list[CreditCardPurchase]:
    from app.models.credit_card import CreditCard

    query = (
        db.query(CreditCardPurchase)
        .join(CreditCard, CreditCard.id == CreditCardPurchase.credit_card_id)
        .filter(CreditCard.user_id == user_id, CreditCardPurchase.deleted_at.is_(None))
    )
    if credit_card_id:
        query = query.filter(CreditCardPurchase.credit_card_id == credit_card_id)
    return query.order_by(CreditCardPurchase.purchase_date.desc()).all()


def get_purchase(db: Session, user_id: str, purchase_id: str) -> CreditCardPurchase:
    from app.models.credit_card import CreditCard

    purchase = (
        db.query(CreditCardPurchase)
        .join(CreditCard, CreditCard.id == CreditCardPurchase.credit_card_id)
        .filter(
            CreditCardPurchase.id == purchase_id,
            CreditCard.user_id == user_id,
            CreditCardPurchase.deleted_at.is_(None),
        )
        .first()
    )
    if not purchase:
        raise NotFoundError("Compra não encontrada")
    return purchase


def create_purchase(db: Session, user_id: str, payload: CreditCardPurchaseCreate) -> CreditCardPurchase:
    card = credit_card_service.get_credit_card(db, user_id, payload.credit_card_id)

    purchase = CreditCardPurchase(
        credit_card_id=card.id,
        category_id=payload.category_id,
        description=payload.description,
        total_amount=payload.total_amount,
        purchase_date=payload.purchase_date,
        installments_count=payload.installments_count,
    )
    db.add(purchase)
    db.flush()

    n = payload.installments_count
    base_amount = (payload.total_amount / n).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    remainder = payload.total_amount - (base_amount * n)

    for i in range(1, n + 1):
        # A primeira parcela cai na fatura resolvida pela data real da compra;
        # as seguintes, no mesmo dia do mês, N meses à frente.
        installment_reference_date = payload.purchase_date + relativedelta(months=i - 1)
        invoice = invoice_service.resolve_invoice_for_date(db, card, installment_reference_date)

        amount = base_amount + remainder if i == n else base_amount

        installment = CreditCardInstallment(
            purchase_id=purchase.id,
            invoice_id=invoice.id,
            installment_number=i,
            total_installments=n,
            amount=amount,
            status=InstallmentStatus.pending,
        )
        db.add(installment)

    db.commit()
    db.refresh(purchase)
    return purchase


def cancel_purchase(db: Session, user_id: str, purchase_id: str) -> None:
    """Cancela a compra e todas as parcelas futuras (pendentes). Parcelas já
    pagas (de faturas já pagas) não são alteradas — o passado é imutável."""
    purchase = get_purchase(db, user_id, purchase_id)
    purchase.status = PurchaseStatus.cancelled
    purchase.deleted_at = date.today()

    for installment in purchase.installments:
        if installment.status == InstallmentStatus.pending:
            installment.status = InstallmentStatus.cancelled

    db.commit()
