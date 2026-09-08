from pydantic import BaseModel


class Insight(BaseModel):
    text: str


class InsightsResponse(BaseModel):
    insights: list[Insight]
