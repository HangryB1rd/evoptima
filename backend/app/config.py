import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "EVOptima API")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./evoptima.db")
    YMAPS_API_KEY: str = os.getenv("YMAPS_API_KEY", "")
    OPENCHARGEMAP_API_KEY: str = os.getenv("OPENCHARGEMAP_API_KEY", "")
    OPENCHARGEMAP_USER_AGENT: str = os.getenv("OPENCHARGEMAP_USER_AGENT", "EVOptima/1.0")
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5500")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

@lru_cache
def get_settings() -> Settings:
    return Settings()
