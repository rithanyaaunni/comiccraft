"""
FastAPI route handlers for ComicCraft.
Provides both HTML Jinja2 template views and JSON REST APIs.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Request, Form, Query, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, FileResponse
from fastapi.templating import Jinja2Templates

from .config import settings
from .schemas import (
    StoryGenerationRequest,
    ComicResponse,
    HealthResponse,
)
from .layout_builder import build_comic_pipeline
from .image_generator import get_image_generator

logger = logging.getLogger(__name__)

router = APIRouter()
templates = Jinja2Templates(directory=str(settings.base_dir / "templates"))


@router.get("/", response_class=HTMLResponse, summary="Home Page")
async def get_home_page(request: Request):
    """
    Renders the ComicCraft homepage with the creation form and hero section.
    """
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "mock_mode": settings.mock_mode,
            "default_prompt": "A brave fox explores an enchanted forest and discovers a hidden magical city.",
            "default_character": "Luna",
        }
    )


@router.post("/generate", response_class=HTMLResponse, summary="Form-based Comic Generation")
async def generate_comic_form(
    request: Request,
    story_prompt: str = Form(..., min_length=5, max_length=2000),
    character_name: str = Form(..., min_length=1, max_length=100),
    setting: str = Form(...),
    tone: str = Form(...),
    art_style: str = Form(...),
):
    """
    Handles form submission from the home page, executes the 5-panel comic generation,
    and returns the rich comic preview page.
    """
    try:
        req_obj = StoryGenerationRequest(
            story_prompt=story_prompt,
            character_name=character_name,
            setting=setting,
            tone=tone,
            art_style=art_style
        )
        response_data = build_comic_pipeline(req_obj)

        return templates.TemplateResponse(
            "comic_preview.html",
            {
                "request": request,
                "comic": response_data,
                "mock_mode": settings.mock_mode
            }
        )
    except Exception as exc:
        logger.error("Error generating comic via form: %s", exc, exc_info=True)
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "error_message": f"Unable to generate comic: {str(exc)}",
                "mock_mode": settings.mock_mode,
                "story_prompt": story_prompt,
                "character_name": character_name,
                "setting": setting,
                "tone": tone,
                "art_style": art_style,
            },
            status_code=status.HTTP_400_BAD_REQUEST
        )


@router.post("/generate-comic/json", response_model=ComicResponse, summary="JSON REST API for Comic Creation")
async def generate_comic_json(req: StoryGenerationRequest):
    """
    REST API endpoint for programmatic comic creation.
    Returns structured panels, dialogue, visual prompts, and PDF export URL.
    """
    try:
        return build_comic_pipeline(req)
    except Exception as exc:
        logger.error("JSON comic generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comic creation pipeline error: {str(exc)}"
        )


@router.get("/test-image", summary="Test Image Generation")
async def test_image_generation(
    request: Request,
    prompt: Optional[str] = Query(
        "A brave explorer discovering glowing ancient ruins, cinematic lighting, comic book style",
        description="Text prompt for the test illustration"
    )
):
    """
    Test endpoint for generating a single comic illustration using the configured image backend.
    """
    try:
        generator = get_image_generator()
        image_url = generator.generate_image(prompt=prompt, panel_number=1, panel_title="Test Panel")
        return {
            "status": "success",
            "prompt": prompt,
            "image_url": image_url,
            "backend": settings.image_backend,
            "mock_mode": settings.mock_mode
        }
    except Exception as exc:
        logger.error("Test image generation failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("/export-success", response_class=HTMLResponse, summary="PDF Export Success Page")
async def export_success_page(
    request: Request,
    pdf_url: Optional[str] = Query(None, description="Path to the exported PDF"),
    title: Optional[str] = Query("ComicCraft Story", description="Title of the comic")
):
    """
    Renders confirmation view when PDF is ready for reading and downloading.
    """
    return templates.TemplateResponse(
        "export_success.html",
        {
            "request": request,
            "pdf_url": pdf_url or "#",
            "title": title
        }
    )


@router.get("/health", response_model=HealthResponse, summary="System Health Status")
async def health_check():
    """
    Returns service health and configuration status.
    """
    return HealthResponse(
        status="ok",
        application="ComicCraft",
        version="1.0.0",
        mock_mode=settings.mock_mode
    )
