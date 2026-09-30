"""
Image generation abstraction layer for ComicCraft.
Supports Hugging Face Inference API, local Diffusers, and Mock Pillow generator.
"""

import os
import uuid
import time
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont

from .config import settings

logger = logging.getLogger(__name__)


class BaseImageGenerator(ABC):
    """Abstract interface for panel image generation."""

    @abstractmethod
    def generate_image(self, prompt: str, panel_number: int, panel_title: str = "") -> str:
        """
        Generate an illustration given an image prompt and return its web-accessible URL.
        """
        pass


class MockPillowGenerator(BaseImageGenerator):
    """
    High-fidelity comic panel generator using Pillow.
    Generates stylized comic book frames with halftone dots, gradient backdrops,
    vignettes, panel badges, and character silhouettes.
    Runs fast and offline without external API dependencies.
    """

    # Palette sets based on panel sequence
    PALETTES = [
        {"bg_start": (24, 32, 64), "bg_end": (64, 112, 192), "accent": (255, 204, 0), "label": "DAWN EXPEDITION"},
        {"bg_start": (18, 52, 48), "bg_end": (42, 140, 118), "accent": (80, 240, 180), "label": "ENCHANTED DISCOVERY"},
        {"bg_start": (58, 20, 36), "bg_end": (160, 48, 64), "accent": (255, 110, 64), "label": "PERILOUS TRIAL"},
        {"bg_start": (48, 24, 76), "bg_end": (130, 60, 180), "accent": (255, 230, 90), "label": "ASTRAL AWAKENING"},
        {"bg_start": (15, 36, 68), "bg_end": (230, 150, 70), "accent": (255, 255, 255), "label": "THE NEW DAWN"},
    ]

    def generate_image(self, prompt: str, panel_number: int, panel_title: str = "") -> str:
        width, height = 768, 512
        img = Image.new("RGB", (width, height), color=(20, 24, 36))
        draw = ImageDraw.Draw(img)

        palette_idx = (panel_number - 1) % len(self.PALETTES)
        pal = self.PALETTES[palette_idx]

        # Draw smooth vertical background gradient
        r1, g1, b1 = pal["bg_start"]
        r2, g2, b2 = pal["bg_end"]
        for y in range(height):
            ratio = y / float(height)
            r = int(r1 + (r2 - r1) * ratio)
            g = int(g1 + (g2 - g1) * ratio)
            b = int(b1 + (b2 - b1) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # Add comic halftone dot pattern in upper quarter
        for x in range(20, width - 20, 24):
            for y in range(20, 180, 24):
                dot_size = max(1, int(3 * (1.0 - y / 200.0)))
                draw.ellipse([(x - dot_size, y - dot_size), (x + dot_size, y + dot_size)], fill=(255, 255, 255, 40))

        # Draw atmospheric sun / portal / glowing celestial sphere
        sun_x, sun_y = width // 2, int(height * 0.45)
        sun_radius = 110
        for rad in range(sun_radius, 0, -8):
            alpha_ratio = 1.0 - (rad / sun_radius)
            cr = min(255, int(pal["accent"][0] * alpha_ratio + 50))
            cg = min(255, int(pal["accent"][1] * alpha_ratio + 50))
            cb = min(255, int(pal["accent"][2] * alpha_ratio + 80))
            draw.ellipse(
                [(sun_x - rad, sun_y - rad), (sun_x + rad, sun_y + rad)],
                fill=(cr, cg, cb)
            )

        # Draw dynamic landscape / foreground silhouette
        ground_points = [
            (0, height),
            (0, int(height * 0.68)),
            (int(width * 0.25), int(height * 0.62)),
            (int(width * 0.5), int(height * 0.70)),
            (int(width * 0.75), int(height * 0.60)),
            (width, int(height * 0.66)),
            (width, height),
        ]
        draw.polygon(ground_points, fill=(12, 16, 26))

        # Hero character silhouette on a vantage point
        hero_x = int(width * 0.48)
        hero_y = int(height * 0.62)
        # Cloak / Torso
        draw.polygon([
            (hero_x - 18, hero_y + 40),
            (hero_x + 18, hero_y + 40),
            (hero_x + 10, hero_y),
            (hero_x - 10, hero_y),
        ], fill=(8, 10, 16))
        # Head
        draw.ellipse([(hero_x - 8, hero_y - 18), (hero_x + 8, hero_y - 2)], fill=(8, 10, 16))
        # Raised hand or staff
        draw.line([(hero_x + 8, hero_y + 10), (hero_x + 28, hero_y - 20)], fill=(8, 10, 16), width=4)
        # Glow orb on staff tip
        draw.ellipse([(hero_x + 24, hero_y - 26), (hero_x + 34, hero_y - 16)], fill=pal["accent"])

        # Comic panel outer border (heavy ink style)
        border_w = 8
        draw.rectangle([(0, 0), (width - 1, height - 1)], outline=(10, 12, 18), width=border_w)
        # Inner fine highlight line
        draw.rectangle([(border_w, border_w), (width - border_w - 1, height - border_w - 1)], outline=(255, 255, 255), width=2)

        # Panel Number Badge (top-left)
        badge_box = [(16, 16), (150, 48)]
        draw.rectangle(badge_box, fill=(245, 197, 24), outline=(10, 10, 10), width=3)
        badge_text = f"PANEL #{panel_number}"
        draw.text((26, 24), badge_text, fill=(10, 10, 10))

        # Top-right chapter subtitle
        if panel_title:
            clean_title = panel_title[:32]
            draw.rectangle([(width - 240, 16), (width - 16, 48)], fill=(15, 20, 32), outline=(245, 197, 24), width=2)
            draw.text((width - 226, 24), clean_title, fill=(255, 255, 255))

        # Bottom Prompt Snippet Box (subtle)
        prompt_snippet = (prompt[:75] + "...") if len(prompt) > 75 else prompt
        draw.rectangle([(16, height - 44), (width - 16, height - 14)], fill=(12, 14, 22), outline=(80, 90, 110), width=1)
        draw.text((24, height - 34), f"Prompt: {prompt_snippet}", fill=(190, 205, 225))

        # Generate unique filename
        filename = f"panel_{panel_number}_{uuid.uuid4().hex[:8]}.png"
        file_path = settings.panels_dir / filename
        img.save(file_path, "PNG", quality=95)

        logger.info("Generated mock comic panel: %s", file_path)
        return f"/static/panels/{filename}"


class HuggingFaceImageGenerator(BaseImageGenerator):
    """
    Image generation using Hugging Face Inference API.
    """

    def __init__(self, token: str, model_id: str):
        self.token = token
        self.model_id = model_id
        self.api_url = f"https://api-inference.huggingface.co/models/{model_id}"
        self.mock_fallback = MockPillowGenerator()

    def generate_image(self, prompt: str, panel_number: int, panel_title: str = "") -> str:
        if not self.token or settings.mock_mode:
            logger.info("HF Token missing or mock_mode active, using high-fidelity Pillow generator.")
            return self.mock_fallback.generate_image(prompt, panel_number, panel_title)

        import requests

        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "inputs": f"comic book art, dramatic composition, {prompt}",
            "parameters": {
                "negative_prompt": "blurry, low quality, deformed, text artifacts, bad anatomy, duplicate character",
                "width": 768,
                "height": 512,
            }
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=60)
            if response.status_code == 200:
                filename = f"panel_{panel_number}_{uuid.uuid4().hex[:8]}.png"
                file_path = settings.panels_dir / filename
                with open(file_path, "wb") as f:
                    f.write(response.content)
                logger.info("Successfully generated panel image via HuggingFace: %s", filename)
                return f"/static/panels/{filename}"
            else:
                logger.warning("HuggingFace API returned status %s: %s. Falling back to mock generator.", response.status_code, response.text[:200])
                return self.mock_fallback.generate_image(prompt, panel_number, panel_title)
        except Exception as exc:
            logger.error("HuggingFace generation failed: %s. Falling back to mock generator.", exc)
            return self.mock_fallback.generate_image(prompt, panel_number, panel_title)


class LocalDiffusersGenerator(BaseImageGenerator):
    """
    Optional local Stable Diffusion generator using Diffusers.
    """

    def __init__(self):
        self.pipe = None
        self.mock_fallback = MockPillowGenerator()

    def _init_pipeline(self):
        if self.pipe is None:
            try:
                import torch
                from diffusers import StableDiffusionPipeline
                model_id = "runwayml/stable-diffusion-v1-5"
                device = "cuda" if torch.cuda.is_available() else "cpu"
                self.pipe = StableDiffusionPipeline.from_pretrained(model_id)
                self.pipe = self.pipe.to(device)
            except Exception as exc:
                logger.warning("Local diffusers not available: %s", exc)

    def generate_image(self, prompt: str, panel_number: int, panel_title: str = "") -> str:
        self._init_pipeline()
        if self.pipe is None or settings.mock_mode:
            return self.mock_fallback.generate_image(prompt, panel_number, panel_title)

        try:
            result = self.pipe(prompt=prompt, width=768, height=512, num_inference_steps=25)
            image = result.images[0]
            filename = f"panel_{panel_number}_{uuid.uuid4().hex[:8]}.png"
            file_path = settings.panels_dir / filename
            image.save(file_path)
            return f"/static/panels/{filename}"
        except Exception as exc:
            logger.error("Local Diffuser generation failed: %s", exc)
            return self.mock_fallback.generate_image(prompt, panel_number, panel_title)


def get_image_generator() -> BaseImageGenerator:
    """Factory function returning the configured image generator."""
    if settings.mock_mode:
        return MockPillowGenerator()

    backend = settings.image_backend.lower()
    if backend == "huggingface":
        return HuggingFaceImageGenerator(token=settings.hf_token, model_id=settings.hf_image_model)
    elif backend == "local":
        return LocalDiffusersGenerator()
    else:
        logger.info("Defaulting to MockPillowGenerator for backend: %s", backend)
        return MockPillowGenerator()
