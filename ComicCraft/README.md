# ComicCraft – AI Comic Story Creator using Gemini Models

ComicCraft is an AI-powered web application that turns any user-provided story idea into an engaging, complete five-panel comic strip with outline, narration, captions, character dialogue, custom panel illustrations, and a downloadable PDF booklet.

---

## Architecture Overview

```
USER INPUT (Story Idea, Character, Setting, Tone, Art Style)
     │
     ▼
FASTAPI BACKEND
     │
     ▼
GEMINI FLASH (Outline Engine)
     │   └── Returns exactly 5 sequential panels
     ▼
GEMINI PRO (Story & Consistency Engine)
     │   ├── Comic Narrator Voiceover
     │   ├── Spoken Character Dialogue
     │   ├── Setting & Scene Captions
     │   └── Consistency-Locked Image Prompts
     ▼
IMAGE GENERATION ENGINE
     │   ├── Hugging Face (FLUX.1-schnell / SD)
     │   ├── Local Diffusers (Optional)
     │   └── Mock Pillow Generator (Offline/Development)
     ▼
COMIC LAYOUT BUILDER & PREVIEW
     │   └── Sequential 5-panel layout with speech bubbles & art
     ▼
PDF EXPORTER (fpdf2)
     └── High-resolution printable comic book document
```

---

## Features

- **Multi-Stage AI Pipeline**: Leverages Gemini Flash for rapid structural plotting and Gemini Pro for nuanced comic dialogue and character consistency.
- **Character Continuity**: Visual attributes (clothing, hair, accessories) are carried forward across all five panel image prompts.
- **Mock Mode**: Fully operational offline without requiring API keys or external services; renders comic art using Pillow and exports real PDFs.
- **Pluggable Image Backends**: Supports Hugging Face Inference API, local Diffusers, and Pillow mock rendering.
- **Dual Interface**:
  - Web UI: Clean responsive interface with Bangers & Comic Neue typography, interactive loading states, and comic preview.
  - REST API: Automated JSON endpoints (`/generate-comic/json`) with Swagger UI (`/docs`) and ReDoc (`/redoc`).
- **PDF Export**: Generates clean multi-page comic booklets containing all art, captions, dialogue, and credits.

---

## Installation & Setup

1. **Clone the repository**:
   ```bash
   cd ComicCraft
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_FLASH_MODEL=gemini-2.5-flash
   GEMINI_PRO_MODEL=gemini-2.5-pro
   IMAGE_BACKEND=huggingface
   HF_TOKEN=your_huggingface_token
   HF_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell
   MOCK_MODE=false
   ```

5. **Run the application**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

6. **Open in browser**:
   - Web App: `http://localhost:8000`
   - Interactive Docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

---

## Running Tests

Execute the automated test suite:
```bash
pytest tests/ -v
```

---

## API Endpoints

- `GET /`: Studio homepage and comic generator form.
- `POST /generate`: Form submission endpoint rendering `comic_preview.html`.
- `POST /generate-comic/json`: REST API returning structured JSON with panels and PDF link.
- `GET /test-image?prompt=...`: Generates a single test illustration.
- `GET /export-success`: PDF confirmation and download portal.
- `GET /health`: System health and mock mode status.
- `GET /docs`: Swagger UI OpenAPI specification.
