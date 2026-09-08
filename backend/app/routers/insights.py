from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.insights import InsightsResponse
from app.services import insight_service

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("", response_model=InsightsResponse)
def get_insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    insights = insight_service.get_insights(db, current_user.id)
    return {"insights": insights}
