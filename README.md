# ⚡ SwarmIQ — AI Agent Debate Platform
## Microsoft Build AI Hackathon 2026 | Agent Swarms

![Python](https://img.shields.io/badge/Python-3.12-blue) ![Streamlit](https://img.shields.io/badge/Streamlit-1.30+-red) ![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-green)

### What makes it unique
SwarmIQ is the world's first AI Agent Debate Platform. Unlike standard LLMs that provide a single, biased answer, SwarmIQ uses an orchestrated swarm of **7 specialized agents** to argue, challenge, and debate any topic like a panel of world-class experts, delivering a final verdict backed by real evidence.

### 🤖 The 7 Agent Swarm
- 🎙️ **Moderator:** Sets the rules and keeps the debate on track.
- 🟢 **Advocate (PRO):** Argues passionately FOR the topic with evidence.
- 🔴 **Opposition (CON):** Argues strongly AGAINST the topic, exposing weaknesses.
- 😈 **Devil's Advocate:** Challenges both sides with unpredictable, brilliant logic.
- 🔬 **Fact Checker:** Verifies claims using live web search (DuckDuckGo).
- 📊 **Analyst:** Provides data, trends, and historical context.
- ⚖️ **Judge:** Reviews the debate, scores both sides, and gives the Final Verdict.

### 🏛️ Architecture

```text
User Topic → 🎙️ Moderator
                 ↓
           🟢 Advocate (Web Search) ↔️ 🔴 Opposition (Web Search)
                 ↓
           😈 Devil's Advocate
                 ↓
           🔬 Fact Checker (Web Search)
                 ↓
           📊 Analyst (Web Search)
                 ↓
           ⚖️ Judge (Scores & Final Verdict) → 📄 PDF Report Generation
```

### 🚀 Setup in 3 Steps
1. Clone the repository and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set up your `.env` file with your GitHub token for Azure inference:
   ```bash
   cp .env.example .env
   # Add your GITHUB_TOKEN inside
   ```
3. Run the application:
   ```bash
   streamlit run app.py
   ```

### 💡 Example Debate Topics
- 🏦 "Should India ban cryptocurrency?"
- 🤖 "Will AI replace software engineers by 2030?"
- ☢️ "Is nuclear energy the future of clean power?"
- 🏠 "Is remote work better than office work?"
- 💉 "Should startups raise VC or bootstrap?"

### 🏆 Why SwarmIQ wins
- **Live Typing Animation:** Watch the agents debate in real-time.
- **Color-Coded UI:** Easy to follow PRO (green) and CON (red) arguments.
- **Real-World Evidence:** Fact-checking and analytics backed by live web searches.
- **Beautiful Export:** Professional PDF report generation for every debate.
- **Fault Tolerant:** Built-in fallbacks if search fails.
- **Enterprise UI:** Stunning dark-mode interface built for scale.

*Powered by SwarmIQ | Microsoft Build AI 2026*
