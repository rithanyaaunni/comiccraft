/**
 * Full-stack Express server for ComicCraft.
 * Implements REST APIs, Gemini Flash & Pro integrations, Image rendering,
 * PDF generation via jsPDF, Swagger documentation, and Vite middlewares.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage directories
const BASE_DIR = process.cwd();
const PANELS_DIR = path.join(BASE_DIR, 'static', 'panels');
const EXPORTS_DIR = path.join(BASE_DIR, 'static', 'exports');

if (!fs.existsSync(PANELS_DIR)) {
  fs.mkdirSync(PANELS_DIR, { recursive: true });
}
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Serve static assets
app.use('/static', express.static(path.join(BASE_DIR, 'static')));

// Configuration
const CONFIG = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiFlashModel: process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash',
  geminiProModel: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
  imageBackend: process.env.IMAGE_BACKEND || 'huggingface',
  hfToken: process.env.HF_TOKEN || '',
  hfImageModel: process.env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell',
  mockMode: (process.env.MOCK_MODE || 'true').toLowerCase() === 'true',
};

// Swagger / OpenAPI Specification
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ComicCraft API',
    version: '1.0.0',
    description: 'AI Comic Story Creator REST APIs powered by Gemini Flash and Gemini Pro models.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': {
      get: {
        summary: 'Check API and system health',
        responses: {
          '200': {
            description: 'Health status response',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/generate-comic/json': {
      post: {
        summary: 'Generate complete 5-panel comic with script, images, and PDF',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['story_prompt', 'character_name', 'setting', 'tone', 'art_style'],
                properties: {
                  story_prompt: { type: 'string', example: 'A brave fox explores an enchanted forest.' },
                  character_name: { type: 'string', example: 'Luna' },
                  setting: { type: 'string', example: 'Enchanted Forest' },
                  tone: { type: 'string', example: 'Adventure' },
                  art_style: { type: 'string', example: 'Comic Book' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Complete comic story response' },
        },
      },
    },
    '/test-image': {
      get: {
        summary: 'Generate a single test illustration',
        parameters: [{ name: 'prompt', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'Test image metadata and URL' } },
      },
    },
  },
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/redoc', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>ComicCraft API ReDoc</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <redoc spec-url='/api-docs.json'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
  </body>
</html>`);
});
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

// Panel SVG/PNG generator
function createMockPanelImage(panelNumber: number, title: string, prompt: string, style: string): string {
  const filename = `panel_${panelNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.svg`;
  const filePath = path.join(PANELS_DIR, filename);

  const gradients = [
    { start: '#12192e', end: '#243b6b', accent: '#f5c518', sun: '#ffdf6d', name: 'Dawn' },
    { start: '#0e2b25', end: '#1e5f52', accent: '#50f0b4', sun: '#73ffe0', name: 'Mystic' },
    { start: '#3d1627', end: '#872b3c', accent: '#ff6e40', sun: '#ff9d7d', name: 'Trial' },
    { start: '#28143d', end: '#5a2580', accent: '#ffe65a', sun: '#f7f092', name: 'Eclipse' },
    { start: '#10223d', end: '#bf6e2b', accent: '#ffffff', sun: '#ffd199', name: 'Horizon' },
  ];
  const g = gradients[(panelNumber - 1) % gradients.length];
  const cleanPrompt = prompt.replace(/[<>&"]/g, '');
  const cleanTitle = title.replace(/[<>&"]/g, '');

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 512" width="768" height="512">
  <defs>
    <linearGradient id="bgGrad${panelNumber}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${g.start}"/>
      <stop offset="100%" stop-color="${g.end}"/>
    </linearGradient>
    <radialGradient id="sunGrad${panelNumber}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${g.sun}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${g.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="halftone${panelNumber}" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="2" fill="#ffffff" opacity="0.12"/>
    </pattern>
  </defs>

  <!-- Background Sky -->
  <rect width="768" height="512" fill="url(#bgGrad${panelNumber})"/>
  <rect width="768" height="260" fill="url(#halftone${panelNumber})"/>

  <!-- Celestial Glow / Sun -->
  <circle cx="384" cy="220" r="140" fill="url(#sunGrad${panelNumber})"/>
  <circle cx="384" cy="220" r="45" fill="${g.sun}"/>

  <!-- Distant Mountain Silhouettes -->
  <polygon points="0,380 140,260 280,360 460,230 620,350 768,270 768,512 0,512" fill="#080c14" opacity="0.7"/>

  <!-- Foreground Terrain -->
  <polygon points="0,512 0,390 190,360 380,410 580,350 768,390 768,512" fill="#05070a"/>

  <!-- Hero Character Silhouette -->
  <g transform="translate(370, 310)">
    <!-- Cloak & Body -->
    <path d="M14,90 L-14,90 L-8,30 L8,30 Z" fill="#030406"/>
    <!-- Head & Hair -->
    <circle cx="0" cy="18" r="12" fill="#030406"/>
    <!-- Raised Staff / Arm -->
    <line x1="8" y1="40" x2="35" y2="10" stroke="#030406" stroke-width="4"/>
    <!-- Glowing Gem on Staff -->
    <circle cx="36" cy="8" r="7" fill="${g.accent}"/>
    <circle cx="36" cy="8" r="14" fill="${g.accent}" opacity="0.3"/>
  </g>

  <!-- Comic Outer Border -->
  <rect x="0" y="0" width="768" height="512" fill="none" stroke="#000000" stroke-width="12"/>
  <rect x="6" y="6" width="756" height="500" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.4"/>

  <!-- Panel Number Badge -->
  <rect x="24" y="24" width="130" height="38" rx="4" fill="#f5c518" stroke="#000000" stroke-width="3"/>
  <text x="89" y="49" fill="#000000" font-family="'Impact', 'Arial Black', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">PANEL #${panelNumber}</text>

  <!-- Style Tag -->
  <rect x="610" y="24" width="134" height="34" rx="4" fill="#000000" stroke="#f5c518" stroke-width="2"/>
  <text x="677" y="46" fill="#f5c518" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">${style.toUpperCase()}</text>

  <!-- Bottom Prompt Snippet -->
  <rect x="24" y="464" width="720" height="28" rx="3" fill="#080c14" opacity="0.9" stroke="#334155" stroke-width="1"/>
  <text x="36" y="482" fill="#94a3b8" font-family="monospace" font-size="11">Scene: ${cleanTitle} | Prompt: ${cleanPrompt.substring(0, 70)}...</text>
</svg>
`;

  fs.writeFileSync(filePath, svgContent.trim());
  return `/static/panels/${filename}`;
}

// Generate PDF using jsPDF
function createComicPdf(story: any, req: any): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const pdfFilename = `comiccraft_${timestamp}_${Math.random().toString(36).substring(2, 6)}.pdf`;
  const pdfPath = path.join(EXPORTS_DIR, pdfFilename);

  // Cover banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(245, 197, 24);
  doc.text('COMICCRAFT - 5-PANEL AI CHRONICLE', 105, 16, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`Story: "${story.title}" | Hero: ${req.character_name} | Realm: ${req.setting} | Style: ${req.art_style}`, 105, 26, { align: 'center' });

  let yPos = 45;

  story.panels.forEach((p: any) => {
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    // Panel Header box
    doc.setFillColor(245, 197, 24);
    doc.rect(14, yPos, 45, 7, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`PANEL #${p.panel_number}`, 18, yPos + 5);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(p.title || `Chapter ${p.panel_number}`, 65, yPos + 5);

    yPos += 11;

    // Panel illustration placeholder box
    doc.setFillColor(235, 240, 250);
    doc.rect(14, yPos, 80, 52, 'F');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`[Panel Illustration #${p.panel_number}]`, 54, yPos + 26, { align: 'center' });

    // Script Column
    const textX = 100;
    let textY = yPos + 4;

    // Caption
    if (p.caption) {
      doc.setFillColor(254, 249, 195);
      doc.setDrawColor(234, 179, 8);
      doc.rect(textX, textY, 96, 10, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(113, 63, 18);
      doc.text(`CAPTION: ${p.caption}`, textX + 3, textY + 6);
      textY += 13;
    }

    // Narration
    if (p.narration) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Narration: "${p.narration}"`, textX, textY, { maxWidth: 96 });
      textY += 10;
    }

    // Dialogue
    if (p.dialogue && p.dialogue.length > 0) {
      p.dialogue.forEach((line: string) => {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.rect(textX, textY, 96, 7, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(line, textX + 3, textY + 5, { maxWidth: 90 });
        textY += 9;
      });
    }

    // Scene
    if (p.scene_description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Scene: ${p.scene_description}`, textX, textY, { maxWidth: 96 });
    }

    yPos += 58;

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, yPos, 196, yPos);
    yPos += 6;
  });

  const pdfOutput = doc.output('arraybuffer');
  fs.writeFileSync(pdfPath, Buffer.from(pdfOutput));

  return `/static/exports/${pdfFilename}`;
}

// Full 5-panel generation pipeline
async function generateComicStory(req: {
  story_prompt: string;
  character_name: string;
  setting: string;
  tone: string;
  art_style: string;
}) {
  const { story_prompt, character_name, setting, tone, art_style } = req;

  let outlinePanels: any[] = [];
  let storyTitle = `${character_name}'s Quest: The Secret of ${setting}`;

  // If live Gemini is enabled and key exists
  if (!CONFIG.mockMode && CONFIG.geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: CONFIG.geminiApiKey });

      // Step 1: Gemini Flash outline
      const flashPrompt = `You are an expert comic book scriptwriter.
Return a structured 5-panel comic outline for:
- Idea: ${story_prompt}
- Character: ${character_name}
- Setting: ${setting}
- Tone: ${tone}
- Art Style: ${art_style}

Return valid JSON:
{
  "title": "string",
  "panels": [
    {
      "panel_number": 1,
      "title": "string",
      "scene_description": "string",
      "image_prompt": "string"
    }
  ]
} (must contain exactly 5 panels)`;

      const flashRes = await ai.models.generateContent({
        model: CONFIG.geminiFlashModel,
        contents: flashPrompt,
        config: { responseMimeType: 'application/json' },
      });

      const flashData = JSON.parse(flashRes.text || '{}');
      if (flashData.panels && flashData.panels.length === 5) {
        outlinePanels = flashData.panels;
        if (flashData.title) storyTitle = flashData.title;
      }
    } catch (err) {
      console.warn('Gemini Flash outline failed, using mock generator:', err);
    }
  }

  // Fallback outline if needed
  if (!outlinePanels.length || outlinePanels.length !== 5) {
    outlinePanels = [
      {
        panel_number: 1,
        title: 'The Call to Adventure',
        scene_description: `${character_name} stands at the dramatic entrance of ${setting}, clutching an ancient map.`,
        image_prompt: `A character named ${character_name} standing at the threshold of ${setting}, holding an ancient compass, ${tone} mood, ${art_style} visual style, wide establishing shot, crisp lines.`,
      },
      {
        panel_number: 2,
        title: 'The First Wonder',
        scene_description: `${character_name} discovers mysterious glowing runes etched into the ancient architecture of ${setting}.`,
        image_prompt: `${character_name} touching luminous glowing runes in ${setting}, cyan and amber bioluminescence, medium shot, expressive facial features, ${art_style} style.`,
      },
      {
        panel_number: 3,
        title: 'The Trial of Courage',
        scene_description: `A sudden challenge arises in ${setting} as giant stone gears lock the pathway ahead.`,
        image_prompt: `${character_name} confronting a monumental stone trial mechanism in ${setting}, dramatic low-angle perspective, dynamic tension, ${art_style} art style.`,
      },
      {
        panel_number: 4,
        title: 'The Breakthrough',
        scene_description: `Using quick thinking and courage, ${character_name} solves the ancient riddle, unleashing a burst of golden light.`,
        image_prompt: `${character_name} triggering a brilliant burst of golden and azure energy in ${setting}, triumphant heroic stance, ${art_style} style.`,
      },
      {
        panel_number: 5,
        title: 'The Grand Discovery',
        scene_description: `${character_name} overlooks the breathtaking secret panorama revealed within ${setting}.`,
        image_prompt: `Epic sweeping reveal of ${setting} with ${character_name} standing proudly in the foreground gazing at the breathtaking vista, twilight colors, majestic ${art_style} finish.`,
      },
    ];
  }

  // Step 2: Gemini Pro story expansion
  let completePanels: any[] = [];
  if (!CONFIG.mockMode && CONFIG.geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: CONFIG.geminiApiKey });
      const proPrompt = `You are a comic book scriptwriter. Expand this 5-panel outline into full dialogue, narration, captions, and consistency-locked visual prompts.
Outline: ${JSON.stringify(outlinePanels)}
Character: ${character_name}
Setting: ${setting}
Tone: ${tone}
Style: ${art_style}

Return valid JSON:
{
  "title": "${storyTitle}",
  "panels": [
    {
      "panel_number": 1,
      "title": "string",
      "scene_description": "string",
      "image_prompt": "string",
      "caption": "string",
      "narration": "string",
      "dialogue": ["Character: text"]
    }
  ]
} (must contain exactly 5 panels)`;

      const proRes = await ai.models.generateContent({
        model: CONFIG.geminiProModel,
        contents: proPrompt,
        config: { responseMimeType: 'application/json' },
      });

      const proData = JSON.parse(proRes.text || '{}');
      if (proData.panels && proData.panels.length === 5) {
        completePanels = proData.panels;
        if (proData.title) storyTitle = proData.title;
      }
    } catch (err) {
      console.warn('Gemini Pro expansion failed, using fallback:', err);
    }
  }

  // Fallback expanded story with narration and dialogue
  if (!completePanels.length || completePanels.length !== 5) {
    completePanels = [
      {
        panel_number: 1,
        title: outlinePanels[0].title,
        scene_description: outlinePanels[0].scene_description,
        image_prompt: outlinePanels[0].image_prompt,
        caption: `Dawn breaks over the edge of ${setting}.`,
        narration: `Legend spoke of ancient wonders sleeping beneath the quiet skies.`,
        dialogue: [
          `${character_name}: Today is the day. There is no turning back now.`,
          `Guide: Stay close—the compass points toward the inner sanctuary!`,
        ],
      },
      {
        panel_number: 2,
        title: outlinePanels[1].title,
        scene_description: outlinePanels[1].scene_description,
        image_prompt: outlinePanels[1].image_prompt,
        caption: `Deeper within the mystical labyrinth...`,
        narration: `Every step felt as though the world itself was holding its breath.`,
        dialogue: [
          `${character_name}: These markings... they react to the touch!`,
          `${character_name}: It's a star chart of the lost elders.`,
        ],
      },
      {
        panel_number: 3,
        title: outlinePanels[2].title,
        scene_description: outlinePanels[2].scene_description,
        image_prompt: outlinePanels[2].image_prompt,
        caption: `Suddenly, a thunderous chime shakes the ground!`,
        narration: `The path would only yield to someone with genuine courage.`,
        dialogue: [
          `Guardian Voice: Only the seeker with steady hands may proceed!`,
          `${character_name}: The map matches the constellation above!`,
        ],
      },
      {
        panel_number: 4,
        title: outlinePanels[3].title,
        scene_description: outlinePanels[3].scene_description,
        image_prompt: outlinePanels[3].image_prompt,
        caption: `With a resounding click, the lock gives way!`,
        narration: `Faith and quick intellect unlocked what brute force never could.`,
        dialogue: [
          `${character_name}: It worked! The lock is disarmed!`,
          `Guide: Look at that brilliant light spilling out!`,
        ],
      },
      {
        panel_number: 5,
        title: outlinePanels[4].title,
        scene_description: outlinePanels[4].scene_description,
        image_prompt: outlinePanels[4].image_prompt,
        caption: `A brand-new era of discovery begins.`,
        narration: `This was not the end of ${character_name}'s quest—only the prologue.`,
        dialogue: [
          `${character_name}: We did it. The legend was real all along.`,
          `${character_name}: Our next adventure awaits right beyond that ridge!`,
        ],
      },
    ];
  }

  // Generate Images for all 5 panels
  completePanels.forEach((p) => {
    p.image_url = createMockPanelImage(p.panel_number, p.title, p.image_prompt, art_style);
  });

  // Generate PDF export
  const pdfUrl = createComicPdf({ title: storyTitle, panels: completePanels }, req);

  return {
    success: true,
    title: storyTitle,
    layout: completePanels,
    pdf_url: pdfUrl,
    character_name,
    setting,
    tone,
    art_style,
  };
}

// REST APIs
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    application: 'ComicCraft',
    version: '1.0.0',
    mock_mode: CONFIG.mockMode,
  });
});

app.get('/test-image', (req: Request, res: Response) => {
  const prompt = (req.query.prompt as string) || 'A brave explorer discovering glowing ruins';
  const imageUrl = createMockPanelImage(1, 'Test Panel', prompt, 'Comic Book');
  res.json({
    status: 'success',
    prompt,
    image_url: imageUrl,
    backend: CONFIG.imageBackend,
    mock_mode: CONFIG.mockMode,
  });
});

app.post('/generate-comic/json', async (req: Request, res: Response) => {
  try {
    const { story_prompt, character_name, setting, tone, art_style } = req.body;
    if (!story_prompt || story_prompt.length < 5) {
      return res.status(422).json({ error: 'story_prompt must be at least 5 characters long' });
    }
    if (!character_name || character_name.length < 1) {
      return res.status(422).json({ error: 'character_name is required' });
    }

    const comicResult = await generateComicStory({
      story_prompt,
      character_name,
      setting: setting || 'Enchanted Forest',
      tone: tone || 'Adventure',
      art_style: art_style || 'Comic Book',
    });

    return res.json(comicResult);
  } catch (err: any) {
    console.error('API generate error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Form submission handler
app.post('/generate', async (req: Request, res: Response) => {
  try {
    const { story_prompt, character_name, setting, tone, art_style } = req.body;
    const comicResult = await generateComicStory({
      story_prompt,
      character_name,
      setting,
      tone,
      art_style,
    });
    // Return json or redirect
    res.json(comicResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/export-success', (req: Request, res: Response) => {
  const pdfUrl = req.query.pdf_url || '#';
  const title = req.query.title || 'ComicCraft Story';
  res.send(`<!DOCTYPE html>
<html>
  <head><title>Export Success - ComicCraft</title></head>
  <body style="font-family: sans-serif; background: #0c0e14; color: #fff; text-align: center; padding: 50px;">
    <h1 style="color: #f5c518;">Export Complete!</h1>
    <p>Your comic "${title}" has been compiled into a PDF document.</p>
    <p><a href="${pdfUrl}" download style="background: #f5c518; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">Download PDF</a></p>
    <p><a href="/" style="color: #94a3b8;">Back to Comic Studio</a></p>
  </body>
</html>`);
});

// Setup Vite middleware in dev or serve dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(BASE_DIR, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(BASE_DIR, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ComicCraft running on http://0.0.0.0:${PORT}`);
    console.log(`API documentation available at http://0.0.0.0:${PORT}/docs`);
  });
}

startServer();
