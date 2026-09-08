from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.calendar import CalendarResponse
from app.services import calendar_service

router = APIRouter(prefix="/calendar", tags=["Calendário"])


@router.get("", response_model=CalendarResponse)
def get_calendar(
    month: int = Query(ge=1, le=12),
    year: int = Query(ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return calendar_service.get_calendar(db, current_user.id, month, year)
