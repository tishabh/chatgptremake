# ChatGPT Remake (with OpenRouter, Gemini, Copilot & Meta AI)

A pixel-perfect, fully functional remake of the **ChatGPT** web application (`https://chatgpt.com/`), featuring:

1. **OpenRouter Free Models**: Connect with your OpenRouter key for free access to models like NVIDIA Nemotron 3.5 Lightning (with live thought streams), Liquid LFM 2.5, and Google Gemma 4 31B.
2. **Google Gemini Free Models**: Official Google AI Studio integration supporting `gemini-2.5-flash`, `gemini-2.0-flash`, and `gemini-3.8-flash` with smart auto-failover and 0-second stall recovery.
3. **GitHub Copilot Authentication**: Official GitHub Device Flow OAuth for **GPT-4o**, **Claude 3.5 Sonnet**, and **o3-mini** / **o1** using your GitHub Copilot subscription.
4. **Meta AI Developer API**: Integration with Meta AI Muse Spark 1.3, Muse Wonder 1.0, and SAM 3.1.

---

## ✨ Features

- **ChatGPT UI & Aesthetics**:
  - Collapsible left sidebar with conversation history grouped by *Today*, *Yesterday*, *Previous 7 Days*, and *Older*.
  - Full conversation management: rename chats, delete chats, search chat history, and clear all.
  - Floating bottom input pill (`#2f2f2f`) with auto-expanding textarea, stop button, and disclaimer.
  - Top bar model selector dropdown categorized by OpenRouter, Google Gemini, GitHub Copilot, and Meta AI.
  - Prompt suggestions grid (*"Code a project"*, *"Brainstorm ideas"*, *"Summarize or explain"*, *"Plan & Design"*).
  - Multimodal file uploads (images, PDFs, text, code files) with visual chip previews.
  - Built-in Voice Dictation (Speech-to-Text) with Web Speech API.
  - Dark / Light / System theme switching.
  - Custom system prompt & temperature configuration.

- **Markdown & Math Formula Rendering**:
  - Full GitHub-Flavored Markdown (tables, checklists, blockquotes, bold/italic).
  - Code blocks with language header and 1-click **Copy code** button.
  - LaTeX mathematical equations rendered via KaTeX.
  - Collapsible **Thought Process (Reasoning)** drawer for reasoning models.
  - Text-to-speech (read aloud) audio playback of assistant responses.
  - Message editing and re-generation with branching.

- **AI Providers Supported**:
  - **OpenRouter (Free Tier)**:
    - `nvidia/nemotron-3.5-lightning:free` (Fast reasoning & code with real-time thought breakdown)
    - `liquid/lfm-2.5-2.6b:free` (Instant responses)
    - `google/gemma-4-31b-it:free` (Google open flagship)
    - `nvidia/nemotron-3.5-super-vl:free` (Multimodal vision)
  - **Google Gemini**:
    - `gemini-2.5-flash` (Recommended - sub-second generation)
    - `gemini-2.0-flash` (Fast, high rate limits)
    - `gemini-3.8-flash` (Next-gen preview with auto-failover)
  - **GitHub Copilot**:
    - `gpt-4o` (OpenAI Flagship)
    - `claude-3.5-sonnet` (Anthropic Flagship for code & analysis)
    - `o3-mini` (Specialized STEM and coding reasoning)
    - `o1` (Complex deep problem solving)
    - `gpt-4o-mini` (Fast everyday model)
  - **Meta AI**:
    - `muse-spark-1.3` (Meta fast chat and coding model)
    - `muse-wonder-1.0` (Creative and complex reasoning assistant)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Or configure your keys directly inside the Settings modal in the web app!)*

### 3. Start Both Backend & Frontend
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 🔑 Authentication & Keys

### OpenRouter (Free)
1. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Open **Settings** (gear icon) -> **OpenRouter (Free)** tab, paste your key, and click **Save Key**.

### Google Gemini (Free)
1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Click **Create API Key** (instant, free, no credit card required).
3. Open **Settings** -> **Google Gemini API** tab, paste the key (`AIzaSy...`), and click **Test & Save**.

### GitHub Copilot
1. Click **Copilot Login** in the top header or select a Copilot model.
2. An interactive GitHub Device Code modal appears with your device code (e.g., `ABCD-1234`).
3. Click **Copy Code & Open GitHub** to authenticate at `https://github.com/login/device`.
4. As soon as you approve on GitHub, the app detects authorization automatically, loads your profile, and unlocks **GPT-4o**, **Claude 3.5 Sonnet**, and **o3-mini**!

### Meta AI
1. Obtain an API key from [dev.meta.ai](https://dev.meta.ai).
2. Open **Settings** -> **Meta AI** tab, paste your key (`LLM_...`), and test connection.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, KaTeX, React Markdown
- **Backend**: Express, TypeScript, Node Fetch Streaming, Server-Sent Events (SSE)
