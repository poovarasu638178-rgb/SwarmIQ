# SwarmIQ ⚡

**AI Agent Debate Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-%5E5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-%5E4.0-06B6D4?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-Cloud-f55036?style=flat)](https://groq.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat&logo=vercel)](https://swarmiqq.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](https://opensource.org/licenses/MIT)

[**Live Demo 🚀**](https://swarmiqq.vercel.app) &nbsp;&middot;&nbsp; [**GitHub Repository 📦**](https://github.com/poovarasu638178-rgb/SwarmIQ)

---

## 📖 Overview

SwarmIQ is a real-time, multi-agent AI debate platform designed to break through single-AI bias. Type any topic, and 7 specialized AI agents will debate it simultaneously. The system streams their deliberation live, runs background fact-checking against real web sources, analyzes trends, and delivers a highly nuanced final verdict. 

---

## 🤖 The 7 Agents

| Agent | Role | Description |
|---|---|---|
| **Moderator** | 🎙️ The Host | Frames the debate, sets the context, and defines the precise central question to be answered. |
| **Advocate** | ✅ The Proponent | Builds the strongest case *for* the topic, citing real trends and data. |
| **Opposition** | ❌ The Challenger | Builds the strongest case *against* the topic, bringing counter-evidence. |
| **Devil's Advocate**| 😈 The Provocateur| Challenges assumptions from both sides, introduces uncomfortable truths, and reframes the issue. |
| **Fact Checker** | 🔍 The Validator | Verifies claims as True, Partially True, or Misleading based on real-world data and busts common misconceptions. |
| **Data Analyst** | 📊 The Quant | Analyzes key statistics, identifies macro trends, and provides a 5-10 year projection. |
| **Judge** | ⚖️ The Arbiter | Synthesizes all perspectives into a final, evidence-based verdict with a confidence score. |

---

## ✨ Key Features

- **✅ Real-time SSE streaming:** Watch the agents deliberate live as they formulate their arguments.
- **✅ Live web search:** Built-in DuckDuckGo Lite scraper injects fresh, real-world context into the AI prompt.
- **✅ Model fallback cascade:** Automatically falls back through Groq models (`llama-3.3-70b` → `llama-3.1-70b` → `llama-3.1-8b` → `gemma2-9b`) if rate-limited.
- **✅ 3 depth modes:** Choose between Quick (concise), Standard (balanced), or Deep Dive (exhaustive research).
- **✅ Voice input:** Speak your topic directly into the app.
- **✅ PDF/Print export:** Generate clean, white-themed professional research reports.
- **✅ Neural network visualizer:** Interactive canvas showing how the agents connect and process information.
- **✅ Fully responsive:** Optimized for mobile, tablet, and desktop.

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **Backend & AI** | Groq SDK, Google Generative AI, Custom DuckDuckGo scraper |
| **Fonts** | Inter (UI), Lora (Serif) |

---

## 🏗 Architecture

```text
[User Input: Topic & Depth]
          │
          ▼
[API Route: /api/swarm] ─────────(SSE Stream)────────► [Frontend UI Updates Live]
          │
          ▼
[Web Search: DuckDuckGo Scraper] (Fetches Context)
          │
          ▼
[Prompt Construction]
          │
          ▼
[Groq LLM API]
  ├─ Try: llama-3.3-70b-versatile
  ├─ Fallback: llama-3.1-70b-versatile
  ├─ Fallback: llama-3.1-8b-instant
  └─ Fallback: gemma2-9b-it
          │
          ▼
[JSON Parsing & Source Injection]
          │
          ▼
[Render Final Results: 7 Agent Views]
```

---

## 📁 Project Structure

```text
SwarmIQ/
├── src/
│   ├── app/
│   │   ├── api/swarm/route.ts  # Backend API & AI orchestration
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main entry point
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ClientSwarm.tsx     # Core UI, debate engine, and print layout
│   │   └── NeuralNetwork.tsx   # Canvas-based network visualizer
├── public/                     # Static assets (icons, etc.)
├── .env                        # Environment variables (git-ignored)
├── tailwind.config             # Tailwind CSS configuration
└── package.json                # Dependencies and scripts
```

---

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/poovarasu638178-rgb/SwarmIQ.git
   cd SwarmIQ
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add your API keys:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📸 Screenshots

<!-- Add screenshot here: Landing page -->
![Landing Page Placeholder](https://via.placeholder.com/800x400?text=Landing+Page+Screenshot)

<!-- Add screenshot here: Live debate view -->
![Live Debate Placeholder](https://via.placeholder.com/800x400?text=Live+Debate+View+Screenshot)

<!-- Add screenshot here: Final verdict -->
![Final Verdict Placeholder](https://via.placeholder.com/800x400?text=Final+Verdict+Screenshot)

<!-- Add screenshot here: Fact check tab -->
![Fact Check Placeholder](https://via.placeholder.com/800x400?text=Fact+Check+Tab+Screenshot)

---

## 🏆 Hackathon Context

This project was built for the **Microsoft Build AI Hackathon 2026** under the **Agent Swarms** track. 

Current AI models often exhibit single-model bias — providing one unified "truth" even on highly nuanced topics. SwarmIQ solves this by forcing multiple AI agents into adversarial and analytical roles, creating a robust, multi-perspective debate that yields deeper insights than a standard chat prompt.

---

## 👤 Author

**Poovarasu S**
- 💼 [LinkedIn](https://www.linkedin.com/in/poovarasu-s638178)
- 📧 [poovarasu638178@gmail.com](mailto:poovarasu638178@gmail.com)
- 🐙 [GitHub](https://github.com/poovarasu638178-rgb)

---

## 📜 License

This project is licensed under the MIT License.
