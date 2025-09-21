import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Loads and validates application settings from environment variables."""
    google_cloud_project: str 
    google_cloud_location: str
    docai_processor_id: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()