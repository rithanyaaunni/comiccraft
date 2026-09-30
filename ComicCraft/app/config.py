"""
Configuration settings for ComicCraft using Pydantic Settings.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Gemini AI configuration
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_flash_model: str = os.getenv("GEMINI_FLASH_MODEL", "gemini-2.5-flash")
    gemini_pro_model: str = os.getenv("GEMINI_PRO_MODEL", "gemini-2.5-pro")

    # Image generation configuration
    image_backend: str = os.getenv("IMAGE_BACKEND", "huggingface")  # 'huggingface' or 'local'
    hf_token: str = os.getenv("HF_TOKEN", "")
    hf_image_model: str = os.getenv("HF_IMAGE_MODEL", "black-forest-labs/FLUX.1-schnell")

    # Mock mode flag
    mock_mode: bool = os.getenv("MOCK_MODE", "true").lower() in ("true", "1", "yes")

    # Storage paths
    base_dir: Path = Path(__file__).resolve().parent.parent
    static_dir: Path = Path(__file__).resolve().parent.parent / "static"
    panels_dir: Path = Path(__file__).resolve().parent.parent / "static" / "panels"
    exports_dir: Path = Path(__file__).resolve().parent.parent / "static" / "exports"

    # Server settings
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def init_dirs(self) -> None:
        """Ensure all required media and output directories exist."""
        self.panels_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.init_dirs()
