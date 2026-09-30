/**
 * ComicCraft Client Script
 * Handles loading state transitions, random idea generator, and form submission.
 */

document.addEventListener("DOMContentLoaded", () => {
    const comicForm = document.getElementById("comicForm");
    const btnSubmit = document.getElementById("btnSubmit");
    const btnText = document.getElementById("btnText");
    const btnIcon = document.getElementById("btnIcon");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingStage = document.getElementById("loadingStage");
    const btnRandomPrompt = document.getElementById("btnRandomPrompt");
    const promptInput = document.getElementById("story_prompt");
    const charInput = document.getElementById("character_name");
    const settingSelect = document.getElementById("setting");
    const toneSelect = document.getElementById("tone");
    const styleSelect = document.getElementById("art_style");

    const sampleIdeas = [
        {
            prompt: "A young mechanic discovers a dormant starship robot in the junkyard that suddenly wakes up.",
            char: "Zack",
            setting: "Future City",
            tone: "Adventure",
            style: "Comic Book"
        },
        {
            prompt: "An apprentice wizard accidentally turns the magic library into a realm of flying book creatures.",
            char: "Aria",
            setting: "Ancient Kingdom",
            tone: "Funny",
            style: "Anime"
        },
        {
            prompt: "A deep-sea biologist encounters a glowing leviathan protecting a sunken crystal city.",
            char: "Kaelen",
            setting: "Underwater World",
            tone: "Mysterious",
            style: "Fantasy Illustration"
        },
        {
            prompt: "A rebellious student finds a secret laboratory beneath the school gymnasium.",
            char: "Maya",
            setting: "School",
            tone: "Light-hearted",
            style: "Cartoon"
        },
        {
            prompt: "An intrepid astronaut is pulled through a cosmic wormhole into an ancient astral amphitheater.",
            char: "Commander Vance",
            setting: "Space",
            tone: "Dramatic",
            style: "Realistic"
        }
    ];

    if (btnRandomPrompt && promptInput) {
        btnRandomPrompt.addEventListener("click", () => {
            const randomSample = sampleIdeas[Math.floor(Math.random() * sampleIdeas.length)];
            promptInput.value = randomSample.prompt;
            if (charInput) charInput.value = randomSample.char;
            if (settingSelect) settingSelect.value = randomSample.setting;
            if (toneSelect) toneSelect.value = randomSample.tone;
            if (styleSelect) styleSelect.value = randomSample.style;
        });
    }

    if (comicForm && btnSubmit) {
        comicForm.addEventListener("submit", (e) => {
            // Disable button and show loading state
            btnSubmit.disabled = true;
            btnSubmit.classList.add("opacity-50", "cursor-not-allowed");
            if (btnText) btnText.textContent = "Creating your comic...";
            if (btnIcon) btnIcon.textContent = "⏳";

            if (loadingOverlay) {
                loadingOverlay.classList.remove("hidden");
                loadingOverlay.scrollIntoView({ behavior: "smooth" });

                // Cycle realistic progress stages while waiting
                const stages = [
                    "Engaging Gemini Flash for the 5-panel story arc...",
                    "Gemini Pro drafting dialogue, narration, and captions...",
                    "Locking character consistency across all 5 panels...",
                    "Generating comic illustrations...",
                    "Compiling panel speech bubbles and PDF export..."
                ];
                let currentIdx = 0;
                setInterval(() => {
                    currentIdx = (currentIdx + 1) % stages.length;
                    if (loadingStage) {
                        loadingStage.textContent = stages[currentIdx];
                    }
                }, 3500);
            }
        });
    }
});
