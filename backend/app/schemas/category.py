from typing import Optional

from pydantic import BaseModel, Field

from app.models.category import CategoryType


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    parent_id: Optional[str] = None
    type: CategoryType
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    parent_id: Optional[str]
    type: CategoryType
    icon: Optional[str]
    color: Optional[str]

    class Config:
        from_attributes = True
