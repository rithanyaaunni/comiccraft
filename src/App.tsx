/**
 * ComicCraft – AI Comic Story Creator using Gemini Models
 * Frontend UI & Interactive Studio
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Download,
  Dice5,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Layers,
  Code2,
  FileText,
  AlertCircle
} from 'lucide-react';

interface ComicPanel {
  panel_number: number;
  title: string;
  scene_description: string;
  image_prompt: string;
  caption: string;
  narration: string;
  dialogue: string[];
  image_url: string;
}

interface ComicData {
  success: boolean;
  title: string;
  layout: ComicPanel[];
  pdf_url: string;
  character_name: string;
  setting: string;
  tone: string;
  art_style: string;
}

const SAMPLE_STORIES = [
  {
    prompt: 'A brave fox explores an enchanted forest and discovers a hidden magical city.',
    character: 'Luna',
    setting: 'Enchanted Forest',
    tone: 'Adventure',
    style: 'Comic Book',
  },
  {
    prompt: 'A young mechanic discovers a dormant starship robot in a futuristic scrap yard.',
    character: 'Zack',
    setting: 'Future City',
    tone: 'Light-hearted',
    style: 'Anime',
  },
  {
    prompt: 'An apprentice wizard accidentally turns the castle library into living flying origami birds.',
    character: 'Aria',
    setting: 'Ancient Kingdom',
    tone: 'Funny',
    style: 'Cartoon',
  },
  {
    prompt: 'A deep-sea diver discovers a glowing coral city guarded by a gentle aquatic leviathan.',
    character: 'Captain Kai',
    setting: 'Underwater World',
    tone: 'Mysterious',
    style: 'Fantasy Illustration',
  },
  {
    prompt: 'A solitary astronaut investigates a mysterious crystal obelisk hovering above Martian dunes.',
    character: 'Commander Vance',
    setting: 'Space',
    tone: 'Dramatic',
    style: 'Realistic',
  },
];

export default function App() {
  // Form fields
  const [storyPrompt, setStoryPrompt] = useState('A brave fox explores an enchanted forest and discovers a hidden magical city.');
  const [characterName, setCharacterName] = useState('Luna');
  const [setting, setSetting] = useState('Enchanted Forest');
  const [tone, setTone] = useState('Adventure');
  const [artStyle, setArtStyle] = useState('Comic Book');

  // Generator states
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [comic, setComic] = useState<ComicData | null>(null);
  const [currentReaderPanel, setCurrentReaderPanel] = useState(0);
  const [viewMode, setViewMode] = useState<'strip' | 'reader' | 'script'>('strip');

  // Test image modal state
  const [testImagePrompt, setTestImagePrompt] = useState('A brave explorer discovering glowing ruins, comic book style');
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);
  const [testImageLoading, setTestImageLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Cycling generation status steps
  const generationSteps = [
    'Connecting to Gemini Flash for 5-panel story arc...',
    'Gemini Pro expanding script, captions, and character dialogue...',
    'Enforcing visual continuity and consistent character traits...',
    'Rendering high-fidelity comic panel illustrations...',
    'Compiling layout and building downloadable PDF booklet...',
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % generationSteps.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSurpriseMe = () => {
    const random = SAMPLE_STORIES[Math.floor(Math.random() * SAMPLE_STORIES.length)];
    setStoryPrompt(random.prompt);
    setCharacterName(random.character);
    setSetting(random.setting);
    setTone(random.tone);
    setArtStyle(random.style);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyPrompt.trim() || !characterName.trim()) {
      setError('Please provide both a story prompt and character name.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/generate-comic/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_prompt: storyPrompt,
          character_name: characterName,
          setting,
          tone,
          art_style: artStyle,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || 'Failed to generate comic');
      }

      const data: ComicData = await response.json();
      setComic(data);
      setCurrentReaderPanel(0);
      // Scroll smoothly to preview
      setTimeout(() => {
        document.getElementById('comic-preview-anchor')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating your comic.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunTestImage = async () => {
    setTestImageLoading(true);
    try {
      const res = await fetch(`/test-image?prompt=${encodeURIComponent(testImagePrompt)}`);
      const data = await res.json();
      setTestImageUrl(data.image_url);
    } catch (err) {
      console.error(err);
    } finally {
      setTestImageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner Header */}
      <header className="bg-amber-400 border-b-4 border-black text-black px-6 py-4 relative shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-amber-400 rounded-lg flex items-center justify-center font-comic-title text-3xl font-extrabold border-2 border-black comic-shadow">
              C!
            </div>
            <div>
              <h1 className="font-comic-title text-4xl tracking-wider leading-none m-0">ComicCraft</h1>
              <p className="text-xs uppercase font-extrabold tracking-widest text-slate-800 m-0">
                AI Comic Story Creator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm font-bold">
            <button
              onClick={() => setShowTestModal(true)}
              className="px-3 py-1.5 bg-black text-amber-400 rounded border-2 border-black hover:bg-slate-900 transition flex items-center gap-1.5 comic-shadow-sm"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Test Image</span>
            </button>
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white text-black rounded border-2 border-black hover:bg-slate-100 transition flex items-center gap-1.5 comic-shadow-sm"
            >
              <Code2 className="w-4 h-4" />
              <span>API Docs</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <span className="font-mono text-xs px-2.5 py-1 bg-black text-amber-300 rounded border border-black uppercase font-bold">
              Gemini Flash & Pro
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-10">
        {/* Hero Section */}
        <section className="bg-amber-300 border-4 border-black rounded-xl p-8 md:p-12 text-black relative overflow-hidden comic-shadow-lg">
          <div className="comic-halftone absolute inset-0 opacity-20 pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-block bg-black text-amber-300 text-xs font-black uppercase px-3 py-1 border-2 border-black transform -rotate-1 comic-shadow-sm">
              5-Panel Sequential Storytelling Engine
            </div>
            <h2 className="font-comic-title text-4xl sm:text-6xl tracking-wide leading-tight drop-shadow-sm">
              Turn your imagination into a comic.
            </h2>
            <p className="font-comic-body text-xl md:text-2xl font-bold text-slate-900 leading-snug">
              Enter your story idea and our dual-stage Gemini pipeline will craft a five-panel comic strip complete with structured outline, character dialogue, captions, narrator voiceover, and custom illustrations!
            </p>
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs md:text-sm font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-black rounded-full" /> 1. Gemini Flash Outline
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-black rounded-full" /> 2. Gemini Pro Story & Dialogue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-black rounded-full" /> 3. Character Consistency
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-black rounded-full" /> 4. High-Res PDF Export
              </span>
            </div>
          </div>
        </section>

        {/* Error notification */}
        {error && (
          <div className="bg-red-500/90 border-3 border-black text-white p-4 rounded-lg flex items-center gap-3 comic-shadow">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div className="font-medium text-sm">{error}</div>
          </div>
        )}

        {/* Comic Creation Form */}
        <section className="bg-slate-900 border-4 border-black rounded-xl p-6 md:p-10 comic-shadow-lg">
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-comic-title text-3xl text-amber-400 tracking-wide m-0">
                Comic Creation Studio
              </h3>
              <p className="text-slate-400 text-sm mt-0.5">
                Configure your story premise, protagonist, and visual aesthetics.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSurpriseMe}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border-2 border-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 transition"
            >
              <Dice5 className="w-4 h-4" />
              <span>Surprise Me With An Idea</span>
            </button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Story Prompt */}
            <div>
              <label htmlFor="story_prompt" className="font-comic-title text-xl text-slate-100 flex items-center gap-2 mb-1.5">
                Story Prompt <span className="text-amber-400 font-sans text-xs font-normal">(Core premise / idea)</span>
              </label>
              <textarea
                id="story_prompt"
                rows={3}
                required
                minLength={5}
                maxLength={2000}
                value={storyPrompt}
                onChange={(e) => setStoryPrompt(e.target.value)}
                placeholder="e.g. A brave fox explores an enchanted forest and discovers a hidden magical city."
                className="w-full bg-slate-950 border-3 border-slate-700 focus:border-amber-400 rounded-lg p-3.5 text-white font-sans text-base focus:outline-none transition"
              />
            </div>

            {/* Character & Setting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="char_name" className="font-comic-title text-xl text-slate-100 block mb-1.5">
                  Main Character <span className="text-amber-400 font-sans text-xs font-normal">(Name)</span>
                </label>
                <input
                  type="text"
                  id="char_name"
                  required
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="e.g. Luna"
                  className="w-full bg-slate-950 border-3 border-slate-700 focus:border-amber-400 rounded-lg p-3 text-white font-sans focus:outline-none transition"
                />
              </div>

              <div>
                <label htmlFor="setting_select" className="font-comic-title text-xl text-slate-100 block mb-1.5">
                  Setting <span className="text-amber-400 font-sans text-xs font-normal">(World backdrop)</span>
                </label>
                <select
                  id="setting_select"
                  value={setting}
                  onChange={(e) => setSetting(e.target.value)}
                  className="w-full bg-slate-950 border-3 border-slate-700 focus:border-amber-400 rounded-lg p-3 text-white font-sans focus:outline-none transition"
                >
                  <option value="Enchanted Forest">Enchanted Forest</option>
                  <option value="School">School</option>
                  <option value="Future City">Future City</option>
                  <option value="Space">Space</option>
                  <option value="Underwater World">Underwater World</option>
                  <option value="Ancient Kingdom">Ancient Kingdom</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Tone & Art Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="tone_select" className="font-comic-title text-xl text-slate-100 block mb-1.5">
                  Tone <span className="text-amber-400 font-sans text-xs font-normal">(Emotional mood)</span>
                </label>
                <select
                  id="tone_select"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-slate-950 border-3 border-slate-700 focus:border-amber-400 rounded-lg p-3 text-white font-sans focus:outline-none transition"
                >
                  <option value="Light-hearted">Light-hearted</option>
                  <option value="Funny">Funny</option>
                  <option value="Dramatic">Dramatic</option>
                  <option value="Poetic">Poetic</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Mysterious">Mysterious</option>
                </select>
              </div>

              <div>
                <label htmlFor="art_select" className="font-comic-title text-xl text-slate-100 block mb-1.5">
                  Art Style <span className="text-amber-400 font-sans text-xs font-normal">(Illustration look)</span>
                </label>
                <select
                  id="art_select"
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full bg-slate-950 border-3 border-slate-700 focus:border-amber-400 rounded-lg p-3 text-white font-sans focus:outline-none transition"
                >
                  <option value="Comic Book">Comic Book</option>
                  <option value="Anime">Anime</option>
                  <option value="Cartoon">Cartoon</option>
                  <option value="Pixel Art">Pixel Art</option>
                  <option value="Fantasy Illustration">Fantasy Illustration</option>
                  <option value="Realistic">Realistic</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-comic-title text-2xl tracking-wider rounded-xl border-4 border-black transition comic-shadow flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin text-black" />
                    <span>Creating your comic...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-black" />
                    <span>✨ Generate My Comic</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Loading Animation Box */}
          {loading && (
            <div className="mt-8 p-8 bg-amber-400 border-4 border-black rounded-xl text-black text-center comic-shadow animate-pulse">
              <div className="w-12 h-12 border-4 border-black border-t-white rounded-full animate-spin mx-auto mb-4" />
              <h4 className="font-comic-title text-3xl tracking-wide m-0">Creating your comic...</h4>
              <p className="font-comic-body font-bold text-lg mt-2 text-slate-900">
                {generationSteps[loadingStep]}
              </p>
              <div className="flex justify-center items-center gap-2 mt-4 font-comic-title text-sm">
                {[1, 2, 3, 4, 5].map((num) => (
                  <span
                    key={num}
                    className={`px-3 py-1 rounded border-2 border-black ${
                      loadingStep + 1 >= num ? 'bg-black text-amber-300' : 'bg-amber-200 text-slate-700'
                    }`}
                  >
                    PANEL {num}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Comic Preview Area */}
        {comic && (
          <section id="comic-preview-anchor" className="space-y-6">
            {/* Comic Header & Actions bar */}
            <div className="bg-slate-900 border-4 border-black rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 comic-shadow-lg">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-amber-400 text-black font-extrabold text-xs px-2.5 py-0.5 rounded border border-black uppercase">
                    5-Panel Complete Strip
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    Style: {comic.art_style} • Tone: {comic.tone}
                  </span>
                </div>
                <h3 className="font-comic-title text-4xl sm:text-5xl text-amber-400 tracking-wider m-0">
                  {comic.title}
                </h3>
                <p className="text-slate-300 text-sm mt-1">
                  Starring <strong className="text-white">{comic.character_name}</strong> in the world of{' '}
                  <strong className="text-white">{comic.setting}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* View Mode Toggle */}
                <div className="bg-slate-950 p-1 border-2 border-slate-700 rounded-lg flex items-center">
                  <button
                    onClick={() => setViewMode('strip')}
                    className={`px-3 py-1.5 text-xs font-bold rounded ${
                      viewMode === 'strip' ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Full Strip
                  </button>
                  <button
                    onClick={() => setViewMode('reader')}
                    className={`px-3 py-1.5 text-xs font-bold rounded ${
                      viewMode === 'reader' ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Panel Reader
                  </button>
                  <button
                    onClick={() => setViewMode('script')}
                    className={`px-3 py-1.5 text-xs font-bold rounded ${
                      viewMode === 'script' ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Script View
                  </button>
                </div>

                {/* PDF Download Button */}
                <a
                  href={comic.pdf_url}
                  download
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-comic-title text-lg tracking-wider rounded-lg border-3 border-black transition comic-shadow flex items-center gap-2"
                >
                  <Download className="w-5 h-5 text-black" />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>

            {/* View Mode: Full 5-Panel Strip */}
            {viewMode === 'strip' && (
              <div className="space-y-8">
                {comic.layout.map((panel) => (
                  <article
                    key={panel.panel_number}
                    className="bg-slate-900 border-4 border-black rounded-xl overflow-hidden comic-shadow-lg"
                  >
                    {/* Panel Header */}
                    <div className="bg-amber-400 border-b-4 border-black px-6 py-2.5 flex items-center justify-between text-black">
                      <div className="flex items-center gap-3">
                        <span className="font-comic-title text-2xl tracking-wider">
                          PANEL {panel.panel_number}
                        </span>
                        <span className="text-black font-bold text-xs uppercase tracking-widest bg-black text-amber-400 px-2 py-0.5 border border-black">
                          {panel.title}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        #0{panel.panel_number} OF 05
                      </span>
                    </div>

                    {/* Panel Grid: Visual + Script */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                      {/* Image frame */}
                      <div className="lg:col-span-7 flex flex-col justify-center">
                        <div className="border-4 border-black rounded bg-black overflow-hidden relative comic-shadow">
                          <img
                            src={panel.image_url}
                            alt={`Panel ${panel.panel_number} - ${panel.title}`}
                            className="w-full h-auto aspect-[3/2] object-cover block"
                          />
                        </div>
                        <div className="mt-2 text-xs text-slate-400 font-mono italic">
                          Prompt: {panel.image_prompt}
                        </div>
                      </div>

                      {/* Text Column */}
                      <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                        {/* Caption Box */}
                        {panel.caption && (
                          <div className="border-2 border-amber-500 bg-amber-100 text-amber-950 p-3 rounded comic-shadow-sm">
                            <span className="text-[10px] font-black uppercase tracking-wider block text-amber-800 mb-0.5">
                              Caption
                            </span>
                            <p className="font-comic-body text-base font-bold m-0 leading-tight">
                              {panel.caption}
                            </p>
                          </div>
                        )}

                        {/* Scene Description */}
                        <div className="bg-slate-950 border-l-4 border-slate-600 p-3 rounded-r text-sm text-slate-300">
                          <strong className="text-amber-300 font-sans text-xs uppercase tracking-wide block mb-1">
                            Scene:
                          </strong>
                          <p className="m-0 leading-relaxed font-sans text-slate-300">
                            {panel.scene_description}
                          </p>
                        </div>

                        {/* Narration Voiceover */}
                        {panel.narration && (
                          <div className="bg-indigo-950/70 border border-indigo-700/60 p-3 rounded text-sm text-indigo-200 italic">
                            <strong className="text-indigo-400 font-sans text-xs uppercase not-italic tracking-wide block mb-1">
                              Narration:
                            </strong>
                            "{panel.narration}"
                          </div>
                        )}

                        {/* Dialogue Speech Bubbles */}
                        {panel.dialogue && panel.dialogue.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                              Dialogue:
                            </span>
                            {panel.dialogue.map((line, idx) => (
                              <div
                                key={idx}
                                className="bg-white text-slate-950 font-comic-body font-bold text-base px-4 py-2.5 border-2 border-black rounded-2xl comic-shadow-sm relative"
                              >
                                {line}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* View Mode: Interactive Single-Panel Reader */}
            {viewMode === 'reader' && (
              <div className="bg-slate-900 border-4 border-black rounded-xl p-6 comic-shadow-lg">
                <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-comic-title text-3xl text-amber-400">
                      Panel #{comic.layout[currentReaderPanel].panel_number}:{' '}
                      {comic.layout[currentReaderPanel].title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentReaderPanel((prev) => Math.max(0, prev - 1))}
                      disabled={currentReaderPanel === 0}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded border border-slate-600 text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-mono text-sm px-2">
                      {currentReaderPanel + 1} / 5
                    </span>
                    <button
                      onClick={() => setCurrentReaderPanel((prev) => Math.min(4, prev + 1))}
                      disabled={currentReaderPanel === 4}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded border border-slate-600 text-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-8">
                    <div className="border-4 border-black rounded bg-black overflow-hidden comic-shadow-lg">
                      <img
                        src={comic.layout[currentReaderPanel].image_url}
                        alt={`Panel ${currentReaderPanel + 1}`}
                        className="w-full h-auto aspect-[3/2] object-cover block"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-4">
                    {comic.layout[currentReaderPanel].caption && (
                      <div className="border-2 border-amber-500 bg-amber-100 text-amber-950 p-4 rounded comic-shadow-sm">
                        <strong className="text-xs uppercase tracking-wide block text-amber-800 mb-1">
                          Caption
                        </strong>
                        <p className="font-comic-body text-lg font-bold m-0 leading-tight">
                          {comic.layout[currentReaderPanel].caption}
                        </p>
                      </div>
                    )}

                    <div className="bg-slate-950 p-4 rounded border-l-4 border-amber-400">
                      <strong className="text-xs text-amber-400 uppercase tracking-wide block mb-1">
                        Scene Action
                      </strong>
                      <p className="text-sm text-slate-300 m-0">
                        {comic.layout[currentReaderPanel].scene_description}
                      </p>
                    </div>

                    {comic.layout[currentReaderPanel].dialogue.map((dlg, i) => (
                      <div
                        key={i}
                        className="bg-white text-black font-comic-body font-bold text-base p-3 rounded-2xl border-2 border-black comic-shadow-sm"
                      >
                        {dlg}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* View Mode: Raw Script & Prompts */}
            {viewMode === 'script' && (
              <div className="bg-slate-900 border-4 border-black rounded-xl p-6 comic-shadow-lg space-y-6">
                <h4 className="font-comic-title text-2xl text-amber-400 m-0">Production Script & AI Prompts</h4>
                <div className="space-y-4 font-mono text-sm">
                  {comic.layout.map((p) => (
                    <div key={p.panel_number} className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
                      <div className="text-amber-400 font-bold">
                        PANEL {p.panel_number}: {p.title.toUpperCase()}
                      </div>
                      <div className="text-slate-300"><span className="text-slate-500">SCENE:</span> {p.scene_description}</div>
                      <div className="text-amber-200"><span className="text-slate-500">CAPTION:</span> {p.caption}</div>
                      <div className="text-indigo-300"><span className="text-slate-500">NARRATION:</span> {p.narration}</div>
                      <div className="text-emerald-300">
                        <span className="text-slate-500">DIALOGUE:</span> {p.dialogue.join(' | ')}
                      </div>
                      <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <span className="text-amber-500 font-semibold">IMAGE PROMPT:</span> {p.image_prompt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions Card */}
            <div className="bg-amber-400 border-4 border-black rounded-xl p-8 text-black flex flex-col sm:flex-row items-center justify-between gap-6 comic-shadow-lg">
              <div>
                <h4 className="font-comic-title text-3xl m-0">Keep this 5-panel story?</h4>
                <p className="font-semibold text-slate-900 text-sm mt-1">
                  Download the high-resolution printable PDF or create another adventure with fresh characters!
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={comic.pdf_url}
                  download
                  className="px-6 py-3 bg-black text-amber-400 font-comic-title text-xl tracking-wider rounded-lg border-2 border-black hover:bg-slate-900 transition"
                >
                  Download PDF
                </a>
                <button
                  onClick={() => {
                    setComic(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-3 bg-white text-black font-bold text-sm rounded-lg border-2 border-black hover:bg-slate-100 transition"
                >
                  Create Another Comic
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Test Image Generator Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-4 border-black rounded-xl max-w-xl w-full p-6 comic-shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-comic-title text-2xl text-amber-400 m-0">Test Image Studio</h4>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-300 uppercase tracking-wide block mb-1 font-bold">
                Test Prompt
              </label>
              <textarea
                rows={2}
                value={testImagePrompt}
                onChange={(e) => setTestImagePrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <button
              onClick={handleRunTestImage}
              disabled={testImageLoading}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold rounded border-2 border-black transition flex items-center justify-center gap-2"
            >
              {testImageLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              <span>Generate Test Illustration</span>
            </button>

            {testImageUrl && (
              <div className="mt-4 border-2 border-black rounded overflow-hidden">
                <img src={testImageUrl} alt="Test panel" className="w-full aspect-[3/2] object-cover" />
                <div className="p-2 bg-slate-950 text-xs font-mono text-slate-400 break-all">
                  URL: {testImageUrl}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t-4 border-black bg-slate-950 text-slate-400 py-6 px-4 text-center text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="m-0">
            © ComicCraft • Powered by Google Gemini Flash, Gemini Pro, & Hugging Face
          </p>
          <div className="flex items-center gap-4 font-mono">
            <a href="/docs" target="_blank" className="hover:text-amber-400 transition">
              Swagger /docs
            </a>
            <span>•</span>
            <a href="/redoc" target="_blank" className="hover:text-amber-400 transition">
              ReDoc
            </a>
            <span>•</span>
            <a href="/health" target="_blank" className="hover:text-amber-400 transition">
              Health Status
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
