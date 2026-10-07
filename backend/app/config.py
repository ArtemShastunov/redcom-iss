from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    secret_key: str
    cookie_secure: bool = False
    session_max_age_seconds: int = 60 * 60 * 12


settings = Settings()
