from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://fingest:fingest@mysql:3306/fingest"
    jwt_secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 dia
    refresh_token_expire_days: int = 30
    cors_origins: str = "http://localhost:5173"
    timezone: str = "America/Fortaleza"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
