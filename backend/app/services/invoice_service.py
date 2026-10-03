"""Regra de fechamento de fatura (seção 14 do escopo):

Dado um cartão que fecha no dia D (closing_day) e uma compra/parcela com
data de referência C:
  - se dia(C) >= D: cai na fatura do mês/ano de C
  - se dia(C) <  D: cai na fatura do mês anterior a C

Ou seja, a janela de uma fatura do mês M vai do dia D do próprio mês M até
o dia (D-1) do mês M+1 — por isso ela só fecha/vence no mês SEGUINTE (ex:
fecha dia 9 -> a fatura "Setembro" cobre de 09/09 a 08/10, e fecha em
09/10 — não em 09/09; 09/09 já pertence a Setembro, não a Agosto).

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


def reference_period_for(credit_card: CreditCard, reference_date: date) -> tuple[int, int]:
    """(mês, ano) da competência que `reference_date` cai, pela regra do
    `closing_day` do cartão (ver docstring do módulo) — sem efeito
    colateral de criar fatura. É a metade "pura" de `resolve_invoice_for_date`;
    existe separada porque quem só precisa saber "qual é a fatura atual
    agora" (telas de consulta/resumo) não deve criar faturas como efeito
    colateral de uma leitura, e porque cada cartão pode ter um `closing_day`
    diferente — não dá pra usar o mês/ano civil de hoje como proxy direto.

    Ex: fecha dia 9 — 05/09 (dia 5 < 9) cai em "Agosto"; 09/09, 10/09, 12/09,
    30/09 (dia >= 9) caem em "Setembro"; 09/10 (dia 9 do mês seguinte) já
    cai em "Outubro"."""
    if reference_date.day >= credit_card.closing_day:
        invoice_month_date = reference_date.replace(day=1)
    else:
        invoice_month_date = reference_date.replace(day=1) - relativedelta(months=1)
    return invoice_month_date.month, invoice_month_date.year


def select_current_invoice(
    credit_card: CreditCard, invoices_sorted: list[CreditCardInvoice], today: date
) -> CreditCardInvoice | None:
    """A fatura 'atual' de um cartão: a da competência aberta hoje (ver
    `reference_period_for`) — não necessariamente a do mês civil de hoje.
    Se essa fatura já foi paga (usuário adiantou o pagamento), a próxima
    assume o posto. Se ainda não existe fatura pra competência atual
    (nenhuma compra lançada neste ciclo ainda), cai pra mais antiga em
    aberto. `invoices_sorted` precisa estar ordenada por
    (reference_year, reference_month) crescente. Usada por toda tela/painel
    que precisa saber "qual fatura é a atual" sem criar uma como efeito
    colateral de uma leitura."""
    month, year = reference_period_for(credit_card, today)
    current = next(
        (i for i in invoices_sorted if (i.reference_year, i.reference_month) == (year, month)), None
    )
    if current is not None and current.status == InvoiceStatus.paid:
        idx = invoices_sorted.index(current)
        current = invoices_sorted[idx + 1] if idx + 1 < len(invoices_sorted) else None
    if current is None:
        current = next((i for i in invoices_sorted if i.status != InvoiceStatus.paid), None)
    return current


def current_invoice_ids_for_user(db: Session, user_id: str, today: date) -> list[str]:
    """Ids da fatura 'atual' (`select_current_invoice`) de cada cartão do
    usuário. Não dá pra achar isso com um único filtro de mês/ano civil:
    cada cartão pode ter um `closing_day` diferente, então a competência que
    está aberta hoje varia de cartão pra cartão — telas/insights que somam
    "a fatura deste mês" em cima de todos os cartões do usuário precisam
    passar por aqui em vez de comparar `reference_month`/`reference_year`
    direto com o mês civil de hoje."""
    cards = (
        db.query(CreditCard)
        .filter(CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None))
        .all()
    )
    if not cards:
        return []

    invoices = (
        db.query(CreditCardInvoice)
        .filter(CreditCardInvoice.credit_card_id.in_([c.id for c in cards]))
        .order_by(CreditCardInvoice.reference_year.asc(), CreditCardInvoice.reference_month.asc())
        .all()
    )
    invoices_by_card: dict[str, list[CreditCardInvoice]] = {}
    for inv in invoices:
        invoices_by_card.setdefault(inv.credit_card_id, []).append(inv)

    ids = []
    for card in cards:
        current = select_current_invoice(card, invoices_by_card.get(card.id, []), today)
        if current:
            ids.append(current.id)
    return ids


def closing_and_due_dates(credit_card: CreditCard, month: int, year: int) -> tuple[date, date]:
    """(closing_date, due_date) da fatura de referência (month, year) — a
    fatura fecha no dia `closing_day` do mês SEGUINTE a (month, year), não
    do próprio mês de referência (ver docstring do módulo). Função pura,
    sem tocar no banco — usada tanto para criar uma fatura nova quanto para
    corrigir fechamento/vencimento de uma fatura já existente cujo rótulo
    mudou (ex: migração de dados), já que esses dois campos dependem só de
    (month, year, closing_day, due_day), nunca da data da compra em si."""
    closing_month_date = date(year, month, 1) + relativedelta(months=1)
    closing_day = _safe_day(closing_month_date.year, closing_month_date.month, credit_card.closing_day)
    closing_date = date(closing_month_date.year, closing_month_date.month, closing_day)

    due_month_date = closing_month_date
    due_day = _safe_day(due_month_date.year, due_month_date.month, credit_card.due_day)
    due_date = date(due_month_date.year, due_month_date.month, due_day)
    # Se o vencimento cair antes ou no mesmo dia do fechamento (configuração
    # comum: fecha dia 25, vence dia 5 do mês seguinte), empurra pro mês seguinte.
    if due_date <= closing_date:
        due_month_date = due_month_date + relativedelta(months=1)
        due_day = _safe_day(due_month_date.year, due_month_date.month, credit_card.due_day)
        due_date = date(due_month_date.year, due_month_date.month, due_day)

    return closing_date, due_date


def resolve_invoice_for_date(db: Session, credit_card: CreditCard, reference_date: date) -> CreditCardInvoice:
    month, year = reference_period_for(credit_card, reference_date)

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

    closing_date, due_date = closing_and_due_dates(credit_card, month, year)
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
