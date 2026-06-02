from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from app.core.database import engine, Base
from app.core.config import settings
from app.api.routes import auth, admin, tests, bookmarks, checklist
import os

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
    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
    await redis.ping()
    FastAPICache.init(RedisBackend(redis), prefix="gateprep-cache")

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
