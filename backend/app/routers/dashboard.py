from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummary, CashFlowResponse, CategoryBreakdownResponse
from app.services import dashboard_service, recurring_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Materializa qualquer ocorrência recorrente vencida antes de calcular o
    # resumo, para que o Dashboard nunca mostre números desatualizados por
    # falta de uma recorrência (aluguel, Netflix etc.) ter sido gerada ainda.
    recurring_service.generate_due_occurrences(db, current_user.id)
    return dashboard_service.get_summary(db, current_user.id)


@router.get("/cash-flow", response_model=CashFlowResponse)
def cash_flow(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    points = dashboard_service.get_cash_flow(db, current_user.id, months)
    return {"points": points}


@router.get("/category-breakdown", response_model=CategoryBreakdownResponse)
def category_breakdown(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = dashboard_service.get_category_breakdown(db, current_user.id)
    return {"items": items}
