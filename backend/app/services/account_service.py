from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.account import Account, AccountTransactionType
from app.schemas.account import AccountCreate, AccountUpdate
from app.services import balance_service


def list_accounts(db: Session, user_id: str) -> list[Account]:
    return (
        db.query(Account)
        .filter(Account.user_id == user_id, Account.deleted_at.is_(None))
        .order_by(Account.created_at.asc())
        .all()
    )


def get_account(db: Session, user_id: str, account_id: str) -> Account:
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == user_id, Account.deleted_at.is_(None))
        .first()
    )
    if not account:
        raise NotFoundError("Conta não encontrada")
    return account


def create_account(db: Session, user_id: str, payload: AccountCreate) -> Account:
    account = Account(
        user_id=user_id,
        name=payload.name,
        bank=payload.bank,
        type=payload.type,
        initial_balance=payload.initial_balance,
        color=payload.color,
        icon=payload.icon,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(db: Session, user_id: str, account_id: str, payload: AccountUpdate) -> Account:
    account = get_account(db, user_id, account_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, user_id: str, account_id: str) -> None:
    account = get_account(db, user_id, account_id)
    account.deleted_at = date.today()
    account.is_active = False
    db.commit()


def account_with_balance(db: Session, account: Account) -> dict:
    return {
        "id": account.id,
        "name": account.name,
        "bank": account.bank,
        "type": account.type,
        "initial_balance": account.initial_balance,
        "current_balance": balance_service.get_account_balance(db, account.id),
        "color": account.color,
        "icon": account.icon,
        "is_active": account.is_active,
    }
