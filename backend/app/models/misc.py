import enum

from sqlalchemy import (
    Column, String, Numeric, Boolean, ForeignKey, Enum, Integer, Date, Text, JSON
)
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUIDPKMixin, TimestampMixin


class Transfer(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "transfers"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    from_account_id = Column(CHAR(36), ForeignKey("accounts.id"), nullable=False)
    to_account_id = Column(CHAR(36), ForeignKey("accounts.id"), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    transfer_date = Column(Date, nullable=False)
    description = Column(String(255), nullable=True)


class RecurrenceFrequency(str, enum.Enum):
    monthly = "monthly"
    weekly = "weekly"
    yearly = "yearly"
    custom = "custom"


class RecurringTransaction(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "recurring_transactions"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(10), nullable=False)  # income | expense
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    category_id = Column(CHAR(36), ForeignKey("categories.id"), nullable=True)
    account_id = Column(CHAR(36), ForeignKey("accounts.id"), nullable=True)
    frequency = Column(Enum(RecurrenceFrequency), nullable=False, default=RecurrenceFrequency.monthly)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    next_occurrence_date = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class Budget(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "budgets"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    reference_month = Column(Integer, nullable=False)
    reference_year = Column(Integer, nullable=False)

    categories = relationship("BudgetCategory", back_populates="budget", cascade="all, delete-orphan")


class BudgetCategory(Base, UUIDPKMixin):
    __tablename__ = "budget_categories"

    budget_id = Column(CHAR(36), ForeignKey("budgets.id"), nullable=False, index=True)
    category_id = Column(CHAR(36), ForeignKey("categories.id"), nullable=False)
    planned_amount = Column(Numeric(14, 2), nullable=False)

    budget = relationship("Budget", back_populates="categories")


class GoalStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class FinancialGoal(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "financial_goals"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    target_amount = Column(Numeric(14, 2), nullable=False)
    target_date = Column(Date, nullable=True)
    status = Column(Enum(GoalStatus), nullable=False, default=GoalStatus.active)

    contributions = relationship("GoalContribution", back_populates="goal", cascade="all, delete-orphan")


class GoalContribution(Base, UUIDPKMixin):
    __tablename__ = "goal_contributions"

    goal_id = Column(CHAR(36), ForeignKey("financial_goals.id"), nullable=False, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    contribution_date = Column(Date, nullable=False)
    account_id = Column(CHAR(36), ForeignKey("accounts.id"), nullable=True)

    goal = relationship("FinancialGoal", back_populates="contributions")


class Notification(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(CHAR(36), nullable=True)


class AuditLog(Base, UUIDPKMixin):
    __tablename__ = "audit_logs"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(20), nullable=False)  # create|update|delete|pay|reverse
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(CHAR(36), nullable=False)
    changes = Column(JSON, nullable=True)
    created_at = Column(String(30), nullable=False)  # set explicitly by service (ISO string) for simplicity
