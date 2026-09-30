"""
Main FastAPI application entry point for ComicCraft.
Configures middleware, static files mounting, templates, and API documentation.
"""

import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import router

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("comiccraft")

app = FastAPI(
    title="ComicCraft – AI Comic Story Creator",
    description="A multi-stage AI comic generator leveraging Gemini Flash for outlines, Gemini Pro for full narratives, and adaptable image backends.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for external API integrations or decoupled frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static asset directories
settings.init_dirs()
app.mount("/static", StaticFiles(directory=str(settings.static_dir)), name="static")

# Include routes
app.include_router(router)


@app.on_event("startup")
async def startup_event():
    settings.init_dirs()
    logger.info("=" * 60)
    logger.info("  ComicCraft AI Comic Creator started successfully!")
    logger.info("  - Mock Mode: %s", settings.mock_mode)
    logger.info("  - Gemini Flash: %s", settings.gemini_flash_model)
    logger.info("  - Gemini Pro: %s", settings.gemini_pro_model)
    logger.info("  - Image Backend: %s", settings.image_backend)
    logger.info("  - API Docs: http://%s:%s/docs", settings.host, settings.port)
    logger.info("=" * 60)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error processing request %s: %s", request.url.path, exc, exc_info=True)
    if "application/json" in request.headers.get("accept", "") or request.url.path.startswith("/generate-comic/json"):
        return JSONResponse(
            status_code=500,
            content={"success": False, "detail": "An internal error occurred while generating comic panels."}
        )
    # Let standard exception handling continue for browser views
    return JSONResponse(
        status_code=500,
        content={"error": "Comic generation error", "message": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
