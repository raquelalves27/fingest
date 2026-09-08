import enum

from sqlalchemy import (
    Column, String, Numeric, Boolean, ForeignKey, Enum, Integer, Date, UniqueConstraint
)
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUIDPKMixin, TimestampMixin, SoftDeleteMixin


class CreditCard(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "credit_cards"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    bank = Column(String(120), nullable=True)
    brand = Column(String(50), nullable=True)
    credit_limit = Column(Numeric(14, 2), nullable=False, default=0)
    closing_day = Column(Integer, nullable=False)  # 1-31
    due_day = Column(Integer, nullable=False)  # 1-31
    color = Column(String(20), nullable=True)
    last_four_digits = Column(String(4), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    user = relationship("User", back_populates="credit_cards")
    invoices = relationship("CreditCardInvoice", back_populates="credit_card", cascade="all, delete-orphan")
    purchases = relationship("CreditCardPurchase", back_populates="credit_card", cascade="all, delete-orphan")


class InvoiceStatus(str, enum.Enum):
    open = "open"
    closed = "closed"
    paid = "paid"


class CreditCardInvoice(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "credit_card_invoices"
    __table_args__ = (
        UniqueConstraint("credit_card_id", "reference_month", "reference_year", name="uq_invoice_period"),
    )

    credit_card_id = Column(CHAR(36), ForeignKey("credit_cards.id"), nullable=False, index=True)
    reference_month = Column(Integer, nullable=False)
    reference_year = Column(Integer, nullable=False)
    closing_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.open)
    paid_at = Column(Date, nullable=True)
    paid_from_account_id = Column(CHAR(36), ForeignKey("accounts.id"), nullable=True)

    credit_card = relationship("CreditCard", back_populates="invoices")
    installments = relationship("CreditCardInstallment", back_populates="invoice")


class PurchaseStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"


class CreditCardPurchase(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "credit_card_purchases"

    credit_card_id = Column(CHAR(36), ForeignKey("credit_cards.id"), nullable=False, index=True)
    category_id = Column(CHAR(36), ForeignKey("categories.id"), nullable=True)
    description = Column(String(255), nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)
    purchase_date = Column(Date, nullable=False)
    installments_count = Column(Integer, nullable=False, default=1)
    status = Column(Enum(PurchaseStatus), nullable=False, default=PurchaseStatus.active)

    credit_card = relationship("CreditCard", back_populates="purchases")
    installments = relationship(
        "CreditCardInstallment", back_populates="purchase", cascade="all, delete-orphan"
    )


class InstallmentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"


class CreditCardInstallment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "credit_card_installments"

    purchase_id = Column(CHAR(36), ForeignKey("credit_card_purchases.id"), nullable=False, index=True)
    invoice_id = Column(CHAR(36), ForeignKey("credit_card_invoices.id"), nullable=False, index=True)
    installment_number = Column(Integer, nullable=False)
    total_installments = Column(Integer, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    status = Column(Enum(InstallmentStatus), nullable=False, default=InstallmentStatus.pending)

    purchase = relationship("CreditCardPurchase", back_populates="installments")
    invoice = relationship("CreditCardInvoice", back_populates="installments")
