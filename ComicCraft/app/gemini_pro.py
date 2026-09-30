"""
Gemini Pro module for expanding comic outlines into full dialogue, narration, captions, and detailed prompts.
Enforces character consistency, visual continuity, and comic book rhythm.
"""

import json
import logging
from typing import List, Dict, Any
from .config import settings
from .schemas import StoryGenerationRequest, ComicOutline, ComicStory, ComicPanel

logger = logging.getLogger(__name__)


def _get_mock_story(outline: ComicOutline, req: StoryGenerationRequest) -> ComicStory:
    """Rich mock story generator preserving consistency across all 5 panels."""
    char = req.character_name
    setting = req.setting
    tone = req.tone
    style = req.art_style

    # Consistent character visual description anchor
    char_desc = (
        f"{char}, an intrepid youth with wind-tousled dark hair, determined amber eyes, "
        f"wearing a practical teal adventurer's tunic with bronze buckles and sturdy leather boots"
    )

    panels_data = [
        {
            "panel_number": 1,
            "title": outline.panels[0].title if outline.panels else "The Call to Adventure",
            "scene_description": f"{char} halts at the boundary of {setting}, studying a shimmering crystalline relic.",
            "caption": f"Dawn breaks over the edge of {setting}.",
            "narration": f"Legend spoke of wonders sleeping beneath the quiet canopy.",
            "dialogue": [
                f"{char}: Today is the day. No turning back now.",
                f"Companion: The compass points toward the inner sanctuary!"
            ],
            "image_prompt": (
                f"{char_desc}, standing in the foreground at the magnificent entrance of {setting}. "
                f"Holding a faintly glowing crystalline compass. Morning golden mist filtering through the trees. "
                f"Art style is {style}. Wide establishing shot, crisp comic line art, dynamic shadows, vivid color palette."
            )
        },
        {
            "panel_number": 2,
            "title": outline.panels[1].title if len(outline.panels) > 1 else "The First Wonder",
            "scene_description": f"{char} steps through luminous flora and discovers an ancient glyph humming with magic.",
            "caption": f"Deep within the labyrinth of {setting}...",
            "narration": f"Every step felt as though the earth itself was holding its breath.",
            "dialogue": [
                f"{char}: These ancient markings... they react to my touch!",
                f"{char}: It's a star chart of the lost elders."
            ],
            "image_prompt": (
                f"{char_desc}, gently touching glowing celestial runes carved into ancient stone in {setting}. "
                f"Cyan and violet bioluminescent light reflecting on {char}'s astonished face. "
                f"Art style is {style}. Medium close-up, dramatic lighting, detailed textures, expressive eyes, vibrant colors."
            )
        },
        {
            "panel_number": 3,
            "title": outline.panels[2].title if len(outline.panels) > 2 else "The Trial of Courage",
            "scene_description": f"The ground shudders as an immense stone mechanism locks the gateway, demanding the proper celestial alignment.",
            "caption": f"Suddenly, a thunderous chime shakes the ground!",
            "narration": f"The pathway would only yield to someone worthy of its secret.",
            "dialogue": [
                f"Voice of Stone: Only the seeker with steady hands may proceed!",
                f"{char}: Wait... the sequence on the map matches the constellation above!"
            ],
            "image_prompt": (
                f"{char_desc}, raising the crystalline compass high against a towering ancient stone gate in {setting}. "
                f"Mystical energy arcs between the stones. Dramatic low-angle perspective, intense {tone.lower()} expression, "
                f"art style is {style}, cinematic comic composition, particle sparks in the air."
            )
        },
        {
            "panel_number": 4,
            "title": outline.panels[3].title if len(outline.panels) > 3 else "The Breakthrough",
            "scene_description": f"With a swift turn of the relic, ancient gears rotate and a dazzling doorway of pure light swings open.",
            "caption": f"With a resounding click, the lock gives way!",
            "narration": f"Faith and quick intellect unlocked what brute force never could.",
            "dialogue": [
                f"{char}: It worked! The lock is disarmed!",
                f"Companion: Look at that brilliance spilling out!"
            ],
            "image_prompt": (
                f"{char_desc}, shielding their eyes with a triumphant smile as an immense portal of golden and azure light floods the screen. "
                f"Dynamic action pose in {setting}, billowing cloak, sparkling magic runes dissolving into air. "
                f"Art style is {style}, high-contrast comic lighting, masterful coloring."
            )
        },
        {
            "panel_number": 5,
            "title": outline.panels[4].title if len(outline.panels) > 4 else "The Grand Horizon",
            "scene_description": f"{char} looks out over the newly discovered hidden kingdom, filled with boundless wonder.",
            "caption": f"A brand-new era of discovery begins.",
            "narration": f"This wasn't the end of {char}'s quest—only the breathtaking prologue.",
            "dialogue": [
                f"{char}: We did it. The legend was real all along.",
                f"{char}: Our next adventure awaits right beyond that ridge!"
            ],
            "image_prompt": (
                f"{char_desc}, standing atop a scenic overlook inside {setting}, overlooking a breathtaking floating city bathed in twilight. "
                f"Epic cinematic wide shot, wind blowing hair, peaceful yet exhilarating {tone.lower()} ambiance. "
                f"Art style is {style}, majestic comic illustration, pristine detail and lighting."
            )
        }
    ]

    comic_panels = [ComicPanel(**p) for p in panels_data]
    return ComicStory(title=outline.title or f"{char}'s Journey in {setting}", panels=comic_panels)


def expand_story(outline: ComicOutline, req: StoryGenerationRequest) -> ComicStory:
    """
    Expand outline into full script, captions, dialogue, and consistent image prompts using Gemini Pro.
    """
    if settings.mock_mode or not settings.gemini_api_key:
        logger.info("Using Mock Mode for Gemini Pro comic story expansion.")
        return _get_mock_story(outline, req)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)

        outline_json = json.dumps([p.model_dump() for p in outline.panels], indent=2)

        prompt = f"""
You are an award-winning comic book writer and visual art director.
Expand this 5-panel comic outline into a complete, professional five-panel comic script with captions, narration, character dialogue, and rich visual image prompts.

USER SPECIFICATIONS:
- Story Prompt: {req.story_prompt}
- Main Character: {req.character_name}
- Setting: {req.setting}
- Tone: {req.tone}
- Art Style: {req.art_style}

5-PANEL OUTLINE FROM FLASH:
{outline_json}

CRITICAL DIRECTIVES:
1. Return EXACTLY 5 panels (panel_number 1 to 5).
2. CHARACTER CONSISTENCY: Define a clear visual anchor for {req.character_name} (hair, distinctive clothing, age, colors) and REPEAT these key visual traits in every single image prompt so the character remains visually identical across all panels.
3. COMIC WRITING:
   - "caption": Short scene setting box (e.g., "Meanwhile in the heart of the forest...")
   - "narration": Expressive 1-2 sentence voiceover.
   - "dialogue": Array of speech bubble strings formatted as "CharacterName: Spoken text" (1 to 3 bubbles per panel).
   - "scene_description": Vivid context of what is happening.
   - "image_prompt": Highly detailed visual prompt including character appearance, exact action, camera angle (wide, medium, close-up, dramatic high-angle), lighting, mood, environment details, and specifying the "{req.art_style}" art style. Do NOT put long dialogue in the image prompt itself.

Return valid JSON conforming to this schema:
{{
  "title": "Comic Title",
  "panels": [
    {{
      "panel_number": 1,
      "title": "Panel Title",
      "scene_description": "...",
      "image_prompt": "...",
      "caption": "...",
      "narration": "...",
      "dialogue": ["Speaker: Text"]
    }}
  ]
}}
"""

        response = client.models.generate_content(
            model=settings.gemini_pro_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            )
        )

        data = json.loads(response.text)
        story = ComicStory(**data)
        if len(story.panels) != 5:
            raise ValueError(f"Expected exactly 5 panels from Pro, received {len(story.panels)}")
        return story

    except Exception as exc:
        logger.warning("Gemini Pro story expansion failed (%s). Falling back to mock generator.", exc)
        return _get_mock_story(outline, req)
