from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    auth, accounts, dashboard, categories, incomes, expenses,
    credit_cards, credit_card_purchases, invoices,
    transfers, recurring, budgets, payables,
    goals, calendar, search, reports, insights,
)

settings = get_settings()

app = FastAPI(
    title="Fingest API",
    description="API do sistema de gestão financeira pessoal Fingest",
    version="1.0.0",
)

origins = [o.strip() for o in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(incomes.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(credit_cards.router, prefix="/api")
app.include_router(credit_card_purchases.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(transfers.router, prefix="/api")
app.include_router(recurring.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(payables.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(insights.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok"}
