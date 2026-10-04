from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    agent_port: int = Field(default=8000, ge=1, le=65535)
    agent_service_token: SecretStr = SecretStr("")
    llm_api_key: SecretStr = SecretStr("")
    llm_model: str = ""
    llm_api_url: str = ""
    llm_max_tokens: int = Field(default=4096, ge=256, le=16000)
    app_url: str = "http://127.0.0.1:5173"

