"""Regra de fechamento de fatura (seção 14 do escopo):

Dado um cartão que fecha no dia D (closing_day) e uma compra/parcela com
data de referência C:
  - se dia(C) <= D: cai na fatura do mês/ano de C
  - se dia(C) >  D: cai na fatura do mês seguinte

A fatura é buscada por (credit_card_id, mês, ano); se não existir, é criada
nesse momento com closing_date/due_date calculados a partir de
closing_day/due_day do cartão. Esta função é o único ponto de verdade dessa
regra — usada tanto por compras parceladas quanto à vista (que são só uma
compra de 1 parcela).
"""
import calendar
from datetime import date

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from app.models.credit_card import CreditCard, CreditCardInvoice, InvoiceStatus


def _safe_day(year: int, month: int, day: int) -> int:
    """Evita erro em meses com menos dias que o dia configurado
    (ex: fechamento dia 31 em fevereiro -> usa o último dia do mês)."""
    last_day = calendar.monthrange(year, month)[1]
    return min(day, last_day)


def resolve_invoice_for_date(db: Session, credit_card: CreditCard, reference_date: date) -> CreditCardInvoice:
    if reference_date.day <= credit_card.closing_day:
        invoice_month_date = reference_date.replace(day=1)
    else:
        invoice_month_date = reference_date.replace(day=1) + relativedelta(months=1)

    month, year = invoice_month_date.month, invoice_month_date.year

    invoice = (
        db.query(CreditCardInvoice)
        .filter(
            CreditCardInvoice.credit_card_id == credit_card.id,
            CreditCardInvoice.reference_month == month,
            CreditCardInvoice.reference_year == year,
        )
        .first()
    )
    if invoice:
        return invoice

    closing_day = _safe_day(year, month, credit_card.closing_day)
    closing_date = date(year, month, closing_day)

    due_month_date = invoice_month_date
    due_day = _safe_day(due_month_date.year, due_month_date.month, credit_card.due_day)
    due_date = date(due_month_date.year, due_month_date.month, due_day)
    # Se o vencimento cair antes ou no mesmo dia do fechamento (configuração
    # comum: fecha dia 25, vence dia 5 do mês seguinte), empurra pro mês seguinte.
    if due_date <= closing_date:
        due_month_date = due_month_date + relativedelta(months=1)
        due_day = _safe_day(due_month_date.year, due_month_date.month, credit_card.due_day)
        due_date = date(due_month_date.year, due_month_date.month, due_day)

    invoice = CreditCardInvoice(
        credit_card_id=credit_card.id,
        reference_month=month,
        reference_year=year,
        closing_date=closing_date,
        due_date=due_date,
        status=InvoiceStatus.open,
    )
    db.add(invoice)
    db.flush()
    return invoice


def get_invoice_total(db: Session, invoice_id: str) -> "Decimal":  # noqa: F821
    from decimal import Decimal
    from sqlalchemy import func
    from app.models.credit_card import CreditCardInstallment, InstallmentStatus

    total = (
        db.query(func.coalesce(func.sum(CreditCardInstallment.amount), 0))
        .filter(
            CreditCardInstallment.invoice_id == invoice_id,
            CreditCardInstallment.status != InstallmentStatus.cancelled,
        )
        .scalar()
    )
    return Decimal(total)
