"""Regra central (seções 12, 13, 14 do escopo):

Uma compra parcelada NUNCA é uma única despesa — é uma entidade `Compra` com
N `Parcelas` filhas, cada uma associada à fatura correta pela data da compra
mais N meses e a regra de fechamento do cartão. Uma compra à vista é apenas
uma compra com installments_count=1: mesmo modelo, sem caso especial.

Divisão de centavos: a última parcela absorve o resto da divisão, para que
a soma das parcelas seja sempre exatamente igual ao total da compra.

Recorrência (ex: Netflix todo mês): a compra recorrente é um "template" —
total_amount é o valor mensal e a compra acumula uma parcela por mês, cada
uma na fatura correta. A geração é lazy (`generate_due_recurring_purchases`),
chamada ao listar as compras; não há scheduler nesta arquitetura.
"""
import calendar
from datetime import date
from decimal import ROUND_DOWN, Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.credit_card import (
    CreditCardInstallment, CreditCardPurchase, InstallmentStatus, InvoiceStatus, PurchaseStatus
)
from app.schemas.credit_card_purchase import CreditCardPurchaseCreate, CreditCardPurchaseUpdate
from app.services import credit_card_service, invoice_service


def _clamp_day(year: int, month: int, day: int) -> int:
    """Dia seguro para o mês (ex: dia 31 em fevereiro -> último dia do mês)."""
    return min(day, calendar.monthrange(year, month)[1])


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


def _build_installments(db: Session, purchase: CreditCardPurchase, card) -> None:
    """Gera as N parcelas de uma compra parcelada/à vista (não recorrente)."""
    n = purchase.installments_count
    total = Decimal(purchase.total_amount)
    base_amount = (total / n).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    remainder = total - (base_amount * n)

    for i in range(1, n + 1):
        # A primeira parcela cai na fatura resolvida pela data real da compra;
        # as seguintes, no mesmo dia do mês, N meses à frente.
        installment_reference_date = purchase.purchase_date + relativedelta(months=i - 1)
        invoice = invoice_service.resolve_invoice_for_date(db, card, installment_reference_date)

        amount = base_amount + remainder if i == n else base_amount

        db.add(CreditCardInstallment(
            purchase_id=purchase.id,
            invoice_id=invoice.id,
            installment_number=i,
            total_installments=n,
            amount=amount,
            status=InstallmentStatus.pending,
        ))


def _generate_recurring_installments(db: Session, purchase: CreditCardPurchase, card, today: date) -> int:
    """Materializa uma parcela por mês vencido de uma compra recorrente ativa.
    Cada parcela usa total_amount como valor e cai na fatura resolvida para o
    dia configurado (recurring_day). Meses cuja fatura já foi paga são pulados
    (o passado é imutável). Retorna quantas parcelas foram criadas."""
    if not (purchase.is_recurring and purchase.recurring_active):
        return 0

    created = 0
    guard = 0
    while purchase.recurring_next_date and purchase.recurring_next_date <= today and guard < 120:
        guard += 1
        ref = purchase.recurring_next_date
        invoice = invoice_service.resolve_invoice_for_date(db, card, ref)

        if invoice.status != InvoiceStatus.paid:
            next_number = len(purchase.installments) + created + 1
            db.add(CreditCardInstallment(
                purchase_id=purchase.id,
                invoice_id=invoice.id,
                installment_number=next_number,
                total_installments=next_number,
                amount=Decimal(purchase.total_amount),
                status=InstallmentStatus.pending,
            ))
            created += 1

        nxt = ref + relativedelta(months=1)
        purchase.recurring_next_date = nxt.replace(
            day=_clamp_day(nxt.year, nxt.month, purchase.recurring_day or ref.day)
        )

    if created:
        purchase.installments_count = len(purchase.installments) + created
    return created


def create_purchase(db: Session, user_id: str, payload: CreditCardPurchaseCreate) -> CreditCardPurchase:
    card = credit_card_service.get_credit_card(db, user_id, payload.credit_card_id)

    if payload.is_recurring:
        recurring_day = payload.recurring_day or payload.purchase_date.day
        purchase = CreditCardPurchase(
            credit_card_id=card.id,
            category_id=payload.category_id,
            description=payload.description,
            total_amount=payload.total_amount,
            purchase_date=payload.purchase_date,
            installments_count=0,
            is_recurring=True,
            recurring_active=True,
            recurring_day=recurring_day,
            recurring_next_date=payload.purchase_date.replace(
                day=_clamp_day(payload.purchase_date.year, payload.purchase_date.month, recurring_day)
            ),
        )
        db.add(purchase)
        db.flush()
        _generate_recurring_installments(db, purchase, card, date.today())
    else:
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
        _build_installments(db, purchase, card)

    db.commit()
    db.refresh(purchase)
    return purchase


def update_purchase(
    db: Session, user_id: str, purchase_id: str, payload: CreditCardPurchaseUpdate
) -> CreditCardPurchase:
    """Edita um lançamento existente.

    - description / category_id: sempre podem mudar.
    - Compra recorrente: total_amount (novo valor mensal — aplica também às
      parcelas ainda pendentes), recurring_active (pausar/retomar) e
      recurring_day podem mudar.
    - Compra parcelada/à vista: total_amount, installments_count e
      purchase_date só podem mudar enquanto NENHUMA parcela tiver sido paga;
      nesse caso as parcelas pendentes são recriadas do zero.
    """
    purchase = get_purchase(db, user_id, purchase_id)
    data = payload.model_dump(exclude_unset=True)

    if "description" in data and data["description"] is not None:
        purchase.description = data["description"]
    if "category_id" in data:
        purchase.category_id = data["category_id"]

    if purchase.is_recurring:
        if data.get("total_amount") is not None:
            purchase.total_amount = data["total_amount"]
            for inst in purchase.installments:
                if inst.status == InstallmentStatus.pending:
                    inst.amount = data["total_amount"]
        if data.get("recurring_day") is not None:
            purchase.recurring_day = data["recurring_day"]
            if purchase.recurring_next_date:
                d = purchase.recurring_next_date
                purchase.recurring_next_date = d.replace(
                    day=_clamp_day(d.year, d.month, data["recurring_day"])
                )
        if data.get("recurring_active") is not None:
            was_active = purchase.recurring_active
            purchase.recurring_active = data["recurring_active"]
            # Ao reativar, retoma a geração a partir do mês atual se já ficou pra trás.
            if data["recurring_active"] and not was_active:
                today = date.today()
                if not purchase.recurring_next_date or purchase.recurring_next_date < today.replace(day=1):
                    day = purchase.recurring_day or purchase.purchase_date.day
                    purchase.recurring_next_date = today.replace(
                        day=_clamp_day(today.year, today.month, day)
                    )
                _generate_recurring_installments(db, purchase, purchase.credit_card, today)
    else:
        wants_rebuild = any(
            data.get(f) is not None for f in ("total_amount", "installments_count", "purchase_date")
        )
        if wants_rebuild:
            has_paid = any(i.status == InstallmentStatus.paid for i in purchase.installments)
            if has_paid:
                raise ConflictError(
                    "Não é possível alterar valor, parcelas ou data de uma compra "
                    "que já teve parcelas pagas."
                )
            if data.get("total_amount") is not None:
                purchase.total_amount = data["total_amount"]
            if data.get("installments_count") is not None:
                purchase.installments_count = data["installments_count"]
            if data.get("purchase_date") is not None:
                purchase.purchase_date = data["purchase_date"]

            for inst in list(purchase.installments):
                db.delete(inst)
            db.flush()
            _build_installments(db, purchase, purchase.credit_card)

    db.commit()
    db.refresh(purchase)
    return purchase


def cancel_purchase(db: Session, user_id: str, purchase_id: str) -> None:
    """Cancela a compra e todas as parcelas futuras (pendentes). Parcelas já
    pagas (de faturas já pagas) não são alteradas — o passado é imutável.
    Para uma compra recorrente, isso encerra a recorrência de vez (para apenas
    pausar, use recurring_active=False via update)."""
    purchase = get_purchase(db, user_id, purchase_id)
    purchase.status = PurchaseStatus.cancelled
    purchase.deleted_at = date.today()
    purchase.recurring_active = False

    for installment in purchase.installments:
        if installment.status == InstallmentStatus.pending:
            installment.status = InstallmentStatus.cancelled

    db.commit()


def generate_due_recurring_purchases(db: Session, user_id: str) -> int:
    """Materializa as parcelas mensais vencidas de todas as compras recorrentes
    ativas do usuário. Chamada sob demanda ao listar as compras do cartão.
    Retorna quantas parcelas novas foram geradas."""
    from app.models.credit_card import CreditCard

    today = date.today()
    purchases = (
        db.query(CreditCardPurchase)
        .join(CreditCard, CreditCard.id == CreditCardPurchase.credit_card_id)
        .filter(
            CreditCard.user_id == user_id,
            CreditCardPurchase.deleted_at.is_(None),
            CreditCardPurchase.is_recurring.is_(True),
            CreditCardPurchase.recurring_active.is_(True),
            CreditCardPurchase.recurring_next_date.isnot(None),
            CreditCardPurchase.recurring_next_date <= today,
        )
        .all()
    )

    generated = 0
    for purchase in purchases:
        generated += _generate_recurring_installments(db, purchase, purchase.credit_card, today)

    if generated:
        db.commit()
    return generated
