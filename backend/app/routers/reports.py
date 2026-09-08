from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.reports import ReportResponse
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Relatórios"])


@router.get("", response_model=ReportResponse)
def get_report(
    months: int = Query(default=12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return report_service.get_full_report(db, current_user.id, months)


@router.get("/export/expenses.csv")
def export_expenses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    csv_content = report_service.export_expenses_csv(db, current_user.id)
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=despesas.csv"},
    )
