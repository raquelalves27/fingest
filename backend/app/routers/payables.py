from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.payables import PayableSummary, ReceivableSummary
from app.services import payables_service

router = APIRouter(prefix="/payables", tags=["Contas a pagar/receber"])


@router.get("/expenses", response_model=PayableSummary)
def get_payables(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return payables_service.get_payables(db, current_user.id)


@router.get("/incomes", response_model=ReceivableSummary)
def get_receivables(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return payables_service.get_receivables(db, current_user.id)
