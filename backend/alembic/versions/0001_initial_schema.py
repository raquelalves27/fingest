"""schema inicial completo

Revision ID: 0001
Revises:
Create Date: 2026-09-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(190), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_users_email", "users", ["email"])

    # --- accounts ---
    op.create_table(
        "accounts",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("bank", sa.String(120), nullable=True),
        sa.Column(
            "type",
            sa.Enum("checking", "savings", "wallet", "investment", "cash", name="accounttype"),
            nullable=False,
        ),
        sa.Column("initial_balance", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])

    # --- account_transactions (ledger) ---
    op.create_table(
        "account_transactions",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("account_id", sa.CHAR(36), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "income", "expense", "transfer_in", "transfer_out",
                "invoice_payment", "adjustment", name="accounttransactiontype"
            ),
            nullable=False,
        ),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", sa.CHAR(36), nullable=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("transaction_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_account_transactions_account_id", "account_transactions", ["account_id"])
    op.create_index(
        "ix_account_transactions_reference", "account_transactions", ["reference_type", "reference_id"]
    )

    # --- categories (self-referencing) ---
    op.create_table(
        "categories",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("parent_id", sa.CHAR(36), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("type", sa.Enum("income", "expense", name="categorytype"), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"])
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"])

    # --- credit_cards ---
    op.create_table(
        "credit_cards",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("bank", sa.String(120), nullable=True),
        sa.Column("brand", sa.String(50), nullable=True),
        sa.Column("credit_limit", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("closing_day", sa.Integer, nullable=False),
        sa.Column("due_day", sa.Integer, nullable=False),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("last_four_digits", sa.String(4), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_credit_cards_user_id", "credit_cards", ["user_id"])

    # --- credit_card_invoices ---
    op.create_table(
        "credit_card_invoices",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("credit_card_id", sa.CHAR(36), sa.ForeignKey("credit_cards.id"), nullable=False),
        sa.Column("reference_month", sa.Integer, nullable=False),
        sa.Column("reference_year", sa.Integer, nullable=False),
        sa.Column("closing_date", sa.Date, nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column(
            "status", sa.Enum("open", "closed", "paid", name="invoicestatus"),
            nullable=False, server_default="open"
        ),
        sa.Column("paid_at", sa.Date, nullable=True),
        sa.Column("paid_from_account_id", sa.CHAR(36), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint(
            "credit_card_id", "reference_month", "reference_year", name="uq_invoice_period"
        ),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_credit_card_invoices_credit_card_id", "credit_card_invoices", ["credit_card_id"])

    # --- credit_card_purchases ---
    op.create_table(
        "credit_card_purchases",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("credit_card_id", sa.CHAR(36), sa.ForeignKey("credit_cards.id"), nullable=False),
        sa.Column("category_id", sa.CHAR(36), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("total_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("purchase_date", sa.Date, nullable=False),
        sa.Column("installments_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "status", sa.Enum("active", "cancelled", name="purchasestatus"),
            nullable=False, server_default="active"
        ),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_credit_card_purchases_credit_card_id", "credit_card_purchases", ["credit_card_id"])

    # --- credit_card_installments ---
    op.create_table(
        "credit_card_installments",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("purchase_id", sa.CHAR(36), sa.ForeignKey("credit_card_purchases.id"), nullable=False),
        sa.Column("invoice_id", sa.CHAR(36), sa.ForeignKey("credit_card_invoices.id"), nullable=False),
        sa.Column("installment_number", sa.Integer, nullable=False),
        sa.Column("total_installments", sa.Integer, nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column(
            "status", sa.Enum("pending", "paid", "cancelled", name="installmentstatus"),
            nullable=False, server_default="pending"
        ),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_credit_card_installments_purchase_id", "credit_card_installments", ["purchase_id"])
    op.create_index("ix_credit_card_installments_invoice_id", "credit_card_installments", ["invoice_id"])

    # --- incomes ---
    op.create_table(
        "incomes",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("account_id", sa.CHAR(36), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("category_id", sa.CHAR(36), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("income_date", sa.Date, nullable=False),
        sa.Column(
            "status", sa.Enum("expected", "received", "late", "cancelled", name="incomestatus"),
            nullable=False, server_default="expected"
        ),
        sa.Column("recurring_transaction_id", sa.CHAR(36), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_incomes_user_id", "incomes", ["user_id"])
    op.create_index("ix_incomes_account_id", "incomes", ["account_id"])

    # --- expenses ---
    op.create_table(
        "expenses",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("account_id", sa.CHAR(36), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("category_id", sa.CHAR(36), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("expense_date", sa.Date, nullable=False),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column(
            "status", sa.Enum("pending", "paid", "late", "cancelled", name="expensestatus"),
            nullable=False, server_default="pending"
        ),
        sa.Column("recurring_transaction_id", sa.CHAR(36), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_expenses_user_id", "expenses", ["user_id"])
    op.create_index("ix_expenses_account_id", "expenses", ["account_id"])

    # --- transfers ---
    op.create_table(
        "transfers",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("from_account_id", sa.CHAR(36), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("to_account_id", sa.CHAR(36), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("transfer_date", sa.Date, nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_transfers_user_id", "transfers", ["user_id"])

    # --- recurring_transactions ---
    op.create_table(
        "recurring_transactions",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("category_id", sa.CHAR(36), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("account_id", sa.CHAR(36), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column(
            "frequency", sa.Enum("monthly", "weekly", "yearly", "custom", name="recurrencefrequency"),
            nullable=False, server_default="monthly"
        ),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("next_occurrence_date", sa.Date, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_recurring_transactions_user_id", "recurring_transactions", ["user_id"])

    # --- budgets ---
    op.create_table(
        "budgets",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reference_month", sa.Integer, nullable=False),
        sa.Column("reference_year", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_budgets_user_id", "budgets", ["user_id"])

    # --- budget_categories ---
    op.create_table(
        "budget_categories",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("budget_id", sa.CHAR(36), sa.ForeignKey("budgets.id"), nullable=False),
        sa.Column("category_id", sa.CHAR(36), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("planned_amount", sa.Numeric(14, 2), nullable=False),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_budget_categories_budget_id", "budget_categories", ["budget_id"])

    # --- financial_goals ---
    op.create_table(
        "financial_goals",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("target_date", sa.Date, nullable=True),
        sa.Column(
            "status", sa.Enum("active", "completed", "cancelled", name="goalstatus"),
            nullable=False, server_default="active"
        ),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_financial_goals_user_id", "financial_goals", ["user_id"])

    # --- goal_contributions ---
    op.create_table(
        "goal_contributions",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("goal_id", sa.CHAR(36), sa.ForeignKey("financial_goals.id"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("contribution_date", sa.Date, nullable=False),
        sa.Column("account_id", sa.CHAR(36), sa.ForeignKey("accounts.id"), nullable=True),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_goal_contributions_goal_id", "goal_contributions", ["goal_id"])

    # --- notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("related_entity_type", sa.String(50), nullable=True),
        sa.Column("related_entity_id", sa.CHAR(36), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    # --- audit_logs ---
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.CHAR(36), nullable=False),
        sa.Column("changes", mysql.JSON, nullable=True),
        sa.Column("created_at", sa.String(30), nullable=False),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("notifications")
    op.drop_table("goal_contributions")
    op.drop_table("financial_goals")
    op.drop_table("budget_categories")
    op.drop_table("budgets")
    op.drop_table("recurring_transactions")
    op.drop_table("transfers")
    op.drop_table("expenses")
    op.drop_table("incomes")
    op.drop_table("credit_card_installments")
    op.drop_table("credit_card_purchases")
    op.drop_table("credit_card_invoices")
    op.drop_table("credit_cards")
    op.drop_table("categories")
    op.drop_table("account_transactions")
    op.drop_table("accounts")
    op.drop_table("users")
