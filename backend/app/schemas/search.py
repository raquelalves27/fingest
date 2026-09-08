from pydantic import BaseModel


class SearchResultItem(BaseModel):
    type: str  # "income" | "expense" | "purchase" | "account" | "credit_card"
    id: str
    title: str
    subtitle: str


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
