import enum

from sqlalchemy import Column, String, Numeric, Boolean, ForeignKey, Enum, Date, DateTime, func
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUIDPKMixin, TimestampMixin, SoftDeleteMixin


class AccountType(str, enum.Enum):
    checking = "checking"
    savings = "savings"
    wallet = "wallet"
    investment = "investment"
    cash = "cash"


class Account(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "accounts"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    bank = Column(String(120), nullable=True)
    type = Column(Enum(AccountType), nullable=False, default=AccountType.checking)
    initial_balance = Column(Numeric(14, 2), nullable=False, default=0)
    color = Column(String(20), nullable=True)
    icon = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    user = relationship("User", back_populates="accounts")
    transactions = relationship(
        "AccountTransaction", back_populates="account", cascade="all, delete-orphan"
    )


class AccountTransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"
    transfer_in = "transfer_in"
    transfer_out = "transfer_out"
    invoice_payment = "invoice_payment"
    adjustment = "adjustment"


class AccountTransaction(Base, UUIDPKMixin):
    """Ledger: fonte única de verdade do saldo de uma conta.
    Nunca editado diretamente pelo usuário — sempre gerado por um service
    a partir de um evento (receita recebida, despesa paga, transferência, etc.)
    """

    __tablename__ = "account_transactions"

    account_id = Column(CHAR(36), ForeignKey("accounts.id"), nullable=False, index=True)
    amount = Column(Numeric(14, 2), nullable=False)  # positivo = entrada, negativo = saída
    type = Column(Enum(AccountTransactionType), nullable=False)
    reference_type = Column(String(50), nullable=True)  # "income" | "expense" | "transfer" | "invoice"
    reference_id = Column(CHAR(36), nullable=True)
    description = Column(String(255), nullable=True)
    transaction_date = Column(Date, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    account = relationship("Account", back_populates="transactions")
