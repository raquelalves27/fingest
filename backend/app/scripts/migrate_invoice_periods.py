"""Migração one-off: corrige o rótulo (reference_month/reference_year) das
faturas criadas antes da correção da regra de fechamento (seção 14 do
escopo — ver `app/services/invoice_service.py`).

A regra antiga rotulava errado a fatura que fecha no dia `closing_day` do
mês SEGUINTE: ela usava o mês em que a maior parte do ciclo caía em vez do
mês "de origem" da competência. O fechamento/vencimento reais sempre
estiveram certos — são datas de calendário concretas, calculadas do mesmo
jeito nos dois casos; só o número do mês/ano de referência estava um mês
adiantado. Corrigir é simplesmente recuar reference_month/reference_year em
1 mês — não precisa recalcular fechamento/vencimento nem mover nenhuma
parcela entre faturas (a fatura continua sendo o mesmo registro, só com o
rótulo certo).

Só mexe em faturas que ainda NÃO foram pagas — fatura paga é passado
imutável (mesma regra usada no resto do sistema: uma vez paga, o histórico
não muda). Processa em ordem crescente de (ano, mês) por cartão, cartão por
cartão, cada atualização sendo persistida (flush) antes da próxima — assim
o slot que uma fatura libera ao recuar já está vago quando a fatura do mês
seguinte (que recua pra esse mesmo slot) é processada, sem violar a
constraint única (credit_card_id, reference_month, reference_year).

Se o slot de destino já estiver ocupado por uma fatura PAGA (não mexemos
nela), a fatura é pulada e reportada — precisa de revisão manual nesse caso
(raro: só acontece se há faturas paga e não-paga em meses adjacentes do
mesmo cartão).

Uso (dentro do container do backend):
    python -m app.scripts.migrate_invoice_periods            # aplica de verdade
    python -m app.scripts.migrate_invoice_periods --dry-run  # só mostra o que mudaria, não salva
"""
import argparse

from app.database import SessionLocal
from app.models.credit_card import CreditCard, CreditCardInvoice, InvoiceStatus


def _shift_back_one_month(month: int, year: int) -> tuple[int, int]:
    if month == 1:
        return 12, year - 1
    return month - 1, year


def run(dry_run: bool = False) -> None:
    db = SessionLocal()
    try:
        cards = db.query(CreditCard).all()
        total_changed = 0
        total_skipped = 0

        for card in cards:
            invoices = (
                db.query(CreditCardInvoice)
                .filter(CreditCardInvoice.credit_card_id == card.id)
                .order_by(CreditCardInvoice.reference_year.asc(), CreditCardInvoice.reference_month.asc())
                .all()
            )
            # Slots já ocupados por faturas PAGAS deste cartão — essas não se
            # mexem, então funcionam como "paredes" pro reposicionamento das
            # não-pagas.
            paid_keys = {
                (i.reference_month, i.reference_year) for i in invoices if i.status == InvoiceStatus.paid
            }

            for inv in invoices:
                if inv.status == InvoiceStatus.paid:
                    continue

                new_month, new_year = _shift_back_one_month(inv.reference_month, inv.reference_year)

                if (new_month, new_year) in paid_keys:
                    total_skipped += 1
                    print(
                        f"[PULADA] cartão {card.name!r}: fatura {inv.reference_month:02d}/{inv.reference_year} "
                        f"(fecha {inv.closing_date}) colidiria com uma fatura já PAGA em "
                        f"{new_month:02d}/{new_year} — revise manualmente."
                    )
                    continue

                print(
                    f"cartão {card.name!r}: fatura {inv.reference_month:02d}/{inv.reference_year} "
                    f"(fecha {inv.closing_date}, vence {inv.due_date}) -> {new_month:02d}/{new_year}"
                )
                total_changed += 1
                if not dry_run:
                    inv.reference_month, inv.reference_year = new_month, new_year
                    # Persiste já — a próxima fatura do loop (um mês à frente,
                    # que recua pro slot que esta acabou de liberar) depende
                    # disso pra não violar a constraint única.
                    db.flush()

        if dry_run:
            print(f"\n[dry-run] {total_changed} fatura(s) seriam corrigidas, {total_skipped} pulada(s) por colisão.")
        else:
            db.commit()
            print(f"\n{total_changed} fatura(s) corrigida(s), {total_skipped} pulada(s) por colisão.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="Só mostra o que mudaria, sem salvar.")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
