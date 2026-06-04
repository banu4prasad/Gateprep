from pydantic_settings import BaseSettings
from pathlib import Path
import ipaddress
import re
from typing import List
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

PASSWORD_URL_ENCODING_MESSAGE = (
    "DATABASE_URL appears malformed. If your database password contains special "
    "characters, URL-encode the password before setting DATABASE_URL. Examples: "
    "@ -> %40, # -> %23, / -> %2F, : -> %3A, & -> %26, + -> %2B, % -> %25."
)

LOCAL_DATABASE_HOSTS = {"localhost", "db", "postgres", "host.docker.internal"}


def _is_remote_database_host(host: str | None) -> bool:
    if not host:
        return False

    clean_host = host.strip("[]").lower()
    if clean_host in LOCAL_DATABASE_HOSTS:
        return False

    try:
        ip = ipaddress.ip_address(clean_host)
    except ValueError:
        return True

    return not (ip.is_loopback or ip.is_private or ip.is_link_local)


def normalize_database_url(database_url: str) -> str:
    raw_url = (database_url or "").strip()
    if not raw_url:
        raise ValueError("DATABASE_URL is required.")

    if "[YOUR-PASSWORD]" in raw_url:
        raise ValueError(
            "DATABASE_URL still contains [YOUR-PASSWORD]. Replace it with your "
            "actual Supabase database password, URL-encoded if needed."
        )

    if re.search(r"%(?![0-9A-Fa-f]{2})", raw_url):
        raise ValueError(PASSWORD_URL_ENCODING_MESSAGE)

    if raw_url.startswith("postgresql://"):
        raw_url = "postgresql+psycopg2://" + raw_url[len("postgresql://"):]
    elif raw_url.startswith("postgres://"):
        raw_url = "postgresql+psycopg2://" + raw_url[len("postgres://"):]

    try:
        url = make_url(raw_url)
    except ArgumentError as exc:
        raise ValueError(PASSWORD_URL_ENCODING_MESSAGE) from exc

    if url.drivername.startswith("postgresql"):
        if url.host and "@" in url.host:
            raise ValueError(PASSWORD_URL_ENCODING_MESSAGE)

        if _is_remote_database_host(url.host):
            query = dict(url.query)
            query["sslmode"] = "require"
            url = url.set(query=query)

        return url.render_as_string(hide_password=False)

    return raw_url


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/gate_prep"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-production-32-chars-minimum"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173,https://gateprep6901.vercel.app"
    UPLOAD_DIR: str = "uploads"
    AUTH_COOKIE_NAME: str = "access_token"
    AUTH_COOKIE_SECURE: bool = True
    AUTH_COOKIE_SAMESITE: str = "none"
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    SMTP_EMAIL: str = ""
    SMTP_PASSWORD: str = ""
    OTP_EXPIRE_MINUTES: int = 10

    @property
    def cors_origins_list(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.DATABASE_URL)

    class Config:
        env_file = ".env"

settings = Settings()
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
