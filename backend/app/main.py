import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.backends.redis import RedisBackend
from app.core.database import engine, Base
from app.core.config import settings
from app.api.routes import auth, admin, tests, bookmarks, checklist

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GATE Prep Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(tests.router)
app.include_router(bookmarks.router)
app.include_router(checklist.router)

if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.on_event("startup")
async def init_cache():
    try:
        redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
        await redis.ping()
        FastAPICache.init(RedisBackend(redis), prefix="gateprep-cache")
    except Exception as exc:
        if "localhost" not in settings.REDIS_URL and "127.0.0.1" not in settings.REDIS_URL:
            raise RuntimeError(f"Redis cache unavailable at REDIS_URL={settings.REDIS_URL}") from exc

        logger.warning(
            "Redis cache unavailable at %s; using in-memory cache. "
            "Set REDIS_URL to a reachable Redis instance for shared production caching.",
            settings.REDIS_URL,
        )
        FastAPICache.init(InMemoryBackend(), prefix="gateprep-cache")

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
