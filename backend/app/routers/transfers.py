from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.transfer import TransferCreate, TransferResponse
from app.services import transfer_service

router = APIRouter(prefix="/transfers", tags=["Transferências"])


@router.get("", response_model=list[TransferResponse])
def list_transfers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return transfer_service.list_transfers(db, current_user.id)


@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    payload: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return transfer_service.create_transfer(db, current_user.id, payload)


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transfer(
    transfer_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    transfer_service.delete_transfer(db, current_user.id, transfer_id)
