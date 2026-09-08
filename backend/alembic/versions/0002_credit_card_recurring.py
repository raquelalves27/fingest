"""recorrência em compras no cartão

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-07

Adiciona os campos que transformam uma compra no cartão em uma recorrência
mensal (ex: assinatura da Netflix): a compra vira um "template" que acumula
uma parcela por mês até ser pausada (recurring_active=False) ou cancelada.
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "credit_card_purchases",
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "credit_card_purchases",
        sa.Column("recurring_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "credit_card_purchases",
        sa.Column("recurring_day", sa.Integer(), nullable=True),
    )
    op.add_column(
        "credit_card_purchases",
        sa.Column("recurring_next_date", sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("credit_card_purchases", "recurring_next_date")
    op.drop_column("credit_card_purchases", "recurring_day")
    op.drop_column("credit_card_purchases", "recurring_active")
    op.drop_column("credit_card_purchases", "is_recurring")
