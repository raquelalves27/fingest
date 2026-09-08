from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError, NotFoundError
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token, decode_token
)
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, ChangePasswordRequest


def register_user(db: Session, payload: UserRegister) -> User:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise ConflictError("Já existe uma conta com este e-mail")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, payload: UserLogin) -> User:
    user = db.query(User).filter(User.email == payload.email, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise UnauthorizedError("E-mail ou senha inválidos")
    return user


def issue_tokens(user: User) -> tuple[str, str]:
    return create_access_token(user.id), create_refresh_token(user.id)


def refresh_access_token(db: Session, refresh_token: str) -> tuple[str, str]:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Refresh token inválido ou expirado")

    user = db.query(User).filter(User.id == payload.get("sub"), User.is_active.is_(True)).first()
    if not user:
        raise UnauthorizedError("Usuário não encontrado")

    return issue_tokens(user)


def change_password(db: Session, user: User, payload: ChangePasswordRequest) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise UnauthorizedError("Senha atual incorreta")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
