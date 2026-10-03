"""Migração: garante que cada parcela esteja na fatura certa pela regra de
fechamento do cartão (ver `app/services/invoice_service.py`: dia >=
closing_day fica no mês civil da própria data; dia < closing_day cai no
mês anterior).

Reclassifica cada PARCELA individualmente pela data real reconstruída da
compra e pela regra atual de `reference_period_for` — então é seguro rodar
de novo quantas vezes for preciso (inclusive depois de versões anteriores
deste script, que usaram regras diferentes/erradas): ele corrige o que
estiver fora do lugar pela regra VIGENTE no momento em que for rodado e não
mexe no que já está certo (idempotente — rodar duas vezes seguidas na
segunda não deveria mover nada).

Só mexe em parcelas de faturas que ainda NÃO foram pagas — fatura paga é
passado imutável (mesma regra usada no resto do sistema). Faturas que
ficam sem nenhuma parcela depois da reclassificação são removidas.

Uso (dentro do container do backend):
    python -m app.scripts.migrate_invoice_periods            # aplica de verdade
    python -m app.scripts.migrate_invoice_periods --dry-run  # só mostra o que mudaria, não salva
"""
import argparse
import calendar
from datetime import date

from dateutil.relativedelta import relativedelta

from app.database import SessionLocal
from app.models.credit_card import (
    CreditCard, CreditCardInstallment, CreditCardInvoice, CreditCardPurchase, InvoiceStatus,
)
from app.services.invoice_service import reference_period_for, resolve_invoice_for_date


def _safe_day(year: int, month: int, day: int) -> int:
    last_day = calendar.monthrange(year, month)[1]
    return min(day, last_day)


def _actual_date_for_installment(purchase: CreditCardPurchase, installment: CreditCardInstallment) -> date:
    """Reconstrói a data de referência real de uma parcela a partir da
    compra-mãe e do número dela — mesma fórmula usada na criação (ver
    `purchase_service._build_installments` /
    `_generate_recurring_installments`). Recorrente: aproxima pelo
    `recurring_day` atual — se ele foi editado no meio da recorrência,
    parcelas antigas podem ficar levemente imprecisas (caso raro)."""
    if purchase.is_recurring:
        day = purchase.recurring_day or purchase.purchase_date.day
        base = purchase.purchase_date.replace(day=1) + relativedelta(months=installment.installment_number - 1)
        return base.replace(day=_safe_day(base.year, base.month, day))
    return purchase.purchase_date + relativedelta(months=installment.installment_number - 1)


def run(dry_run: bool = False) -> None:
    db = SessionLocal()
    try:
        cards = db.query(CreditCard).all()
        total_scanned = 0
        total_moved = 0

        for card in cards:
            installments = (
                db.query(CreditCardInstallment)
                .join(CreditCardInvoice, CreditCardInvoice.id == CreditCardInstallment.invoice_id)
                .join(CreditCardPurchase, CreditCardPurchase.id == CreditCardInstallment.purchase_id)
                .filter(
                    CreditCardInvoice.credit_card_id == card.id,
                    CreditCardInvoice.status != InvoiceStatus.paid,
                )
                .all()
            )

            touched_invoice_ids: set[str] = set()

            for inst in installments:
                total_scanned += 1
                purchase = inst.purchase
                current_invoice = inst.invoice
                actual = _actual_date_for_installment(purchase, inst)
                correct_month, correct_year = reference_period_for(card, actual)

                if (current_invoice.reference_month, current_invoice.reference_year) == (correct_month, correct_year):
                    continue  # já está na fatura certa

                print(
                    f"cartão {card.name!r}: parcela {inst.installment_number}/{inst.total_installments} "
                    f"de {purchase.description!r} ({actual:%d/%m/%Y}) estava em "
                    f"{current_invoice.reference_month:02d}/{current_invoice.reference_year} -> "
                    f"{correct_month:02d}/{correct_year}"
                )
                total_moved += 1
                if not dry_run:
                    touched_invoice_ids.add(current_invoice.id)
                    target_invoice = resolve_invoice_for_date(db, card, actual)
                    inst.invoice_id = target_invoice.id
                    db.flush()

            if not dry_run:
                for inv_id in touched_invoice_ids:
                    remaining = (
                        db.query(CreditCardInstallment)
                        .filter(CreditCardInstallment.invoice_id == inv_id)
                        .count()
                    )
                    if remaining == 0:
                        inv = db.get(CreditCardInvoice, inv_id)
                        if inv and inv.status != InvoiceStatus.paid:
                            print(
                                f"cartão {card.name!r}: removendo fatura "
                                f"{inv.reference_month:02d}/{inv.reference_year} (ficou vazia)"
                            )
                            db.delete(inv)
                db.flush()

        if dry_run:
            print(f"\n[dry-run] {total_moved} de {total_scanned} parcela(s) verificada(s) seriam movidas.")
        else:
            db.commit()
            print(f"\n{total_moved} de {total_scanned} parcela(s) verificada(s) foram movidas pra fatura certa.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="Só mostra o que mudaria, sem salvar.")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
