"""Recorrência (seção 17): ao criar, gera a primeira ocorrência (income/expense
com status 'expected'/'pending') e calcula next_occurrence_date. Uma função
`generate_due_occurrences` é chamada sob demanda (ex: ao abrir o Dashboard)
para materializar qualquer ocorrência cuja data já chegou — não há
scheduler em background nesta arquitetura, então a geração é "lazy": a
próxima ocorrência é criada na primeira vez que alguém pede a lista
depois da data prevista, o que é suficiente para um sistema de uso pessoal.
"""
from datetime import date

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.misc import RecurringTransaction, RecurrenceFrequency
from app.models.transaction import Income, Expense, IncomeStatus, ExpenseStatus
from app.schemas.recurring import RecurringTransactionCreate, RecurringTransactionUpdate


def _advance_date(current: date, frequency: RecurrenceFrequency) -> date:
    if frequency == RecurrenceFrequency.weekly:
        return current + relativedelta(weeks=1)
    if frequency == RecurrenceFrequency.yearly:
        return current + relativedelta(years=1)
    # monthly e custom (sem uma unidade própria ainda) caem em mensal
    return current + relativedelta(months=1)


def list_recurring(db: Session, user_id: str) -> list[RecurringTransaction]:
    return (
        db.query(RecurringTransaction)
        .filter(RecurringTransaction.user_id == user_id)
        .order_by(RecurringTransaction.created_at.desc())
        .all()
    )


def get_recurring(db: Session, user_id: str, recurring_id: str) -> RecurringTransaction:
    recurring = (
        db.query(RecurringTransaction)
        .filter(RecurringTransaction.id == recurring_id, RecurringTransaction.user_id == user_id)
        .first()
    )
    if not recurring:
        raise NotFoundError("Recorrência não encontrada")
    return recurring


def _materialize_occurrence(db: Session, user_id: str, recurring: RecurringTransaction, occurrence_date: date) -> None:
    if recurring.type == "income":
        db.add(Income(
            user_id=user_id, account_id=recurring.account_id, category_id=recurring.category_id,
            description=recurring.description, amount=recurring.amount, income_date=occurrence_date,
            status=IncomeStatus.expected, recurring_transaction_id=recurring.id,
        ))
    else:
        db.add(Expense(
            user_id=user_id, account_id=recurring.account_id, category_id=recurring.category_id,
            description=recurring.description, amount=recurring.amount, expense_date=occurrence_date,
            status=ExpenseStatus.pending, recurring_transaction_id=recurring.id,
        ))


def create_recurring(db: Session, user_id: str, payload: RecurringTransactionCreate) -> RecurringTransaction:
    recurring = RecurringTransaction(
        user_id=user_id,
        type=payload.type,
        description=payload.description,
        amount=payload.amount,
        category_id=payload.category_id,
        account_id=payload.account_id,
        frequency=payload.frequency,
        start_date=payload.start_date,
        end_date=payload.end_date,
        next_occurrence_date=payload.start_date,
    )
    db.add(recurring)
    db.flush()

    _materialize_occurrence(db, user_id, recurring, payload.start_date)
    recurring.next_occurrence_date = _advance_date(payload.start_date, payload.frequency)

    db.commit()
    db.refresh(recurring)
    return recurring


def update_recurring(db: Session, user_id: str, recurring_id: str, payload: RecurringTransactionUpdate) -> RecurringTransaction:
    recurring = get_recurring(db, user_id, recurring_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(recurring, field, value)
    db.commit()
    db.refresh(recurring)
    return recurring


def delete_recurring(db: Session, user_id: str, recurring_id: str) -> None:
    recurring = get_recurring(db, user_id, recurring_id)
    recurring.is_active = False
    db.commit()


def generate_due_occurrences(db: Session, user_id: str) -> int:
    """Materializa todas as ocorrências vencidas (next_occurrence_date <= hoje)
    de todas as recorrências ativas do usuário. Chamada sob demanda (ex: ao
    carregar o Dashboard ou a lista de recorrências). Retorna quantas
    ocorrências novas foram geradas."""
    today = date.today()
    recurrences = (
        db.query(RecurringTransaction)
        .filter(
            RecurringTransaction.user_id == user_id,
            RecurringTransaction.is_active.is_(True),
            RecurringTransaction.next_occurrence_date.isnot(None),
            RecurringTransaction.next_occurrence_date <= today,
        )
        .all()
    )

    generated = 0
    for recurring in recurrences:
        # gera todas as ocorrências em atraso, uma por vez, até alcançar hoje
        # (ou passar do end_date, o que interrompe a recorrência)
        guard = 0  # proteção contra loop infinito em dados malformados
        while recurring.next_occurrence_date and recurring.next_occurrence_date <= today and guard < 500:
            if recurring.end_date and recurring.next_occurrence_date > recurring.end_date:
                recurring.is_active = False
                break
            _materialize_occurrence(db, user_id, recurring, recurring.next_occurrence_date)
            generated += 1
            recurring.next_occurrence_date = _advance_date(recurring.next_occurrence_date, recurring.frequency)
            guard += 1

    if generated:
        db.commit()
    return generated
