"""
Layout builder pipeline coordinating Flash outline, Pro story expansion,
panel image synthesis, and final comic layout compilation.
"""

import logging
from typing import Dict, Any
from .schemas import StoryGenerationRequest, ComicResponse, ComicStory
from .gemini_flash import generate_outline
from .gemini_pro import expand_story
from .image_generator import get_image_generator
from .exporters import generate_pdf

logger = logging.getLogger(__name__)


def build_comic_pipeline(req: StoryGenerationRequest) -> ComicResponse:
    """
    Executes the full comic generation pipeline:
    1. Gemini Flash -> 5-Panel Outline
    2. Gemini Pro -> Expanded Script (Narration, Dialogue, Captions, Visual Prompts)
    3. Image Generator -> 5 Panel Illustrations
    4. Layout Assembly
    5. PDF Export Generation
    """
    logger.info("Starting comic generation pipeline for character '%s' in '%s'", req.character_name, req.setting)

    # Step 1: 5-Panel Outline via Gemini Flash
    outline = generate_outline(req)
    logger.info("Generated 5-panel outline: '%s'", outline.title)

    # Step 2: Full Story expansion via Gemini Pro
    story: ComicStory = expand_story(outline, req)
    logger.info("Expanded story into 5 detailed panels with character consistency.")

    # Step 3: Panel Image Generation
    img_gen = get_image_generator()
    for panel in story.panels:
        try:
            image_url = img_gen.generate_image(
                prompt=panel.image_prompt,
                panel_number=panel.panel_number,
                panel_title=panel.title
            )
            panel.image_url = image_url
        except Exception as exc:
            logger.error("Failed to generate image for panel %s: %s", panel.panel_number, exc)
            # Fallback to empty or placeholder
            panel.image_url = f"/static/panels/placeholder_{panel.panel_number}.png"

    # Step 4: Export to PDF
    pdf_url = generate_pdf(story, req)
    logger.info("Generated comic PDF export at %s", pdf_url)

    # Step 5: Build final response
    return ComicResponse(
        success=True,
        title=story.title,
        layout=story.panels,
        pdf_url=pdf_url,
        character_name=req.character_name,
        setting=req.setting,
        tone=req.tone,
        art_style=req.art_style
    )
