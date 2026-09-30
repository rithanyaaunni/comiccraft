"""
Unit and integration test suite for ComicCraft.
Tests outline generation, story expansion, validation, image generation, and PDF export.
"""

import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.schemas import StoryGenerationRequest, ComicOutline, ComicStory
from app.gemini_flash import generate_outline
from app.gemini_pro import expand_story
from app.image_generator import MockPillowGenerator
from app.exporters import generate_pdf

client = TestClient(app)


def test_health_endpoint():
    """Verify /health returns expected status and ComicCraft metadata."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["application"] == "ComicCraft"
    assert "mock_mode" in data


def test_validation_rejects_empty_inputs():
    """Verify Pydantic models reject invalid inputs."""
    # Too short prompt (< 5 chars)
    payload = {
        "story_prompt": "abc",
        "character_name": "Luna",
        "setting": "Enchanted Forest",
        "tone": "Adventure",
        "art_style": "Comic Book"
    }
    response = client.post("/generate-comic/json", json=payload)
    assert response.status_code == 422


def test_outline_generation_exact_five_panels():
    """Verify Gemini Flash returns exactly 5 panels."""
    req = StoryGenerationRequest(
        story_prompt="A brave fox explores an enchanted forest and discovers a hidden magical city.",
        character_name="Luna",
        setting="Enchanted Forest",
        tone="Adventure",
        art_style="Comic Book"
    )
    outline = generate_outline(req)
    assert isinstance(outline, ComicOutline)
    assert len(outline.panels) == 5
    for i, p in enumerate(outline.panels, start=1):
        assert p.panel_number == i
        assert len(p.title) > 0
        assert len(p.scene_description) > 0
        assert len(p.image_prompt) > 0


def test_story_expansion_dialogue_and_consistency():
    """Verify Gemini Pro creates captions, narration, and character dialogue."""
    req = StoryGenerationRequest(
        story_prompt="A brave fox explores an enchanted forest and discovers a hidden magical city.",
        character_name="Luna",
        setting="Enchanted Forest",
        tone="Adventure",
        art_style="Comic Book"
    )
    outline = generate_outline(req)
    story = expand_story(outline, req)

    assert isinstance(story, ComicStory)
    assert len(story.panels) == 5
    for panel in story.panels:
        assert panel.caption is not None
        assert panel.narration is not None
        assert len(panel.dialogue) > 0
        assert req.character_name in panel.image_prompt


def test_mock_pillow_image_generation():
    """Verify mock Pillow generator creates real PNG file."""
    gen = MockPillowGenerator()
    url = gen.generate_image(
        prompt="Luna entering the enchanted forest, comic art style",
        panel_number=1,
        panel_title="The Beginning"
    )
    assert url.startswith("/static/panels/panel_1_")
    assert url.endswith(".png")

    file_path = settings.base_dir / url.lstrip("/")
    assert file_path.exists()
    assert file_path.stat().st_size > 0


def test_pdf_export_generation():
    """Verify PDF export builds a valid PDF document."""
    req = StoryGenerationRequest(
        story_prompt="A brave fox explores an enchanted forest and discovers a hidden magical city.",
        character_name="Luna",
        setting="Enchanted Forest",
        tone="Adventure",
        art_style="Comic Book"
    )
    outline = generate_outline(req)
    story = expand_story(outline, req)
    pdf_url = generate_pdf(story, req)

    assert pdf_url.startswith("/static/exports/comiccraft_")
    assert pdf_url.endswith(".pdf")

    pdf_file = settings.base_dir / pdf_url.lstrip("/")
    assert pdf_file.exists()
    assert pdf_file.stat().st_size > 0


def test_json_generate_comic_endpoint():
    """Verify full end-to-end /generate-comic/json endpoint."""
    payload = {
        "story_prompt": "A brave fox explores an enchanted forest and discovers a hidden magical city.",
        "character_name": "Luna",
        "setting": "Enchanted Forest",
        "tone": "Adventure",
        "art_style": "Comic Book"
    }
    response = client.post("/generate-comic/json", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["layout"]) == 5
    assert "pdf_url" in data
    assert data["character_name"] == "Luna"
