"""
Pydantic schemas and data validation models for ComicCraft.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class StoryGenerationRequest(BaseModel):
    story_prompt: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="The core story idea or premise to turn into a comic.",
        examples=["A brave fox explores an enchanted forest and discovers a hidden magical city."]
    )
    character_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the main character.",
        examples=["Luna"]
    )
    setting: str = Field(
        ...,
        description="The story setting (e.g., Enchanted Forest, School, Future City, Space, Underwater World, Ancient Kingdom, Custom).",
        examples=["Enchanted Forest"]
    )
    tone: str = Field(
        ...,
        description="The emotional tone of the comic (Light-hearted, Funny, Dramatic, Poetic, Adventure, Mysterious).",
        examples=["Adventure"]
    )
    art_style: str = Field(
        ...,
        description="Visual style for panel illustrations (Comic Book, Anime, Cartoon, Pixel Art, Fantasy Illustration, Realistic).",
        examples=["Comic Book"]
    )

    @field_validator("story_prompt", "character_name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or solely whitespace.")
        return cleaned


class PanelOutline(BaseModel):
    panel_number: int = Field(..., ge=1, le=5, description="Sequential panel number (1 to 5).")
    title: str = Field(..., min_length=2, description="Short title for this panel.")
    scene_description: str = Field(..., min_length=10, description="Visual description of the action and environment.")
    image_prompt: str = Field(..., min_length=10, description="Detailed image generation prompt for this panel.")


class ComicOutline(BaseModel):
    title: str = Field(default="My Comic Story", description="Title of the five-panel comic.")
    panels: List[PanelOutline] = Field(..., min_length=5, max_length=5, description="Exactly 5 panels outlining the narrative.")


class ComicPanel(BaseModel):
    panel_number: int = Field(..., ge=1, le=5, description="Panel index from 1 to 5.")
    title: str = Field(..., description="Short title for the panel.")
    scene_description: str = Field(..., description="Contextual scene explanation.")
    image_prompt: str = Field(..., description="Descriptive prompt used to generate the panel illustration.")
    caption: str = Field(..., description="Comic box caption (e.g., 'Meanwhile at dusk...')")
    narration: str = Field(..., description="Narrator voiceover text.")
    dialogue: List[str] = Field(default_factory=list, description="List of character spoken dialogue strings.")
    image_url: Optional[str] = Field(default=None, description="Local or served URL path to the generated illustration.")


class ComicStory(BaseModel):
    title: str = Field(..., description="Overarching comic title.")
    panels: List[ComicPanel] = Field(..., min_length=5, max_length=5, description="Exactly 5 detailed comic panels.")


class ComicResponse(BaseModel):
    success: bool = True
    title: str
    layout: List[ComicPanel]
    pdf_url: str
    character_name: str
    setting: str
    tone: str
    art_style: str


class HealthResponse(BaseModel):
    status: str = "ok"
    application: str = "ComicCraft"
    version: str = "1.0.0"
    mock_mode: bool
