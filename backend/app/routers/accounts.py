from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.services import account_service

router = APIRouter(prefix="/accounts", tags=["Contas"])


@router.get("", response_model=list[AccountResponse])
def list_accounts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = account_service.list_accounts(db, current_user.id)
    return [account_service.account_with_balance(db, a) for a in accounts]


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = account_service.create_account(db, current_user.id, payload)
    return account_service.account_with_balance(db, account)


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    account = account_service.get_account(db, current_user.id, account_id)
    return account_service.account_with_balance(db, account)


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: str,
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = account_service.update_account(db, current_user.id, account_id, payload)
    return account_service.account_with_balance(db, account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    account_service.delete_account(db, current_user.id, account_id)
