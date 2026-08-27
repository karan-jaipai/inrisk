import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.weather import router as weather_router
from app.core.config import get_settings
from app.core.errors import AppError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("weather_explorer")

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Weather Explorer API starting in '%s' environment", settings.environment)
    yield


app = FastAPI(
    title="Weather Explorer API",
    description="Fetches historical weather from Open-Meteo and stores raw responses in S3.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    logger.warning("Application error: %s", exc.message)
    body = {"status": "error", "message": exc.message}
    return JSONResponse(status_code=exc.status_code, content=body)


app.include_router(weather_router)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Basic liveness check, useful for local dev and post-deploy smoke tests."""
    return {"status": "ok", "environment": settings.environment}
