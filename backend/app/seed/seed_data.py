"""Popula o banco com um usuário de demonstração e alguns dados realistas.

Uso:
    python -m app.seed.seed_data
"""
from datetime import date, timedelta
from decimal import Decimal

from app.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.account import Account, AccountType, AccountTransactionType
from app.models.category import Category, CategoryType
from app.models.transaction import Income, Expense, IncomeStatus, ExpenseStatus
from app.models.credit_card import CreditCard
from app.models.misc import RecurrenceFrequency
from app.schemas.credit_card_purchase import CreditCardPurchaseCreate
from app.schemas.recurring import RecurringTransactionCreate
from app.schemas.goal import GoalCreate, ContributionCreate
from app.schemas.budget import BudgetSetRequest, BudgetCategoryInput
from app.services import balance_service, purchase_service, recurring_service, goal_service, budget_service

DEMO_EMAIL = "demo@fingest.app"
DEMO_PASSWORD = "demo12345"


def run():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing:
            print(f"Usuário demo já existe ({DEMO_EMAIL}). Nada a fazer.")
            return

        user = User(name="Usuário Demo", email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD))
        db.add(user)
        db.commit()
        db.refresh(user)

        nubank = Account(
            user_id=user.id, name="Nubank", bank="Nubank", type=AccountType.checking,
            initial_balance=Decimal("2500.00"), color="#8A05BE", icon="wallet",
        )
        carteira = Account(
            user_id=user.id, name="Carteira", type=AccountType.cash,
            initial_balance=Decimal("150.00"), color="#22C55E", icon="banknote",
        )
        db.add_all([nubank, carteira])
        db.commit()

        categorias_despesa = [
            Category(user_id=user.id, name="Alimentação", type=CategoryType.expense, color="#F97316", icon="utensils"),
            Category(user_id=user.id, name="Moradia", type=CategoryType.expense, color="#3B82F6", icon="home"),
            Category(user_id=user.id, name="Transporte", type=CategoryType.expense, color="#EAB308", icon="car"),
            Category(user_id=user.id, name="Lazer", type=CategoryType.expense, color="#EC4899", icon="party-popper"),
        ]
        categoria_salario = Category(user_id=user.id, name="Salário", type=CategoryType.income, color="#22C55E", icon="briefcase")
        db.add_all(categorias_despesa + [categoria_salario])
        db.commit()

        today = date.today()

        income = Income(
            user_id=user.id, account_id=nubank.id, category_id=categoria_salario.id,
            description="Salário", amount=Decimal("6500.00"),
            income_date=today.replace(day=5), status=IncomeStatus.received,
        )
        db.add(income)
        db.commit()
        balance_service.record_transaction(
            db, account_id=nubank.id, amount=Decimal("6500.00"),
            type=AccountTransactionType.income, transaction_date=income.income_date,
            reference_type="income", reference_id=income.id, description="Salário",
        )
        db.commit()

        expenses_data = [
            ("Supermercado", Decimal("480.00"), categorias_despesa[0], nubank, 3),
            ("Aluguel", Decimal("1800.00"), categorias_despesa[1], nubank, 5),
            ("Uber", Decimal("65.00"), categorias_despesa[2], carteira, 2),
            ("Cinema", Decimal("90.00"), categorias_despesa[3], nubank, 7),
        ]
        for desc, amount, category, account, days_ago in expenses_data:
            exp_date = today - timedelta(days=days_ago)
            expense = Expense(
                user_id=user.id, account_id=account.id, category_id=category.id,
                description=desc, amount=amount, expense_date=exp_date, status=ExpenseStatus.paid,
            )
            db.add(expense)
            db.commit()
            balance_service.record_transaction(
                db, account_id=account.id, amount=-amount,
                type=AccountTransactionType.expense, transaction_date=exp_date,
                reference_type="expense", reference_id=expense.id, description=desc,
            )
            db.commit()

        print(f"Seed concluído. Login: {DEMO_EMAIL} / senha: {DEMO_PASSWORD}")

        # --- Cartão de crédito com compra parcelada e uma à vista (Fase 3) ---
        card = CreditCard(
            user_id=user.id, name="Nubank Cartão", bank="Nubank", brand="Mastercard",
            credit_limit=Decimal("8000.00"), closing_day=10, due_day=17,
            color="#8A05BE", last_four_digits="4321",
        )
        db.add(card)
        db.commit()
        db.refresh(card)

        purchase_service.create_purchase(db, user.id, CreditCardPurchaseCreate(
            credit_card_id=card.id,
            category_id=categorias_despesa[3].id,  # Lazer
            description="Notebook",
            total_amount=Decimal("4800.00"),
            purchase_date=today.replace(day=5) if today.day >= 5 else today,
            installments_count=12,
        ))
        purchase_service.create_purchase(db, user.id, CreditCardPurchaseCreate(
            credit_card_id=card.id,
            category_id=categorias_despesa[0].id,  # Alimentação
            description="Restaurante",
            total_amount=Decimal("120.00"),
            purchase_date=today,
            installments_count=1,
        ))

        print("Cartão de demonstração criado com uma compra parcelada e uma à vista.")

        # --- Recorrência (Fase 4): assinatura mensal ---
        recurring_service.create_recurring(db, user.id, RecurringTransactionCreate(
            type="expense", description="Spotify", amount=Decimal("21.90"),
            category_id=categorias_despesa[3].id, account_id=nubank.id,
            frequency=RecurrenceFrequency.monthly,
            start_date=today.replace(day=1) if today.day >= 1 else today,
        ))

        # --- Orçamento (Fase 4): teto mensal para Alimentação e Lazer ---
        budget_service.set_budget(db, user.id, BudgetSetRequest(
            reference_month=today.month, reference_year=today.year,
            categories=[
                BudgetCategoryInput(category_id=categorias_despesa[0].id, planned_amount=Decimal("1000.00")),
                BudgetCategoryInput(category_id=categorias_despesa[3].id, planned_amount=Decimal("500.00")),
            ],
        ))

        # --- Meta financeira (Fase 5): exemplo do próprio escopo do projeto ---
        goal = goal_service.create_goal(db, user.id, GoalCreate(
            name="Viagem para Europa", target_amount=Decimal("15000.00"), target_date=date(today.year + 1, 6, 30),
        ))
        goal_service.add_contribution(db, user.id, goal.id, ContributionCreate(
            amount=Decimal("6500.00"), contribution_date=today,
        ))

        print("Recorrência, orçamento e meta de demonstração criados.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
