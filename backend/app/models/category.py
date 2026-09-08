import enum

from sqlalchemy import Column, String, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUIDPKMixin, TimestampMixin, SoftDeleteMixin


class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"


class Category(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "categories"

    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    parent_id = Column(CHAR(36), ForeignKey("categories.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    type = Column(Enum(CategoryType), nullable=False)

    user = relationship("User", back_populates="categories")
    children = relationship("Category", backref="parent", remote_side="Category.id")
