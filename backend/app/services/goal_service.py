"""Metas (seção 19): 'já guardado' é sempre a soma das contribuições — nunca
um campo editado diretamente. Uma contribuição opcionalmente debita de uma
conta real (gera saída no ledger), ou é apenas um registro informativo
(sem account_id) para quem guarda dinheiro fora do sistema."""
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.account import AccountTransactionType
from app.models.misc import FinancialGoal, GoalContribution, GoalStatus
from app.schemas.goal import GoalCreate, GoalUpdate, ContributionCreate
from app.services import balance_service


def list_goals(db: Session, user_id: str) -> list[FinancialGoal]:
    return (
        db.query(FinancialGoal)
        .filter(FinancialGoal.user_id == user_id)
        .order_by(FinancialGoal.created_at.desc())
        .all()
    )


def get_goal(db: Session, user_id: str, goal_id: str) -> FinancialGoal:
    goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == user_id).first()
    if not goal:
        raise NotFoundError("Meta não encontrada")
    return goal


def goal_with_progress(goal: FinancialGoal) -> dict:
    saved = sum((Decimal(c.amount) for c in goal.contributions), Decimal("0"))
    target = Decimal(goal.target_amount)
    return {
        "id": goal.id,
        "name": goal.name,
        "target_amount": target,
        "target_date": goal.target_date,
        "status": goal.status,
        "saved_amount": saved,
        "progress_percentage": float(min(saved / target * 100, Decimal("999"))) if target > 0 else 0.0,
        "contributions": goal.contributions,
    }


def create_goal(db: Session, user_id: str, payload: GoalCreate) -> FinancialGoal:
    goal = FinancialGoal(
        user_id=user_id, name=payload.name, target_amount=payload.target_amount,
        target_date=payload.target_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def update_goal(db: Session, user_id: str, goal_id: str, payload: GoalUpdate) -> FinancialGoal:
    goal = get_goal(db, user_id, goal_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, user_id: str, goal_id: str) -> None:
    goal = get_goal(db, user_id, goal_id)
    db.delete(goal)
    db.commit()


def add_contribution(db: Session, user_id: str, goal_id: str, payload: ContributionCreate) -> FinancialGoal:
    goal = get_goal(db, user_id, goal_id)

    contribution = GoalContribution(
        goal_id=goal.id, amount=payload.amount,
        contribution_date=payload.contribution_date, account_id=payload.account_id,
    )
    db.add(contribution)
    db.flush()

    if payload.account_id:
        balance_service.record_transaction(
            db, account_id=payload.account_id, amount=-payload.amount,
            type=AccountTransactionType.adjustment, transaction_date=payload.contribution_date,
            reference_type="goal_contribution", reference_id=contribution.id,
            description=f"Aporte para meta: {goal.name}",
        )

    # marca a meta como concluída automaticamente ao atingir o valor alvo
    total_saved = sum((Decimal(c.amount) for c in goal.contributions), Decimal("0")) + payload.amount
    if total_saved >= Decimal(goal.target_amount) and goal.status == GoalStatus.active:
        goal.status = GoalStatus.completed

    db.commit()
    db.refresh(goal)
    return goal
