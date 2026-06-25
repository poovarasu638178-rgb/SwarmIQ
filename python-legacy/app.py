import streamlit as st
import os
import time
import re
from datetime import datetime
from openai import OpenAI
from duckduckgo_search import DDGS
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from io import BytesIO

load_dotenv()

client = OpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key=os.getenv("GITHUB_TOKEN")
)
MODEL = "gpt-4o-mini"

st.set_page_config(
    page_title="SwarmIQ",
    page_icon="⚡",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ─── Agent definitions ────────────────────────────────────────────────────────
AGENTS = [
    {
        "id": "moderator", "name": "Moderator", "emoji": "🎙️",
        "role": "MODERATOR", "color": "#f59e0b",
        "system": "You are the Moderator. Introduce the debate topic, set the rules briefly, and invite the PRO advocate to begin. Professional, neutral, under 100 words."
    },
    {
        "id": "advocate", "name": "Advocate", "emoji": "✅",
        "role": "PRO", "color": "#22c55e",
        "system": "You are the Advocate (PRO). Strongly support the topic. Use the provided web search context to make 3 compelling, evidence-backed arguments. Persuasive and passionate. Under 200 words."
    },
    {
        "id": "opposition", "name": "Opposition", "emoji": "❌",
        "role": "CON", "color": "#ef4444",
        "system": "You are the Opposition (CON). Strongly oppose the topic. Challenge the PRO arguments using web search context. Present 3 sharp counter-arguments. Under 200 words."
    },
    {
        "id": "devils_advocate", "name": "Devil's Advocate", "emoji": "😈",
        "role": "CHALLENGER", "color": "#8b5cf6",
        "system": "You are the Devil's Advocate. Challenge both PRO and CON. Ask uncomfortable questions, expose fallacies, introduce a surprising alternative. Provocative and unpredictable. Under 150 words."
    },
    {
        "id": "fact_checker", "name": "Fact Checker", "emoji": "🔬",
        "role": "VERIFIER", "color": "#3b82f6",
        "system": "You are the Fact Checker. Review the main claims from PRO and CON against web search context. Rate 3 major claims as TRUE, FALSE, or MIXED. Use ✅ ❌ ⚠️. Under 150 words."
    },
    {
        "id": "analyst", "name": "Analyst", "emoji": "📊",
        "role": "DATA", "color": "#f97316",
        "system": "You are the Analyst. Provide key statistics, trends, and historical context from the web. Project future implications. Data-driven, bullet points. Under 150 words."
    },
    {
        "id": "judge", "name": "Judge", "emoji": "⚖️",
        "role": "VERDICT", "color": "#6366f1",
        "system": "You are the Judge. Review the entire debate. Score PRO and CON out of 10. Include EXACTLY: 'PRO SCORE: X/10' and 'CON SCORE: Y/10'. Declare a winner. Give a FINAL VERDICT with top 3 insights. Under 250 words."
    },
]

CHIPS = [
    ("🏦", "Crypto ban in India?"),
    ("🤖", "AI vs Engineers"),
    ("☢️", "Nuclear Energy"),
    ("🏠", "Remote Work"),
    ("📱", "Social Media"),
]

# ─── CSS ─────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* ── Reset & Base ── */
*, *::before, *::after { box-sizing: border-box; }
* { margin-block-start: 0; margin-block-end: 0; }
p  { margin: 4px 0; font-size: 15px; line-height: 1.6; }
li { margin: 3px 0; font-size: 15px; line-height: 1.6; }
ul, ol { margin: 8px 0; padding-left: 20px; }

html, body, [data-testid="stAppViewContainer"],
[data-testid="stApp"] {
    background-color: #1a1a1a !important;
    color: #ececec;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.6;
}

/* Centered layout */
[data-testid="stAppViewBlockContainer"] {
    max-width: 720px !important;
    margin: 0 auto !important;
    padding: 0 24px 60px 24px !important;
}
[data-testid="stMain"] { padding: 0 !important; }

/* Kill gap between streamlit elements */
[data-testid="stVerticalBlock"] > div { gap: 0 !important; }
.element-container { margin-bottom: 0 !important; padding-bottom: 0 !important; }
.stMarkdown { margin-bottom: 0 !important; }

/* Hide sidebar toggle */
[data-testid="collapsedControl"] { display: none !important; }
section[data-testid="stSidebar"] { display: none !important; }

/* ── Title section ── */
.swarmiq-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 72px 0 40px 0;
    text-align: center;
}
.swarmiq-title {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.5px;
    margin: 0 0 10px 0;
}
.swarmiq-subtitle {
    font-size: 15px;
    color: #666;
    margin: 0;
}

/* ── Input box (Claude style) ── */
.input-wrapper {
    width: 100%;
    background: #222;
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 12px;
    transition: border-color 0.15s;
}
.input-wrapper:focus-within { border-color: #555; }

.stSelectbox > div > div {
    background: #222 !important;
    color: #ececec !important;
    border: none !important;
    border-radius: 12px !important;
    font-size: 16px !important;
    padding: 14px 18px !important;
    box-shadow: none !important;
}
.stSelectbox label { display: none !important; }
[data-testid="stSelectbox"] { margin: 0 !important; }
[data-testid="stSelectbox"] > div { border: none !important; background: transparent !important; }

.stTextInput input {
    background: #222 !important;
    color: #ececec !important;
    border: 1px solid transparent !important;
    border-radius: 12px !important;
    font-size: 16px !important;
    padding: 16px 20px !important;
    box-shadow: none !important;
    outline: none !important;
    width: 100%;
    min-height: 56px !important;
    transition: border-color 0.15s ease;
}
.stTextInput input::placeholder { color: #555; }
.stTextInput input:focus { border: 1px solid #6366f1 !important; box-shadow: none !important; }
.stTextInput label { display: none !important; }
.stTextInput { margin: 0 !important; }

/* ── Chips ── */
.chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-bottom: 32px;
}
.chip {
    background: #252525;
    border: 1px solid #333;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    color: #ccc;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}
.chip:hover { background: #333; border-color: #444; }

/* ── Streamlit button override ── */
.stButton > button {
    background: #252525 !important;
    color: #ccc !important;
    border: 1px solid #333 !important;
    border-radius: 20px !important;
    font-size: 13px !important;
    font-weight: 400 !important;
    padding: 6px 14px !important;
    box-shadow: none !important;
    transition: background 0.15s, border-color 0.15s;
}
.stButton > button:hover {
    background: #333 !important;
    border-color: #444 !important;
    color: #eee !important;
}
.stButton > button[kind="primary"] {
    background: #4f46e5 !important;
    color: #fff !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    padding: 10px 24px !important;
    width: auto !important;
    float: right;
}
.stButton > button[kind="primary"]:hover { background: #4338ca !important; }

/* ── Divider ── */
.divider { height: 1px; background: #262626; margin: 24px 0; }

/* ── Arena header ── */
.arena-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #262626;
}
.arena-title { font-size: 16px; font-weight: 600; color: #ececec; }
.arena-topic { font-size: 13px; color: #555; margin-left: auto; max-width: 340px;
               overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
.live-dot {
    width: 7px; height: 7px;
    background: #ef4444; border-radius: 50%;
    animation: blink 1.8s infinite;
    display: inline-block; flex-shrink: 0;
}
.live-label { font-size: 11px; color: #ef4444; font-weight: 600; letter-spacing: 0.5px; }

/* ── Pipeline ── */
.pipeline-wrap {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 0 28px 0;
}
.pipe-node {
    display: flex; flex-direction: column; align-items: center;
    position: relative; min-width: 56px;
}
.pipe-circle {
    width: 28px; height: 28px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
}
@keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
    70%  { box-shadow: 0 0 0 5px rgba(255,255,255,0); }
    100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
}
.pipe-label {
    position: absolute; top: 34px;
    font-size: 9px; color: #555;
    text-transform: uppercase; letter-spacing: 0.06em;
    white-space: nowrap;
}
.pipe-line { flex: 1; height: 1px; background: #262626; margin-top: -16px; }

/* ── GitHub-style Tabs ── */
[data-testid="stTabs"] [role="tablist"] {
    border-bottom: 1px solid #262626 !important;
    gap: 0 !important;
    background: transparent !important;
    margin-bottom: 16px !important;
}
[data-testid="stTabs"] button {
    background: transparent !important;
    border: none !important;
    border-bottom: 2px solid transparent !important;
    border-radius: 0 !important;
    color: #555 !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    padding: 8px 14px !important;
    margin-bottom: -1px !important;
}
[data-testid="stTabs"] button[aria-selected="true"] {
    color: #ececec !important;
    border-bottom-color: #ececec !important;
}
[data-testid="stTabs"] button:hover { color: #999 !important; }

/* ── Agent cards ── */
.card {
    background: #1e1e1e;
    border: 1px solid #262626;
    border-radius: 10px;
    margin-bottom: 12px;
    overflow: hidden;
    position: relative;
}
.card-accent {
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 3px; border-radius: 10px 0 0 10px;
}
.card-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 14px 10px 16px;
    border-bottom: 1px solid #262626;
}
.card-left { display: flex; align-items: center; gap: 8px; }
.card-name { font-weight: 600; font-size: 13px; color: #ececec; }
.card-role { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.06em; }
.card-time { font-size: 11px; color: #555; font-family: ui-monospace, monospace; }
.card-body { padding: 12px 14px 12px 16px; font-size: 14px; line-height: 1.65; color: #bbb; }
.card-body p  { margin: 4px 0; }
.card-body li { margin: 3px 0; }
.card-body ul, .card-body ol { margin: 6px 0; padding-left: 18px; }

/* ── Scoreboard row ── */
.score-inline {
    display: flex; gap: 20px;
    font-family: ui-monospace, monospace;
    font-size: 12px; margin-bottom: 20px;
}
.score-item { display: flex; align-items: center; gap: 8px; }
.score-pro { color: #22c55e; }
.score-con { color: #ef4444; }
.score-label { color: #555; }

/* ── Verdict ── */
.verdict-card {
    background: #1e1e1e; border: 1px solid #262626;
    border-radius: 10px; padding: 20px; margin-bottom: 16px;
}
.verdict-winner { font-size: 16px; font-weight: 700; color: #ececec; margin-bottom: 2px; }
.verdict-sub { font-size: 12px; color: #555; }
.verdict-divider { height: 1px; background: #262626; margin: 14px 0; }
.verdict-row { display: flex; align-items: center; font-size: 13px; margin-bottom: 6px; font-family: ui-monospace, monospace; }
.verdict-lbl { width: 80px; color: #555; }
.verdict-pro { color: #22c55e; }
.verdict-con { color: #ef4444; }

/* ── New debate button area ── */
.new-debate-wrap { display: flex; gap: 10px; margin-top: 20px; }

/* scrollbar */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #1a1a1a; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
</style>
""", unsafe_allow_html=True)

# ─── Helpers ─────────────────────────────────────────────────────────────────
def search_web(query, max_results=3):
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            return "No web results found. Use internal knowledge."
        parts = []
        for r in results:
            parts.append(
                f"Title: {r.get('title','')}\n"
                f"Snippet: {r.get('body', r.get('snippet',''))}\n"
                f"Link: {r.get('href', r.get('link',''))}"
            )
        return "\n\n".join(parts)
    except Exception as e:
        return f"Web search failed ({e}). Use internal knowledge."

def generate_bar(score, total=10):
    filled = int(round(score / total * 10))
    return "█" * filled + "░" * (10 - filled)

def render_card(agent, content, time_str):
    return f"""<div class="card">
  <div class="card-accent" style="background:{agent['color']};"></div>
  <div class="card-header">
    <div class="card-left">
      <span>{agent['emoji']}</span>
      <span class="card-name">{agent['name']}</span>
      <span class="card-role">{agent['role']}</span>
    </div>
    <span class="card-time">{time_str}</span>
  </div>
  <div class="card-body">{content}</div>
</div>"""

def strip_emoji(text):
    return re.sub(r'[^\x00-\x7F]+', '', text)

def generate_pdf(history, topic):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    styles = getSampleStyleSheet()
    title_s = ParagraphStyle('T', parent=styles['Heading1'],
                             fontName='Helvetica-Bold', fontSize=22, spaceAfter=16)
    agent_s = ParagraphStyle('A', parent=styles['Heading2'],
                             fontName='Helvetica-Bold', fontSize=13,
                             spaceBefore=12, spaceAfter=4)
    body_s = ParagraphStyle('B', parent=styles['Normal'],
                            fontName='Helvetica', fontSize=11, leading=14)
    story = [
        Paragraph("SwarmIQ Debate Report", title_s),
        Paragraph(f"<b>Topic:</b> {strip_emoji(topic)}", styles['Normal']),
        Paragraph(f"<b>Date:</b> {time.strftime('%Y-%m-%d %H:%M')}", styles['Normal']),
        Spacer(1, 24),
    ]
    for m in history:
        story.append(Paragraph(f"{m['name']} ({m['role']}) — {m['time_taken']:.1f}s", agent_s))
        for line in strip_emoji(m['content']).split('\n'):
            if line.strip():
                story.append(Paragraph(line.strip(), body_s))
                story.append(Spacer(1, 4))
    doc.build(story)
    buf.seek(0)
    return buf

# ─── Session state ────────────────────────────────────────────────────────────
def _init():
    defaults = {
        "debate_history": [], "is_debating": False,
        "topic": "", "sources": "",
        "debate_start_time": 0,
        "pro_score": 0, "con_score": 0, "winner": "",
        "selected_chip": "",
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

_init()

def clear_all():
    for k in ["debate_history", "is_debating", "topic", "sources",
              "debate_start_time", "pro_score", "con_score", "winner", "selected_chip"]:
        del st.session_state[k]
    _init()

def start_debate(topic_text):
    st.session_state.topic = topic_text
    st.session_state.debate_history = []
    st.session_state.is_debating = True
    st.session_state.sources = ""
    st.session_state.debate_start_time = time.time()
    st.session_state.pro_score = 0
    st.session_state.con_score = 0
    st.session_state.winner = ""

# ─── HOMEPAGE ────────────────────────────────────────────────────────────────
if not st.session_state.is_debating:
    # Hero title
    st.markdown("""
<div class="swarmiq-hero">
  <div class="swarmiq-title">⚡ SwarmIQ</div>
  <div class="swarmiq-subtitle">Enter a topic. Watch 7 AI agents debate it.</div>
</div>
""", unsafe_allow_html=True)

    # Store topic in session state
    if "debate_topic" not in st.session_state:
        st.session_state.debate_topic = ""

    # Show topic chips as the PRIMARY input
    st.markdown("<div style='font-size: 14px; color: #aaa; margin-bottom: 8px;'>Choose a preset topic:</div>", unsafe_allow_html=True)
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        if st.button("🏦 Crypto ban?", use_container_width=True):
            st.session_state.debate_topic = "Should India ban cryptocurrency?"
    with col2:
        if st.button("🤖 AI Engineers?", use_container_width=True):
            st.session_state.debate_topic = "Will AI replace software engineers?"
    with col3:
        if st.button("☢️ Nuclear Energy", use_container_width=True):
            st.session_state.debate_topic = "Is nuclear energy India's future?"
    with col4:
        if st.button("🏠 Remote Work", use_container_width=True):
            st.session_state.debate_topic = "Is remote work killing productivity?"
    with col5:
        if st.button("📱 Social Media", use_container_width=True):
            st.session_state.debate_topic = "Did social media harm democracy?"

    # Show what's selected
    if st.session_state.debate_topic:
        st.success(f"Selected: {st.session_state.debate_topic}")

    # Custom topic input with DIFFERENT key
    custom = st.text_input(
        "Or type custom topic:",
        key="custom_debate_input",
        placeholder="Ask any controversial question...",
        label_visibility="collapsed"
    )
    if custom:
        st.session_state.debate_topic = custom

    # Start button
    if st.button("⚡ Start Debate", type="primary"):
        topic = st.session_state.debate_topic
        if topic:
            start_debate(topic)
            st.rerun()
        else:
            st.warning("Please select or type a topic first!")

# ─── DEBATE ARENA ─────────────────────────────────────────────────────────────
if st.session_state.is_debating:
    current_idx = len(st.session_state.debate_history)
    debate_done = current_idx == len(AGENTS)

    # Arena header
    live_part = '<div class="live-dot"></div><span class="live-label">LIVE</span>' if not debate_done else ''
    st.markdown(f"""
<div class="arena-header">
  <span class="arena-title">Debate Arena</span>
  {live_part}
  <span class="arena-topic">{st.session_state.topic}</span>
</div>
""", unsafe_allow_html=True)

    # Pipeline stepper
    nodes = []
    for i, a in enumerate(AGENTS):
        if i < current_idx:
            style = f"background:#1f1f1f;border:1.5px solid #333;color:#666;"
        elif i == current_idx and not debate_done:
            style = f"background:#1f1f1f;border:1.5px solid {a['color']};color:{a['color']};animation:pulse-ring 1.5s ease infinite;"
        else:
            style = "background:transparent;border:1.5px solid #282828;color:#383838;"
        nodes.append(
            f'<div class="pipe-node">'
            f'<div class="pipe-circle" style="{style}">{a["emoji"]}</div>'
            f'<div class="pipe-label">{a["name"]}</div>'
            f'</div>'
        )
        if i < len(AGENTS) - 1:
            nodes.append('<div class="pipe-line"></div>')
    st.markdown(f'<div class="pipeline-wrap">{"".join(nodes)}</div>', unsafe_allow_html=True)

    # Tabs
    tab1, tab2, tab3, tab4, tab5 = st.tabs(
        ["Live Debate", "Final Verdict", "Fact Check", "Analytics", "Sources"]
    )

    with tab1:
        # Render completed history
        for msg in st.session_state.debate_history:
            agent_def = next(a for a in AGENTS if a["id"] == msg["id"])
            st.markdown(render_card(agent_def, msg["content"], f"{msg['time_taken']:.1f}s"),
                        unsafe_allow_html=True)

        # Run next agent
        if not debate_done:
            current_agent = AGENTS[current_idx]
            agent_start = time.time()
            timestamp = datetime.now().strftime("%H:%M:%S")

            context_text = ""
            q_map = {
                "advocate":     f"arguments for {st.session_state.topic}",
                "opposition":   f"arguments against {st.session_state.topic}",
                "fact_checker": f"fact check {st.session_state.topic}",
                "analyst":      f"statistics trends {st.session_state.topic}",
            }
            if current_agent["id"] in q_map:
                with st.spinner(f"🔍 {current_agent['name']} searching the web..."):
                    q = q_map[current_agent["id"]]
                    res = search_web(q)
                    context_text = f"\n\nWEB SEARCH CONTEXT:\n{res}"
                    st.session_state.sources += f"**{current_agent['name']}** `{q}`\n{res}\n\n---\n\n"
            else:
                with st.spinner(f"🧠 {current_agent['name']} is thinking..."):
                    time.sleep(0.4)

            messages = [{"role": "system", "content": current_agent["system"]}]
            messages.append({"role": "user", "content": f"Topic: {st.session_state.topic}{context_text}"})
            for m in st.session_state.debate_history:
                messages.append({
                    "role": "assistant",
                    "content": f"[{m['name']} ({m['role']})]: {m['content']}"
                })
            messages.append({"role": "user",
                             "content": f"It is your turn as {current_agent['name']}."})

            placeholder = st.empty()
            full_response = ""
            try:
                stream = client.chat.completions.create(
                    model=MODEL, messages=messages,
                    stream=True, max_tokens=250, timeout=60
                )
                for chunk in stream:
                    if getattr(chunk, "choices", None) and chunk.choices:
                        delta = getattr(chunk.choices[0].delta, "content", None)
                        if delta:
                            full_response += delta
                        placeholder.markdown(
                            render_card(current_agent, full_response + "▌", "..."),
                            unsafe_allow_html=True
                        )
            except Exception as e:
                full_response = f"Error: {e}"

            agent_time = time.time() - agent_start

            # Judge score parsing
            if current_agent["id"] == "judge":
                m_pro = re.search(r"PRO SCORE:\s*([0-9.]+)/10", full_response, re.I)
                m_con = re.search(r"CON SCORE:\s*([0-9.]+)/10", full_response, re.I)
                if m_pro: st.session_state.pro_score = float(m_pro.group(1))
                if m_con: st.session_state.con_score = float(m_con.group(1))
                p, c = st.session_state.pro_score, st.session_state.con_score
                st.session_state.winner = "PRO SIDE" if p > c else ("CON SIDE" if c > p else "TIE")

            placeholder.markdown(
                render_card(current_agent, full_response, f"{agent_time:.1f}s"),
                unsafe_allow_html=True
            )

            st.session_state.debate_history.append({
                "id": current_agent["id"], "name": current_agent["name"],
                "role": current_agent["role"], "emoji": current_agent["emoji"],
                "color": current_agent["color"], "content": full_response,
                "time_taken": agent_time, "timestamp": timestamp,
            })
            time.sleep(0.2)
            st.rerun()

    # ── Post-debate tabs ──────────────────────────────────────────────────────
    if debate_done:
        p = st.session_state.pro_score
        c = st.session_state.con_score

        with tab2:
            st.markdown(f"""
<div class="verdict-card">
  <div class="verdict-winner">🏆 Winner: {st.session_state.winner}</div>
  <div class="verdict-sub">Based on evidence, arguments, and logical reasoning</div>
  <div class="verdict-divider"></div>
  <div class="verdict-row">
    <span class="verdict-lbl">PRO</span>
    <span class="verdict-pro">{p}/10 &nbsp;{generate_bar(p)}</span>
  </div>
  <div class="verdict-row">
    <span class="verdict-lbl">CON</span>
    <span class="verdict-con">{c}/10 &nbsp;{generate_bar(c)}</span>
  </div>
</div>
""", unsafe_allow_html=True)
            judge_msg = next((m for m in st.session_state.debate_history if m["id"] == "judge"), None)
            if judge_msg:
                st.markdown("<div style='font-size:12px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin:16px 0 8px 0;'>Judge's Full Reasoning</div>",
                            unsafe_allow_html=True)
                ag = next(a for a in AGENTS if a["id"] == "judge")
                st.markdown(render_card(ag, judge_msg["content"], f"{judge_msg['time_taken']:.1f}s"),
                            unsafe_allow_html=True)

        with tab3:
            fact_msg = next((m for m in st.session_state.debate_history if m["id"] == "fact_checker"), None)
            if fact_msg:
                ag = next(a for a in AGENTS if a["id"] == "fact_checker")
                st.markdown(render_card(ag, fact_msg["content"], f"{fact_msg['time_taken']:.1f}s"),
                            unsafe_allow_html=True)

        with tab4:
            analyst_msg = next((m for m in st.session_state.debate_history if m["id"] == "analyst"), None)
            if analyst_msg:
                ag = next(a for a in AGENTS if a["id"] == "analyst")
                st.markdown(render_card(ag, analyst_msg["content"], f"{analyst_msg['time_taken']:.1f}s"),
                            unsafe_allow_html=True)

        with tab5:
            st.markdown(f"""
<div class="card" style="padding:0;">
  <div class="card-accent" style="background:#333;"></div>
  <pre style="color:#555;white-space:pre-wrap;font-size:11px;
              font-family:ui-monospace,monospace;margin:0;
              padding:14px 14px 14px 18px;">{st.session_state.sources}</pre>
</div>
""", unsafe_allow_html=True)

        # ── Action row
        st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)
        col1, col2 = st.columns([1, 1])
        with col1:
            if st.button("🔄 New Debate", use_container_width=True, type="primary"):
                clear_all()
                st.rerun()
        with col2:
            pdf = generate_pdf(st.session_state.debate_history, st.session_state.topic)
            st.download_button(
                "📄 Download PDF", data=pdf,
                file_name="SwarmIQ_Debate.pdf", mime="application/pdf",
                use_container_width=True
            )
