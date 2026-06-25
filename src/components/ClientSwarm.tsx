"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowRight, Download, AlertCircle, Loader2, Mic, ChevronDown,
  Check, Scale, TrendingUp, Search, ExternalLink, RotateCcw, X
} from "lucide-react";
import NeuralNetwork, { AGENTS } from "./NeuralNetwork";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SwarmResult {
  moderator: { intro: string; key_question: string };
  advocate: { main_argument: string; supporting_points: string[]; strongest_evidence: string };
  opposition: { main_argument: string; supporting_points: string[]; strongest_evidence: string };
  devil: { challenge: string; uncomfortable_truth: string; reframe: string };
  factcheck: {
    verified_facts: { claim: string; verdict: string; explanation: string }[];
    common_misconceptions: string[];
  };
  analyst: {
    key_statistics: { stat: string; source: string }[];
    trend: string;
    projection: string;
  };
  judge: { verdict: string; ruling: string; confidence: number; reasoning: string; conditions: string };
  sources: { title: string; publisher: string; url: string; year: string; type: string }[];
}

interface AgentStatus { agentId: string; emoji: string; name: string; message: string }

// ─── Dropdown ─────────────────────────────────────────────────────────────────
const CustomSelect = ({ value, options, onChange, label }: {
  value: string; options: { id: string; label: string; desc: string }[];
  onChange: (v: string) => void; label: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sel = options.find(o => o.id === value);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm font-medium text-gray-300 transition-colors">
        <span>{sel?.label || label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-56 bg-[#2A2A2A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-1.5 flex flex-col gap-0.5">
            {options.map(o => (
              <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${value === o.id ? "bg-white/8 text-white" : "text-gray-300 hover:bg-white/5"}`}>
                <div>
                  <div className="text-sm font-medium">{o.label}</div>
                  <div className="text-xs text-gray-500">{o.desc}</div>
                </div>
                {value === o.id && <Check className="w-4 h-4 text-[#E8A142] shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const verdictColor = (v: string) => {
  const u = (v || "").toUpperCase();
  if (u.includes("SUPPORT")) return "text-green-400 bg-green-400/10 border-green-400/30";
  if (u.includes("OPPOS")) return "text-red-400 bg-red-400/10 border-red-400/30";
  return "text-amber-400 bg-amber-400/10 border-amber-400/30";
};

const factColor = (v: string) => {
  const u = (v || "").toUpperCase();
  if (u === "TRUE") return "text-green-400 bg-green-900/30 border-green-700/30";
  if (u === "FALSE") return "text-red-400 bg-red-900/30 border-red-700/30";
  return "text-amber-400 bg-amber-900/30 border-amber-700/30";
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientSwarm() {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<AgentStatus[]>([]);
  const [result, setResult] = useState<SwarmResult | null>(null);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<"factcheck" | "analytics" | "sources">("factcheck");
  const [showNetwork, setShowNetwork] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // The currently active agent (last status update)
  const currentAgentId = statuses.length > 0 ? statuses[statuses.length - 1].agentId : undefined;

  const depthOptions = [
    { id: "quick", label: "Quick Overview", desc: "Short concise answers from all 7 agents" },
    { id: "standard", label: "Standard Depth", desc: "Standard balanced answers from all 7 agents" },
    { id: "deep", label: "Deep Dive", desc: "Exhaustive detailed deep answers from all 7 agents" },
  ];

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported. Use Chrome."); return; }
    const r = new SR(); r.continuous = false; r.interimResults = true;
    r.onstart = () => setIsListening(true);
    r.onresult = (e: any) => setTopic(Array.from(e.results).map((x: any) => x[0].transcript).join(""));
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    r.start();
  };

  const handleReset = () => {
    setResult(null); setStatuses([]); setError(""); setTopic(""); setLoading(false);
  };

  const handleRun = async () => {
    if (!topic.trim()) return;
    setLoading(true); setStatuses([]); setResult(null); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const res = await fetch("/api/swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, depth }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (!value) continue;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "status") {
              setStatuses(prev => {
                const i = prev.findIndex(s => s.agentId === data.agentId);
                if (i >= 0) { const n = [...prev]; n[i] = data; return n; }
                return [...prev, data];
              });
            } else if (data.type === "result") {
              setResult(data.data);
              setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            } else if (data.type === "error") {
              setError(data.message);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => { window.print(); };

  const hasResults = result && !loading;
  const isActive = loading || !!result;

  return (
    <div className="min-h-screen w-full flex flex-col">
      <style>{`
        @media print {
          @page {
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #print-container, #print-container * {
            visibility: visible;
          }
          #print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            display: block !important;
            padding: 1.5cm !important;
            box-sizing: border-box !important;
          }
          #print-container > div {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 1.5rem !important;
          }
        }
        @media screen {
          #print-container { display: none !important; }
        }
      `}</style>

      {/* ── SCREEN UI ── */}
      <div className="print:hidden flex-1 flex flex-col">

        {/* Header Bar (when active) */}
        {isActive && (
          <div className="sticky top-0 z-40 bg-[#111111]/95 backdrop-blur border-b border-white/5 px-3 sm:px-4 py-2.5">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img src="/favicon.png" alt="SwarmIQ" className="w-6 h-6 object-contain shrink-0" />
                <span className="font-serif text-[#E0D8CA] text-base sm:text-lg font-semibold tracking-tight truncate">SwarmIQ</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Neural Network mini widget */}
                <button
                  onClick={() => setShowNetwork(true)}
                  className="relative group flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                  title="View Agent Neural Network"
                >
                  <NeuralNetwork
                    activeAgentId={currentAgentId}
                    isRunning={loading}
                    displayWidth={80}
                    className="rounded-lg opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  <span className="text-[10px] text-[#E8A142]/60 font-semibold uppercase tracking-widest hidden md:block">Network</span>
                </button>

                {loading && (
                  <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-[#E8A142]/10 border border-[#E8A142]/20 rounded-lg text-[#E8A142] text-xs font-medium">
                    <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                    <span className="hidden xs:inline">Deliberating</span>
                  </div>
                )}
                {hasResults && (
                  <button onClick={handleReset} className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-medium transition-all">
                    <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Topic</span><span className="sm:hidden">Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hero (when idle) */}
        {!isActive && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-[80vh] pb-16">
            <div className="mb-8 sm:mb-10 text-center flex flex-col items-center">
              <div className="flex items-center gap-3 sm:gap-3.5 mb-2">
                <img src="/favicon.png" alt="SwarmIQ" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#E0D8CA] tracking-tight font-semibold">
                  SwarmIQ
                </h1>
              </div>
              <p className="text-[#E8A142]/70 text-[10px] sm:text-xs font-semibold tracking-widest uppercase">
                AI AGENTS DEBATE PLATFORM
              </p>
            </div>
            <div className="w-full max-w-2xl mx-auto">
              <InputCard topic={topic} setTopic={setTopic} depth={depth} setDepth={setDepth}
                isListening={isListening} loading={loading}
                depthOptions={depthOptions}
                onVoice={startVoice} onRun={handleRun} />
            </div>
            {/* Footer */}
            <SiteFooter />
          </div>
        )}

        {/* Content Area (when active) */}
        {isActive && (
          <div className="flex-1 flex flex-col items-center px-3 sm:px-4 pt-4 sm:pt-6 pb-40 sm:pb-44">
            <div className="w-full max-w-3xl space-y-4 sm:space-y-5">

              {/* Loading agent timeline */}
              {loading && (
                <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Loader2 className="w-4 h-4 text-[#E8A142] animate-spin" />
                    <span className="text-sm font-semibold text-white">Swarm is deliberating...</span>
                  </div>
                  <div className="space-y-3">
                    {statuses.map((s, i) => (
                      <div key={s.agentId} className={`flex items-center gap-3 transition-opacity ${i === statuses.length - 1 ? "opacity-100" : "opacity-50"}`}>
                        <div className="w-5 flex justify-center shrink-0">
                          <div className={`w-1.5 h-1.5 rounded-full ${i === statuses.length - 1 ? "bg-[#E8A142] animate-pulse" : "bg-gray-600"}`} />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-300">{s.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{s.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/40 rounded-xl p-4">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* ── RESULTS ── */}
              {hasResults && (
                <div ref={resultsRef} id="swarm-result" className="space-y-4">

                  {/* Depth Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#E8A142] bg-[#E8A142]/10 border border-[#E8A142]/20 px-3 py-1 rounded-full uppercase tracking-widest">
                      {depthOptions.find(o => o.id === depth)?.label}
                    </span>
                    <span className="text-xs text-gray-500">— All 7 agents responded</span>
                  </div>

                  {/* 1. Moderator */}
                  <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-5">
                    <div className="mb-3">
                      <span className="text-xs font-bold text-[#E8A142] uppercase tracking-widest block mb-0.5">Moderator</span>
                      <span className="text-xs text-gray-400 uppercase tracking-widest">Opening Statement</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3">{result.moderator.intro}</p>
                    <div className="bg-[#E8A142]/8 border border-[#E8A142]/20 rounded-xl p-3">
                      <p className="text-xs font-bold text-[#E8A142] uppercase tracking-wider mb-1">Central Question</p>
                      <p className="text-white text-sm font-medium">{result.moderator.key_question}</p>
                    </div>
                  </div>

                  {/* 2. Advocate + Opposition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1A] border border-green-500/20 rounded-2xl p-5 flex flex-col">
                      <div className="mb-3">
                        <span className="text-xs font-bold text-green-400 uppercase tracking-widest block mb-0.5">Advocate</span>
                        <span className="text-xs text-gray-400 uppercase tracking-widest">Supporting Case (Pros)</span>
                      </div>
                      <p className="text-white text-sm font-medium mb-3 leading-snug">{result.advocate.main_argument}</p>
                      <ul className="space-y-2 flex-1">
                        {result.advocate.supporting_points.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                            <span className="text-green-500 font-bold mt-0.5 shrink-0">✓</span>{p}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 p-3 bg-green-900/20 rounded-xl border border-green-700/20">
                        <p className="text-xs text-gray-400 leading-relaxed"><span className="text-green-400 font-semibold">Key Evidence: </span>{result.advocate.strongest_evidence}</p>
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] border border-red-500/20 rounded-2xl p-5 flex flex-col">
                      <div className="mb-3">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-0.5">Opposition</span>
                        <span className="text-xs text-gray-400 uppercase tracking-widest">Opposing Case (Cons)</span>
                      </div>
                      <p className="text-white text-sm font-medium mb-3 leading-snug">{result.opposition.main_argument}</p>
                      <ul className="space-y-2 flex-1">
                        {result.opposition.supporting_points.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                            <span className="text-red-500 font-bold mt-0.5 shrink-0">✗</span>{p}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 p-3 bg-red-900/20 rounded-xl border border-red-700/20">
                        <p className="text-xs text-gray-400 leading-relaxed"><span className="text-red-400 font-semibold">Key Evidence: </span>{result.opposition.strongest_evidence}</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. Devil's Advocate */}
                  <div className="bg-[#1A1A1A] border border-purple-500/20 rounded-2xl p-5">
                    <div className="mb-4">
                      <span className="text-xs font-bold text-purple-400 uppercase tracking-widest block mb-0.5">Devil&apos;s Advocate</span>
                      <span className="text-xs text-gray-400 uppercase tracking-widest">Challenger</span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Challenge</p>
                        <p className="text-gray-200 text-sm leading-relaxed">{result.devil.challenge}</p>
                      </div>
                      <div className="border-t border-white/5 pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Uncomfortable Truth</p>
                        <p className="text-amber-300 text-sm italic leading-relaxed">&ldquo;{result.devil.uncomfortable_truth}&rdquo;</p>
                      </div>
                      <div className="border-t border-white/5 pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reframe</p>
                        <p className="text-gray-300 text-sm leading-relaxed">{result.devil.reframe}</p>
                      </div>
                    </div>
                  </div>

                  {/* 4. Judge Verdict */}
                  <div className="bg-[#1A1A1A] border border-[#E8A142]/25 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-xs font-bold text-[#E8A142] uppercase tracking-widest block mb-0.5">Judge</span>
                        <span className="text-xs text-gray-400 uppercase tracking-widest">Final Verdict</span>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${verdictColor(result.judge.verdict)}`}>
                        {result.judge.verdict}
                      </span>
                    </div>
                    <p className="text-white text-sm leading-relaxed mb-4">{result.judge.ruling}</p>
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>Judge Confidence</span>
                      <span className="text-[#E8A142] font-semibold">{result.judge.confidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full mb-4">
                      <div className="h-1.5 bg-gradient-to-r from-[#E8A142] to-amber-300 rounded-full transition-all duration-1000"
                        style={{ width: `${result.judge.confidence}%` }} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white/3 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Key Reasoning</p>
                        <p className="text-xs text-gray-300 leading-relaxed">{result.judge.reasoning}</p>
                      </div>
                      <div className="bg-white/3 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Verdict May Change If</p>
                        <p className="text-xs text-gray-300 leading-relaxed">{result.judge.conditions}</p>
                      </div>
                    </div>
                  </div>

                  {/* 5. Tabs: Fact Check / Analytics / Sources */}
                  <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="flex border-b border-white/5">
                      {(["factcheck", "analytics", "sources"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? "text-white border-b-2 border-[#E8A142]" : "text-gray-500 hover:text-gray-300"}`}>
                          {tab === "factcheck" ? "Fact Check" : tab === "analytics" ? "Analytics" : "Sources"}
                        </button>
                      ))}
                    </div>

                    <div className="p-5">
                      {/* Fact Check */}
                      {activeTab === "factcheck" && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-semibold text-white">Verified Claims</span>
                          </div>
                          {result.factcheck.verified_facts.map((f, i) => (
                            <div key={i} className="flex gap-3 items-start p-3 bg-white/2 rounded-xl border border-white/5">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border shrink-0 mt-0.5 ${factColor(f.verdict)}`}>
                                {f.verdict}
                              </span>
                              <div>
                                <p className="text-sm text-white font-medium mb-1">{f.claim}</p>
                                <p className="text-xs text-gray-400 leading-relaxed">{f.explanation}</p>
                              </div>
                            </div>
                          ))}
                          {result.factcheck.common_misconceptions?.length > 0 && (
                            <div className="mt-2 pt-4 border-t border-white/5">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Common Misconceptions</p>
                              {result.factcheck.common_misconceptions.map((m, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-gray-400 mb-2 leading-relaxed">
                                  <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>{m}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Analytics */}
                      {activeTab === "analytics" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-semibold text-white">Data &amp; Statistics</span>
                          </div>
                          {result.analyst.key_statistics.map((s, i) => (
                            <div key={i} className="p-4 bg-white/2 rounded-xl border border-white/5">
                              <p className="text-sm text-white mb-1 leading-relaxed">{s.stat}</p>
                              <p className="text-xs text-[#E8A142]">Source: {s.source}</p>
                            </div>
                          ))}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                            <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dominant Trend</p>
                              <p className="text-sm text-gray-200 leading-relaxed">{result.analyst.trend}</p>
                            </div>
                            <div className="p-3 bg-white/2 rounded-xl border border-white/5">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Future Projection</p>
                              <p className="text-sm text-gray-200 leading-relaxed">{result.analyst.projection}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sources */}
                      {activeTab === "sources" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-4">
                            <Scale className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-semibold text-white">Research Sources</span>
                          </div>
                          {result.sources.map((s, i) => (
                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-start gap-3 p-4 bg-white/2 rounded-xl border border-white/5 hover:border-[#E8A142]/30 hover:bg-[#E8A142]/5 transition-all group block">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-bold text-[#E8A142] bg-[#E8A142]/10 px-2 py-0.5 rounded-md shrink-0">{s.type}</span>
                                  <span className="text-xs text-gray-500">{s.year}</span>
                                </div>
                                <p className="text-sm text-white font-medium leading-snug mb-0.5 group-hover:text-[#E8A142] transition-colors">{s.title}</p>
                                <p className="text-xs text-gray-500">{s.publisher}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-[#E8A142] shrink-0 mt-1 transition-colors" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Download + Footer */}
                  <div className="flex flex-col items-center gap-4 pb-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                      <SiteFooter />
                      <button onClick={handleDownloadPDF}
                        className="order-1 sm:order-2 flex items-center gap-2 px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#333] border border-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-all shrink-0">
                        <Download className="w-4 h-4" />
                        Print / Save PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sticky Bottom Input Card */}
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#111111] via-[#111111]/95 to-[#111111]/0 pt-8 pb-4 sm:pb-6 px-3 sm:px-4 pointer-events-none">
                <div className="max-w-3xl mx-auto pointer-events-auto">
                  <InputCard topic={topic} setTopic={setTopic} depth={depth} setDepth={setDepth}
                    isListening={isListening} loading={loading}
                    depthOptions={depthOptions}
                    onVoice={startVoice} onRun={handleRun} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── NEURAL NETWORK MODAL ── */}
        {showNetwork && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={() => setShowNetwork(false)}
          >
            <div
              className="relative bg-[#141414] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowNetwork(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="px-6 pt-6 pb-3 text-center">
                <h2 className="text-lg font-serif font-semibold text-[#E0D8CA]">SwarmIQ Neural Network</h2>
                <p className="text-xs text-gray-500 mt-1">How the 7 agents think and connect together</p>
              </div>

              {/* Large Network */}
              <div className="flex justify-center px-4 py-2">
                <NeuralNetwork
                  activeAgentId={currentAgentId}
                  isRunning={loading}
                  displayWidth={480}
                  className="max-w-full"
                />
              </div>

              {/* Agent cards grid */}
              <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {AGENTS.map((agent, i) => {
                  const isActive = agent.id === currentAgentId && loading;
                  return (
                    <div
                      key={agent.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        isActive
                          ? "bg-[#E8A142]/10 border-[#E8A142]/30"
                          : "bg-white/2 border-white/5"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border ${
                        isActive ? "bg-[#E8A142]/20 border-[#E8A142]/40 text-[#E8A142]" : "bg-white/5 border-white/10 text-gray-400"
                      }`}>
                        {agent.label[0]}
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${
                          isActive ? "text-[#E8A142]" : "text-gray-300"
                        }`}>{agent.label}</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{agent.role}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Connection note */}
              <div className="px-6 pb-6">
                <div className="bg-[#E8A142]/5 border border-[#E8A142]/15 rounded-xl p-3">
                  <p className="text-xs text-[#E8A142]/80 font-semibold mb-1">How they connect</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    The Moderator acts as the central hub, routing the topic to all agents. The Advocate and Opposition
                    debate the topic, while the Devil&apos;s Advocate challenges both sides. The Fact Checker verifies
                    claims from all agents, the Analyst provides supporting data, and finally the Judge synthesizes
                    everything into a final verdict. Particles flowing between nodes represent information exchange.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── PDF PRINT TEMPLATE ── */}
      {result && (
        <div id="print-container" className="bg-white text-black p-8 font-sans space-y-6" style={{ color: "#000000", backgroundColor: "#ffffff" }}>
          <div className="border-b-2 border-gray-900 pb-4">
            <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">SwarmIQ Research Report</h1>
            <p className="text-sm text-gray-600">Topic: <span className="font-semibold text-gray-900">{topic}</span></p>
            <div className="flex gap-4 text-xs text-gray-500 mt-2">
              <span>Depth: {depthOptions.find(o => o.id === depth)?.label}</span>
              <span>Generated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold text-amber-600 uppercase tracking-wider">Moderator: Opening Statement</h2>
            <p className="text-sm leading-relaxed text-gray-800">{result.moderator.intro}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-0.5">Central Question</p>
              <p className="text-sm font-medium text-gray-900">{result.moderator.key_question}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="border border-green-200 rounded-lg p-4 bg-green-50/30">
              <h2 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-2">Advocate: Pros</h2>
              <p className="text-sm font-semibold text-gray-900 mb-2">{result.advocate.main_argument}</p>
              <ul className="space-y-1.5">
                {result.advocate.supporting_points.map((p, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed flex items-start gap-1.5">
                    <span className="text-green-600 font-bold">✓</span><span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-green-100">
                <span className="font-semibold text-green-700">Evidence:</span> {result.advocate.strongest_evidence}
              </p>
            </div>

            <div className="border border-red-200 rounded-lg p-4 bg-red-50/30">
              <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2">Opposition: Cons</h2>
              <p className="text-sm font-semibold text-gray-900 mb-2">{result.opposition.main_argument}</p>
              <ul className="space-y-1.5">
                {result.opposition.supporting_points.map((p, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed flex items-start gap-1.5">
                    <span className="text-red-600 font-bold">✗</span><span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-red-100">
                <span className="font-semibold text-red-700">Evidence:</span> {result.opposition.strongest_evidence}
              </p>
            </div>
          </div>

          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/20 space-y-3">
            <h2 className="text-sm font-bold text-purple-700 uppercase tracking-wider">Devil&apos;s Advocate: Challenger</h2>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Challenge</p>
              <p className="text-sm text-gray-800">{result.devil.challenge}</p>
            </div>
            <div className="border-t border-purple-100 pt-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Uncomfortable Truth</p>
              <p className="text-sm text-gray-800 italic">&quot;{result.devil.uncomfortable_truth}&quot;</p>
            </div>
            <div className="border-t border-purple-100 pt-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Reframe</p>
              <p className="text-sm text-gray-800">{result.devil.reframe}</p>
            </div>
          </div>

          <div className="border border-amber-300 rounded-lg p-4 bg-amber-50/20">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider">Judge: Final Verdict</h2>
              <span className="text-xs font-bold border border-amber-400 bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                {result.judge.verdict}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-900 mb-3">{result.judge.ruling}</p>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-amber-100">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-0.5">Key Reasoning</p>
                <p className="text-xs text-gray-700 leading-relaxed">{result.judge.reasoning}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-0.5">Conditions</p>
                <p className="text-xs text-gray-700 leading-relaxed">{result.judge.conditions}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Fact Check</h2>
            <div className="space-y-2">
              {result.factcheck.verified_facts.map((f, i) => (
                <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex gap-2">
                  <span className="text-xs font-bold border border-gray-400 bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded h-fit">
                    {f.verdict}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{f.claim}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{f.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Data &amp; Analytics</h2>
            <div className="grid grid-cols-2 gap-4">
              {result.analyst.key_statistics.map((s, i) => (
                <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-medium text-gray-900">{s.stat}</p>
                  <p className="text-[10px] text-amber-700 mt-1 font-semibold">Source: {s.source}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">References &amp; Sources</h2>
            <div className="space-y-1.5">
              {result.sources.map((s, i) => (
                <div key={i} className="text-xs border-b border-gray-100 pb-1.5">
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  <p className="text-[10px] text-gray-500">{s.publisher} ({s.year}) — <span className="text-blue-600">{s.url}</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Site Footer ─────────────────────────────────────────────────────────────
function SiteFooter() {
  return (
    <div style={{ paddingTop: "32px", marginBottom: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* Gradient divider */}
      <div style={{
        width: "200px",
        height: "1px",
        background: "linear-gradient(to right, transparent, #333, transparent)",
        marginBottom: "20px",
      }} />

      {/* Credit line */}
      <p style={{
        fontSize: "13px",
        fontStyle: "italic",
        color: "#888",
        letterSpacing: "0.02em",
        textAlign: "center",
        lineHeight: "1.6",
        margin: 0,
        padding: "0 16px",
      }}>
        SwarmIQ &mdash; Created by Poovarasu S for Microsoft Build AI Hackathon 2026
      </p>

    </div>
  );
}

// ─── Extracted Input Card ─────────────────────────────────────────────────────
function InputCard({ topic, setTopic, depth, setDepth, isListening, loading,
  depthOptions, onVoice, onRun }: any) {
  return (
    <div className="bg-[#1C1C1C] border border-white/8 rounded-2xl p-3 sm:p-4 shadow-2xl">
      <textarea
        value={topic}
        onChange={e => setTopic(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onRun(); } }}
        placeholder="Ask the swarm anything…"
        rows={3}
        className="w-full bg-transparent text-white placeholder-gray-500 text-sm resize-none outline-none leading-relaxed"
        disabled={loading}
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <CustomSelect value={depth} options={depthOptions} onChange={setDepth} label="Depth" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onVoice}
            className={`p-2 rounded-lg transition-all ${isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
            title="Voice input">
            <Mic className="w-4 h-4" />
          </button>
          <button onClick={onRun} disabled={loading || !topic.trim()}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-[#E8A142] hover:bg-[#D4943A] disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs sm:text-sm font-semibold rounded-xl transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? <span className="hidden sm:inline">Deliberating…</span> : <span>Run Swarm</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
