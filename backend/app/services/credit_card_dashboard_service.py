"""Painel de cartões de crédito — foco em tomada de decisão.

Reúne, num único payload, tudo que responde "posso/devo gastar mais no
cartão este mês?":

  * utilização de limite por cartão e no total (usado / disponível / %);
  * fatura atual de cada cartão (valor, fechamento, vencimento, urgência);
  * quanto do futuro já está comprometido em parcelas;
  * para onde o dinheiro do cartão está indo, segregado por categoria e
    subcategoria (com drill-down);
  * tendência de gasto no cartão nos últimos meses;
  * insights automáticos (limite estourando, fatura vencendo, assinatura
    pesando na fatura, etc).

Tudo é derivado das parcelas (`CreditCardInstallment`) — a fatura nunca
guarda um total próprio (mesma regra do resto do sistema).
"""
from datetime import date
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.credit_card import (
    CreditCard, CreditCardInstallment, CreditCardInvoice, CreditCardPurchase,
    InstallmentStatus, InvoiceStatus,
)

_MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


def _invoice_label(month: int, year: int) -> str:
    return f"{_MONTHS_PT[month - 1]}/{str(year)[2:]}"


def _pct(part: Decimal, whole: Decimal) -> float:
    if whole and whole > 0:
        return round(float(part / whole * 100), 1)
    return 0.0


def _fmt(value: Decimal) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _installment_totals_by_invoice(db: Session, user_id: str) -> dict[str, Decimal]:
    """invoice_id -> soma das parcelas não canceladas (o "total da fatura")."""
    rows = (
        db.query(
            CreditCardInstallment.invoice_id,
            func.coalesce(func.sum(CreditCardInstallment.amount), 0),
        )
        .join(CreditCardInvoice, CreditCardInvoice.id == CreditCardInstallment.invoice_id)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(
            CreditCard.user_id == user_id,
            CreditCard.deleted_at.is_(None),
            CreditCardInstallment.status != InstallmentStatus.cancelled,
        )
        .group_by(CreditCardInstallment.invoice_id)
        .all()
    )
    return {inv_id: Decimal(total) for inv_id, total in rows}


def _used_limit_by_card(db: Session, user_id: str) -> dict[str, Decimal]:
    """Mesma regra de `credit_card_service.get_available_limit`: parcelas
    pendentes de faturas ainda não pagas."""
    rows = (
        db.query(
            CreditCardInvoice.credit_card_id,
            func.coalesce(func.sum(CreditCardInstallment.amount), 0),
        )
        .join(CreditCardInstallment, CreditCardInstallment.invoice_id == CreditCardInvoice.id)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(
            CreditCard.user_id == user_id,
            CreditCard.deleted_at.is_(None),
            CreditCardInvoice.status != InvoiceStatus.paid,
            CreditCardInstallment.status == InstallmentStatus.pending,
        )
        .group_by(CreditCardInvoice.credit_card_id)
        .all()
    )
    return {card_id: Decimal(total) for card_id, total in rows}


def _recurring_monthly_by_card(db: Session, user_id: str) -> dict[str, Decimal]:
    rows = (
        db.query(
            CreditCardPurchase.credit_card_id,
            func.coalesce(func.sum(CreditCardPurchase.total_amount), 0),
        )
        .join(CreditCard, CreditCard.id == CreditCardPurchase.credit_card_id)
        .filter(
            CreditCard.user_id == user_id,
            CreditCard.deleted_at.is_(None),
            CreditCardPurchase.deleted_at.is_(None),
            CreditCardPurchase.is_recurring.is_(True),
            CreditCardPurchase.recurring_active.is_(True),
        )
        .group_by(CreditCardPurchase.credit_card_id)
        .all()
    )
    return {card_id: Decimal(total) for card_id, total in rows}


def _card_health(utilization_pct: float, days_until_due: int | None, has_due: bool) -> str:
    if utilization_pct >= 90 or (has_due and days_until_due is not None and days_until_due < 0):
        return "critical"
    if utilization_pct >= 70 or (days_until_due is not None and 0 <= days_until_due <= 3):
        return "attention"
    return "ok"


def _build_cards(db: Session, user_id: str, today: date):
    cards = (
        db.query(CreditCard)
        .filter(CreditCard.user_id == user_id, CreditCard.deleted_at.is_(None))
        .order_by(CreditCard.created_at.asc())
        .all()
    )
    inv_totals = _installment_totals_by_invoice(db, user_id)
    used_by_card = _used_limit_by_card(db, user_id)
    recurring_by_card = _recurring_monthly_by_card(db, user_id)

    open_invoices = (
        db.query(CreditCardInvoice)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(
            CreditCard.user_id == user_id,
            CreditCard.deleted_at.is_(None),
            CreditCardInvoice.status != InvoiceStatus.paid,
        )
        .all()
    )
    invoices_by_card: dict[str, list[CreditCardInvoice]] = {}
    for inv in open_invoices:
        invoices_by_card.setdefault(inv.credit_card_id, []).append(inv)
    for lst in invoices_by_card.values():
        lst.sort(key=lambda i: (i.reference_year, i.reference_month))

    panels = []
    current_invoice_ids: list[str] = []
    for card in cards:
        credit_limit = Decimal(card.credit_limit or 0)
        used = used_by_card.get(card.id, Decimal("0"))
        available = credit_limit - used
        utilization = _pct(used, credit_limit)

        card_invoices = invoices_by_card.get(card.id, [])
        current = card_invoices[0] if card_invoices else None
        nxt = card_invoices[1] if len(card_invoices) > 1 else None

        current_brief = None
        days_until_due = None
        if current:
            current_invoice_ids.append(current.id)
            days_until_due = (current.due_date - today).days
            current_brief = {
                "id": current.id,
                "label": _invoice_label(current.reference_month, current.reference_year),
                "reference_month": current.reference_month,
                "reference_year": current.reference_year,
                "total": inv_totals.get(current.id, Decimal("0")),
                "status": current.status.value if hasattr(current.status, "value") else str(current.status),
                "closing_date": current.closing_date,
                "due_date": current.due_date,
                "days_until_due": days_until_due,
            }

        panels.append({
            "id": card.id,
            "name": card.name,
            "color": card.color,
            "brand": card.brand,
            "last_four_digits": card.last_four_digits,
            "closing_day": card.closing_day,
            "due_day": card.due_day,
            "credit_limit": credit_limit,
            "used_limit": used,
            "available_limit": available,
            "utilization_pct": utilization,
            "current_invoice": current_brief,
            "next_invoice_total": inv_totals.get(nxt.id, Decimal("0")) if nxt else Decimal("0"),
            "recurring_monthly_total": recurring_by_card.get(card.id, Decimal("0")),
            "health": _card_health(utilization, days_until_due, current is not None),
        })

    return panels, current_invoice_ids


def _scope_invoice_ids(db: Session, user_id: str, scope: str, current_invoice_ids: list[str]) -> list[str]:
    if scope == "open":
        rows = (
            db.query(CreditCardInvoice.id)
            .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
            .filter(
                CreditCard.user_id == user_id,
                CreditCard.deleted_at.is_(None),
                CreditCardInvoice.status != InvoiceStatus.paid,
            )
            .all()
        )
        return [r[0] for r in rows]
    return current_invoice_ids


def _category_breakdown(db: Session, user_id: str, invoice_ids: list[str]):
    if not invoice_ids:
        return []

    rows = (
        db.query(
            CreditCardPurchase.category_id,
            func.coalesce(func.sum(CreditCardInstallment.amount), 0),
        )
        .join(CreditCardPurchase, CreditCardPurchase.id == CreditCardInstallment.purchase_id)
        .filter(
            CreditCardInstallment.invoice_id.in_(invoice_ids),
            CreditCardInstallment.status != InstallmentStatus.cancelled,
        )
        .group_by(CreditCardPurchase.category_id)
        .all()
    )
    spend_by_category = {cat_id: Decimal(total) for cat_id, total in rows}
    if not spend_by_category:
        return []

    categories = {
        c.id: c
        for c in db.query(Category).filter(
            Category.user_id == user_id, Category.deleted_at.is_(None)
        ).all()
    }

    # nós-pai: category_id do pai (ou None para "sem categoria")
    parents: dict[str | None, dict] = {}

    def ensure_parent(pid: str | None) -> dict:
        if pid not in parents:
            cat = categories.get(pid) if pid else None
            parents[pid] = {
                "category_id": pid,
                "category_name": cat.name if cat else "Sem categoria",
                "color": cat.color if cat else None,
                "direct": Decimal("0"),
                "children": {},  # child_id -> {name, total}
            }
        return parents[pid]

    for cat_id, total in spend_by_category.items():
        cat = categories.get(cat_id) if cat_id else None
        if cat is None:
            ensure_parent(None)["direct"] += total
        elif cat.parent_id and cat.parent_id in categories:
            node = ensure_parent(cat.parent_id)
            node["children"][cat_id] = {"name": cat.name, "total": total}
        else:
            # categoria de topo (com ou sem filhos configurados)
            ensure_parent(cat_id)["direct"] += total

    grand_total = sum(
        (p["direct"] + sum(c["total"] for c in p["children"].values()) for p in parents.values()),
        Decimal("0"),
    )

    result = []
    for pid, node in parents.items():
        children_total = sum(c["total"] for c in node["children"].values())
        node_total = node["direct"] + children_total

        children = []
        if node["children"]:
            if node["direct"] > 0:
                children.append({
                    "category_id": pid,
                    "category_name": "Sem subcategoria",
                    "total": node["direct"],
                    "percentage": _pct(node["direct"], node_total),
                })
            for child_id, child in node["children"].items():
                children.append({
                    "category_id": child_id,
                    "category_name": child["name"],
                    "total": child["total"],
                    "percentage": _pct(child["total"], node_total),
                })
            children.sort(key=lambda c: c["total"], reverse=True)

        result.append({
            "category_id": node["category_id"],
            "category_name": node["category_name"],
            "color": node["color"],
            "total": node_total,
            "percentage": _pct(node_total, grand_total),
            "is_uncategorized": pid is None,
            "children": children,
        })

    result.sort(key=lambda n: n["total"], reverse=True)
    return result


def _trend(db: Session, user_id: str, months: int, today: date):
    start_ref = today - relativedelta(months=months - 1)
    start_idx = start_ref.year * 12 + start_ref.month
    end_idx = today.year * 12 + today.month

    ref_index = CreditCardInvoice.reference_year * 12 + CreditCardInvoice.reference_month
    rows = (
        db.query(
            CreditCardInvoice.reference_year,
            CreditCardInvoice.reference_month,
            CreditCardInstallment.status,
            func.coalesce(func.sum(CreditCardInstallment.amount), 0),
        )
        .join(CreditCardInstallment, CreditCardInstallment.invoice_id == CreditCardInvoice.id)
        .join(CreditCard, CreditCard.id == CreditCardInvoice.credit_card_id)
        .filter(
            CreditCard.user_id == user_id,
            CreditCard.deleted_at.is_(None),
            CreditCardInstallment.status != InstallmentStatus.cancelled,
            ref_index >= start_idx,
            ref_index <= end_idx,
        )
        .group_by(
            CreditCardInvoice.reference_year,
            CreditCardInvoice.reference_month,
            CreditCardInstallment.status,
        )
        .all()
    )

    buckets: dict[tuple[int, int], dict] = {}
    for year, month, status, total in rows:
        b = buckets.setdefault((year, month), {"paid": Decimal("0"), "pending": Decimal("0")})
        status_val = status.value if hasattr(status, "value") else str(status)
        if status_val == InstallmentStatus.paid.value:
            b["paid"] += Decimal(total)
        else:
            b["pending"] += Decimal(total)

    points = []
    for i in range(months - 1, -1, -1):
        ref = today - relativedelta(months=i)
        b = buckets.get((ref.year, ref.month), {"paid": Decimal("0"), "pending": Decimal("0")})
        points.append({
            "label": _invoice_label(ref.month, ref.year),
            "paid": b["paid"],
            "pending": b["pending"],
            "total": b["paid"] + b["pending"],
        })
    return points


def _insights(panels: list[dict], totals: dict, breakdown: list[dict]) -> list[dict]:
    out: list[dict] = []

    for p in panels:
        u = p["utilization_pct"]
        if u >= 90:
            out.append({
                "level": "critical",
                "text": f"{p['name']} está com {u:.0f}% do limite usado ({_fmt(p['used_limit'])} "
                        f"de {_fmt(p['credit_limit'])}). Evite novas compras neste cartão.",
            })
        elif u >= 70:
            out.append({
                "level": "attention",
                "text": f"{p['name']} já usa {u:.0f}% do limite — restam {_fmt(p['available_limit'])}.",
            })

        ci = p["current_invoice"]
        if ci and ci["status"] != "paid":
            d = ci["days_until_due"]
            if d < 0:
                out.append({
                    "level": "critical",
                    "text": f"A fatura de {p['name']} ({_fmt(ci['total'])}) venceu há {abs(d)} dia(s).",
                })
            elif d <= 3:
                out.append({
                    "level": "attention",
                    "text": f"A fatura de {p['name']} ({_fmt(ci['total'])}) vence em {d} dia(s).",
                })

    if totals["recurring_monthly_total"] > 0:
        share = _pct(totals["recurring_monthly_total"], totals["current_invoices_total"])
        suffix = f" — {share:.0f}% da fatura atual" if share else ""
        out.append({
            "level": "info",
            "text": f"Assinaturas recorrentes somam {_fmt(totals['recurring_monthly_total'])}/mês{suffix}.",
        })

    if totals["future_committed_total"] > 0:
        out.append({
            "level": "info",
            "text": f"{_fmt(totals['future_committed_total'])} em parcelas já estão comprometidos "
                    f"para as próximas faturas.",
        })

    if breakdown:
        top = breakdown[0]
        out.append({
            "level": "info",
            "text": f"Maior gasto no cartão: {top['category_name']} "
                    f"({_fmt(top['total'])}, {top['percentage']:.0f}% do total).",
        })

    order = {"critical": 0, "attention": 1, "info": 2}
    out.sort(key=lambda i: order[i["level"]])
    return out[:6]


def get_credit_card_dashboard(
    db: Session, user_id: str, scope: str = "current", months: int = 6
) -> dict:
    today = date.today()

    panels, current_invoice_ids = _build_cards(db, user_id, today)

    credit_limit_total = sum((p["credit_limit"] for p in panels), Decimal("0"))
    used_limit_total = sum((p["used_limit"] for p in panels), Decimal("0"))
    available_total = credit_limit_total - used_limit_total
    current_invoices_total = sum(
        (p["current_invoice"]["total"] for p in panels if p["current_invoice"]), Decimal("0")
    )
    recurring_total = sum((p["recurring_monthly_total"] for p in panels), Decimal("0"))
    future_committed = used_limit_total - current_invoices_total
    if future_committed < 0:
        future_committed = Decimal("0")

    trend = _trend(db, user_id, months, today)
    spend_change_pct = None
    if len(trend) >= 2 and trend[-2]["total"] > 0:
        spend_change_pct = round(
            float((trend[-1]["total"] - trend[-2]["total"]) / trend[-2]["total"] * 100), 1
        )

    totals = {
        "credit_limit": credit_limit_total,
        "used_limit": used_limit_total,
        "available_limit": available_total,
        "utilization_pct": _pct(used_limit_total, credit_limit_total),
        "current_invoices_total": current_invoices_total,
        "future_committed_total": future_committed,
        "recurring_monthly_total": recurring_total,
        "spend_change_pct": spend_change_pct,
    }

    invoice_ids = _scope_invoice_ids(db, user_id, scope, current_invoice_ids)
    breakdown = _category_breakdown(db, user_id, invoice_ids)

    return {
        "scope": scope if scope in ("current", "open") else "current",
        "totals": totals,
        "cards": panels,
        "category_breakdown": breakdown,
        "trend": trend,
        "insights": _insights(panels, totals, breakdown),
    }
