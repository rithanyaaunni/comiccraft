"""
Gemini Flash module for comic outline generation.
Transforms user idea into a structured five-panel outline.
"""

import json
import logging
from typing import Dict, Any, List
from .config import settings
from .schemas import StoryGenerationRequest, ComicOutline, PanelOutline

logger = logging.getLogger(__name__)


def _get_mock_outline(req: StoryGenerationRequest) -> ComicOutline:
    """Fallback generator for mock mode or offline development."""
    char = req.character_name
    setting = req.setting
    tone = req.tone
    style = req.art_style
    idea = req.story_prompt

    panels: List[PanelOutline] = [
        PanelOutline(
            panel_number=1,
            title="The Call to Adventure",
            scene_description=f"{char} stands at the threshold of {setting}, clutching an old map, looking determined as the journey commences.",
            image_prompt=(
                f"A character named {char} standing at the dramatic entrance of {setting}. "
                f"Atmospheric {tone.lower()} mood, {style} visual style, cinematic wide-angle framing, "
                f"rich color palette, crisp line art, clear character silhouette, expressive facial features."
            )
        ),
        PanelOutline(
            panel_number=2,
            title="First Footsteps & Wonder",
            scene_description=f"Delving deeper into {setting}, {char} spots strange glowing symbols and ancient clues etched into the surroundings.",
            image_prompt=(
                f"{char} discovering strange glowing ancient runes in {setting}. "
                f"Mystical luminescence, {tone.lower()} ambiance, {style} art style, medium close-up, "
                f"detailed clothing textures, dynamic lighting casting soft shadows."
            )
        ),
        PanelOutline(
            panel_number=3,
            title="The Sudden Obstacle",
            scene_description=f"A sudden challenge arises in {setting}—a precarious chasm or puzzling guardian blocking the path.",
            image_prompt=(
                f"{char} facing a grand obstacle and magical challenge inside {setting}. "
                f"High-stakes dramatic composition, {tone.lower()} tension, {style} art style, "
                f"dramatic upward camera angle, swirling atmospheric particle effects."
            )
        ),
        PanelOutline(
            panel_number=4,
            title="The Clever Breakthrough",
            scene_description=f"Using wit and courage, {char} triggers a wondrous mechanism, unveiling the long-hidden secret.",
            image_prompt=(
                f"{char} activating a luminous golden relic in {setting}, a dazzling burst of energy illuminating their face. "
                f"Triumphant dynamic pose, {tone.lower()} mood, {style} style, vibrant contrast, "
                f"stunning visual effects, masterpiece comic illustration."
            )
        ),
        PanelOutline(
            panel_number=5,
            title="The Grand Discovery",
            scene_description=f"{char} gazes in awe upon the breathtaking sight that was hidden, ready for the next chapter of legend.",
            image_prompt=(
                f"Epic sweeping reveal of {setting} with {char} standing proudly in the foreground gazing at the breathtaking vista. "
                f"Golden hour lighting, inspiring and {tone.lower()} climax, masterwork {style} aesthetic, "
                f"rich textures, ultra-detailed comic book finish."
            )
        )
    ]

    title = f"{char}'s Quest: The Secret of {setting}"
    return ComicOutline(title=title, panels=panels)


def generate_outline(req: StoryGenerationRequest) -> ComicOutline:
    """
    Generate a 5-panel comic outline using Gemini Flash.
    """
    if settings.mock_mode or not settings.gemini_api_key:
        logger.info("Using Mock Mode for Gemini Flash outline generation.")
        return _get_mock_outline(req)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)

        prompt = f"""
You are an expert comic book scriptwriter.
Create a structured 5-panel comic outline based on the following input:

- Story Idea: {req.story_prompt}
- Main Character: {req.character_name}
- Setting: {req.setting}
- Tone: {req.tone}
- Art Style: {req.art_style}

Requirements:
1. Provide an engaging comic title.
2. Return EXACTLY 5 panels (panel_number 1 through 5).
3. Panel 1: Setup / Introduction.
4. Panel 2: Inciting incident / Exploration.
5. Panel 3: Conflict / Cliffhanger obstacle.
6. Panel 4: Climax / Clever resolution.
7. Panel 5: Grand reveal / Satisfying conclusion.
8. Each panel MUST contain:
   - "panel_number": integer (1 to 5)
   - "title": short title
   - "scene_description": visual description of scene
   - "image_prompt": detailed visual prompt describing character appearance, action, setting, lighting, camera angle, and art style.

Return valid JSON conforming to this schema:
{{
  "title": "string",
  "panels": [
    {{
      "panel_number": 1,
      "title": "string",
      "scene_description": "string",
      "image_prompt": "string"
    }}
  ]
}}
"""

        response = client.models.generate_content(
            model=settings.gemini_flash_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            )
        )

        data = json.loads(response.text)
        # Validate through Pydantic
        outline = ComicOutline(**data)
        if len(outline.panels) != 5:
            raise ValueError(f"Expected exactly 5 panels, received {len(outline.panels)}")
        return outline

    except Exception as exc:
        logger.warning("Gemini Flash outline generation failed (%s). Falling back to mock generator.", exc)
        return _get_mock_outline(req)
