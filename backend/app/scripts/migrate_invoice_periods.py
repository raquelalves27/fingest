"""Migração: garante que cada parcela esteja na fatura certa pela regra de
fechamento do cartão (ver `app/services/invoice_service.py`: dia >=
closing_day fica no mês civil da própria data; dia < closing_day cai no
mês anterior) — e que o fechamento/vencimento de cada fatura batam com essa
regra.

Faz duas coisas, nessa ordem, por cartão:

1. Reclassifica cada PARCELA individualmente pela data real reconstruída da
   compra, movendo-a pra fatura certa quando necessário.
2. Recalcula fechamento/vencimento de TODA fatura não paga a partir do seu
   próprio rótulo (reference_month/year) — necessário porque uma fatura
   criada numa versão antiga do código (antes desta correção, ou de
   correções anteriores) guarda fechamento/vencimento de quando foi criada;
   só corrigir o rótulo (passo 1) não atualiza esses dois campos, e uma
   fatura "reaproveitada" (já existia pro mês certo) nunca passa de novo
   pelo cálculo de fechamento/vencimento.

Os dois passos são idempotentes — seguro rodar de novo quantas vezes for
preciso (inclusive depois de versões anteriores deste script, que usaram
regras diferentes/erradas): cada rodada corrige o que estiver fora do lugar
pela regra VIGENTE no momento em que for rodado e não mexe no que já está
certo.

Só mexe em faturas/parcelas que ainda NÃO foram pagas — fatura paga é
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
from app.services.invoice_service import closing_and_due_dates, reference_period_for, resolve_invoice_for_date


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
        total_dates_fixed = 0

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

            # Passo 2: fechamento/vencimento de toda fatura não paga tem que
            # bater com o que a regra atual calcularia pro próprio rótulo
            # dela — senão fica uma fatura "Setembro" com fechamento de
            # dezembro, sobra de quando o rótulo dela ainda estava errado.
            open_invoices = (
                db.query(CreditCardInvoice)
                .filter(CreditCardInvoice.credit_card_id == card.id, CreditCardInvoice.status != InvoiceStatus.paid)
                .all()
            )
            for inv in open_invoices:
                correct_closing, correct_due = closing_and_due_dates(card, inv.reference_month, inv.reference_year)
                if (inv.closing_date, inv.due_date) == (correct_closing, correct_due):
                    continue
                total_dates_fixed += 1
                print(
                    f"cartão {card.name!r}: fatura {inv.reference_month:02d}/{inv.reference_year} — "
                    f"fechamento/vencimento {inv.closing_date}/{inv.due_date} -> {correct_closing}/{correct_due}"
                )
                if not dry_run:
                    inv.closing_date = correct_closing
                    inv.due_date = correct_due

        if dry_run:
            print(
                f"\n[dry-run] {total_moved} de {total_scanned} parcela(s) verificada(s) seriam movidas; "
                f"{total_dates_fixed} fatura(s) teriam fechamento/vencimento corrigidos."
            )
        else:
            db.commit()
            print(
                f"\n{total_moved} de {total_scanned} parcela(s) verificada(s) foram movidas pra fatura certa; "
                f"{total_dates_fixed} fatura(s) tiveram fechamento/vencimento corrigidos."
            )
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="Só mostra o que mudaria, sem salvar.")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
