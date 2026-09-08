from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ConflictError
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def list_categories(db: Session, user_id: str) -> list[Category]:
    return (
        db.query(Category)
        .filter(Category.user_id == user_id, Category.deleted_at.is_(None))
        .order_by(Category.name.asc())
        .all()
    )


def get_category(db: Session, user_id: str, category_id: str) -> Category:
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == user_id, Category.deleted_at.is_(None))
        .first()
    )
    if not category:
        raise NotFoundError("Categoria não encontrada")
    return category


def create_category(db: Session, user_id: str, payload: CategoryCreate) -> Category:
    if payload.parent_id:
        # valida que o pai existe, pertence ao usuário e é do mesmo tipo
        parent = get_category(db, user_id, payload.parent_id)
        if parent.type != payload.type:
            raise ConflictError("A subcategoria deve ter o mesmo tipo da categoria pai")

    category = Category(
        user_id=user_id,
        parent_id=payload.parent_id,
        name=payload.name,
        type=payload.type,
        icon=payload.icon,
        color=payload.color,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, user_id: str, category_id: str, payload: CategoryUpdate) -> Category:
    category = get_category(db, user_id, category_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, user_id: str, category_id: str) -> None:
    category = get_category(db, user_id, category_id)
    category.deleted_at = date.today()
    db.commit()
