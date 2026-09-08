import enum

from sqlalchemy import Column, String, Numeric, ForeignKey, Enum, Date, Text
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUIDPKMixin, TimestampMixin, SoftDeleteMixin


class IncomeStatus(str, enum.Enum):
    expected = "expected"
    received = "received"
    late = "late"
    cancelled = "cancelled"


class Income(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "incomes"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(CHAR(36), ForeignKey("accounts.id"), nullable=True, index=True)
    category_id = Column(CHAR(36), ForeignKey("categories.id"), nullable=True)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    income_date = Column(Date, nullable=False)
    status = Column(Enum(IncomeStatus), nullable=False, default=IncomeStatus.expected)
    recurring_transaction_id = Column(CHAR(36), ForeignKey("recurring_transactions.id"), nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="incomes")
    account = relationship("Account")


class ExpenseStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    late = "late"
    cancelled = "cancelled"


class Expense(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "expenses"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(CHAR(36), ForeignKey("accounts.id"), nullable=True, index=True)
    category_id = Column(CHAR(36), ForeignKey("categories.id"), nullable=True)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    expense_date = Column(Date, nullable=False)
    payment_method = Column(String(50), nullable=True)
    status = Column(Enum(ExpenseStatus), nullable=False, default=ExpenseStatus.pending)
    recurring_transaction_id = Column(CHAR(36), ForeignKey("recurring_transactions.id"), nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="expenses")
    account = relationship("Account")
