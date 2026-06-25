import { NextRequest } from "next/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Helper function to search DuckDuckGo Lite (does not get blocked easily)
async function searchWeb(query: string) {
  try {
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: `q=${encodeURIComponent(query)}`
    });
    if (!res.ok) return [];
    const html = await res.text();
    
    const results: { title: string; url: string; snippet: string }[] = [];
    const linkRegex = /<a\s+rel="nofollow"\s+href="([^"]+)"\s+class='result-link'>([\s\S]*?)<\/a>/g;
    
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      if (url.includes("duckduckgo.com/y.js") || url.includes("ad_domain")) continue;
      
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      
      const snippetStart = html.indexOf("class='result-snippet'", linkRegex.lastIndex);
      let snippet = "";
      if (snippetStart !== -1 && (snippetStart - linkRegex.lastIndex) < 1000) {
        const cellStart = html.indexOf(">", snippetStart);
        const cellEnd = html.indexOf("</td>", cellStart);
        if (cellStart !== -1 && cellEnd !== -1) {
          snippet = html.substring(cellStart + 1, cellEnd).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        }
      }
      results.push({ title, url, snippet });
      if (results.length >= 6) break;
    }
    return results;
  } catch (e) {
    console.error("Search error:", e);
    return [];
  }
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(type: string, data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n`));
      }

      try {
        const { topic, depth } = await req.json();

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey || apiKey === "your_groq_api_key_here") {
          throw new Error("Missing GROQ_API_KEY in environment variables.");
        }

        const groq = new Groq({ apiKey });

        const agents = [
          { agentId: "moderator",   emoji: "🎙️", name: "Moderator",       message: "Framing the debate..." },
          { agentId: "advocate",    emoji: "✅", name: "Advocate",          message: "Building the case FOR..." },
          { agentId: "opposition",  emoji: "❌", name: "Opposition",        message: "Building the case AGAINST..." },
          { agentId: "devil",       emoji: "😈", name: "Devil's Advocate",  message: "Challenging assumptions..." },
          { agentId: "factchecker", emoji: "🔍", name: "Fact Checker",      message: "Verifying claims..." },
          { agentId: "analyst",     emoji: "📊", name: "Data Analyst",      message: "Analyzing real data..." },
          { agentId: "judge",       emoji: "⚖️", name: "Judge",             message: "Deliberating verdict..." },
        ];

        // Send status updates
        for (const agent of agents) {
          send("status", agent);
          await new Promise(r => setTimeout(r, 150));
        }
        send("status", { agentId: "searching", emoji: "🌐", name: "Web Crawler", message: "Searching the internet for recent sources..." });

        const searchResults = await searchWeb(topic);
        const searchContext = searchResults.length > 0 
          ? searchResults.map((r, i) => `[Source ${i+1}] Title: ${r.title}\nURL: ${r.url}\nSummary: ${r.snippet}`).join("\n\n")
          : "No real-time search results found. Use your internal knowledge.";

        send("status", { agentId: "all", emoji: "🧠", name: "Swarm", message: "Debating and formulating verdict..." });

        let depthInstructions = "";
        if (depth === "quick") {
          depthInstructions = "QUICK OVERVIEW MODE: Provide very short, concise, straight-to-the-point answers. Do not overcomplicate. Use brief sentences.";
        } else if (depth === "deep") {
          depthInstructions = "DEEP DIVE MODE: Provide massive, exhaustive research. Write extensively detailed arguments, cite robust data points, and give highly nuanced and thorough explanations.";
        } else {
          depthInstructions = "STANDARD DEPTH MODE: Provide a balanced, standard analysis with moderate detail.";
        }

        const masterPrompt = `You are a multi-agent AI debate and analysis system. Analyze the following topic: "${topic}"

${depthInstructions}

Here are the search results retrieved from the internet for context:
${searchContext}

Use these real search results to form arguments, verify facts, pull statistics, and build a cohesive debate.
In your final JSON output, list the real sources used in the "sources" array using their actual titles, publishers, URLs, and years from the search results. If the search results do not cover the sources fully, you can supplement with real known historical sources, but prefer the actual URL search results.

Return ONLY valid JSON (no markdown, no text outside JSON):
{
  "moderator": {
    "intro": "2-3 sentences framing why this debate matters right now, mentioning recent developments",
    "key_question": "The precise central question being debated"
  },
  "advocate": {
    "main_argument": "Strongest argument FOR, citing real trends or data from the search results",
    "supporting_points": ["Specific point with data", "Specific point with evidence", "Specific point with example", "Specific point with trend"],
    "strongest_evidence": "Most compelling real-world example or study supporting this side"
  },
  "opposition": {
    "main_argument": "Strongest argument AGAINST, citing real counter-evidence",
    "supporting_points": ["Counter-point with data", "Counter-point with evidence", "Counter-point with example", "Counter-point with limitation"],
    "strongest_evidence": "Most compelling real-world example or study opposing this"
  },
  "devil": {
    "challenge": "A sharp, provocative challenge to the core assumptions of BOTH sides",
    "uncomfortable_truth": "The uncomfortable reality neither side acknowledges (be bold and specific)",
    "reframe": "A fundamentally different lens to view this question through"
  },
  "factcheck": {
    "verified_facts": [
      { "claim": "A specific, checkable factual claim from the debate", "verdict": "TRUE", "explanation": "Why this is true with specific data" },
      { "claim": "Another specific claim", "verdict": "PARTIALLY TRUE", "explanation": "The nuanced reality with specific data" },
      { "claim": "A commonly believed false claim about this topic", "verdict": "MISLEADING", "explanation": "Why this is misleading with specifics" }
    ],
    "common_misconceptions": ["A specific widespread misconception about this topic with explanation", "Another specific misconception"]
  },
  "analyst": {
    "key_statistics": [
      { "stat": "Specific percentage or number statistic", "source": "e.g., Pew Research, McKinsey, etc." },
      { "stat": "Another specific data point", "source": "e.g., World Economic Forum, etc." },
      { "stat": "A third specific statistic", "source": "e.g., MIT, etc." }
    ],
    "trend": "The dominant measurable trend with specific numbers",
    "projection": "Data-backed projection for the next 5-10 years"
  },
  "judge": {
    "verdict": "NUANCED",
    "ruling": "2-3 sentence evidence-based final judgment referencing both sides",
    "confidence": 72,
    "reasoning": "The single most decisive factor in this verdict",
    "conditions": "The specific conditions that would change this verdict"
  },
  "sources": [
    // Output 3-5 real sources with actual URLs from the search results or well-known publications
    { "title": "Title of source", "publisher": "Publisher name", "url": "https://example.com", "year": "2024", "type": "Research" }
  ]
}

Make ALL content specific, data-driven, and insightful. Reference real organizations, real statistics, and real events. Do NOT use generic placeholder text.`;

        // Try models in order of preference, falling back if rate limited
        const models = [
          "llama-3.3-70b-versatile",
          "llama-3.1-70b-versatile",
          "llama-3.1-8b-instant",
          "gemma2-9b-it",
        ];
        const maxTokens = depth === "quick" ? 2000 : depth === "deep" ? 6000 : 4000;

        let rawText = "";
        let lastError: Error | null = null;
        for (const model of models) {
          try {
            const completion = await groq.chat.completions.create({
              model,
              messages: [
                { role: "system", content: "You are a multi-agent research and debate system. Respond ONLY with valid JSON. No markdown code blocks. No explanatory text. Pure JSON object only." },
                { role: "user", content: masterPrompt }
              ],
              temperature: 0.65,
              max_tokens: maxTokens,
              response_format: { type: "json_object" },
            });
            rawText = completion.choices[0]?.message?.content || "";
            lastError = null;
            break; // success
          } catch (modelErr: any) {
            lastError = modelErr;
            const msg = modelErr?.message || "";
            // Only retry on rate limit / capacity / decommissioned errors
            if (!msg.includes("429") && !msg.includes("rate") && !msg.includes("quota") && !msg.includes("capacity") && !msg.includes("decommissioned")) {
              throw modelErr;
            }
            // wait briefly before trying next model
            await new Promise(r => setTimeout(r, 500));
          }
        }

        if (!rawText && lastError) throw lastError;

        let result;
        try {
          result = JSON.parse(rawText);
          // If the model output mock sources or empty, populate with search results
          if (!result.sources || result.sources.length === 0 || result.sources[0]?.url?.includes("example.com")) {
            result.sources = searchResults.map(r => ({
              title: r.title,
              publisher: new URL(r.url).hostname.replace("www.", ""),
              url: r.url,
              year: new Date().getFullYear().toString(),
              type: "Web Search"
            }));
          }
        } catch {
          throw new Error(`Failed to parse agent responses: ${rawText.slice(0, 200)}`);
        }

        send("result", { data: result });
        send("status", { agentId: "done", emoji: "✅", name: "Swarm", message: "Analysis complete. Verdict is ready!" });

      } catch (e: any) {
        const msg = e.message || "Unknown error";
        if (msg.includes("429") || msg.includes("rate") || msg.includes("quota") || msg.includes("capacity")) {
          send("error", { message: "⏳ All models are rate-limited. Please wait 60 seconds and try again. (Groq free tier limit reached)" });
        } else {
          send("error", { message: `Error: ${msg}` });
        }
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
