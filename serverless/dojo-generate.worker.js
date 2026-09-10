// dojo-generate.worker.js — Cloudflare Worker that powers The BT Dojo's
// "type a topic → generate a set" button. It proxies the request to the
// Anthropic API using Claude Haiku, holding your ANTHROPIC_API_KEY as a
// server-side secret so the static SpinDecks site never sees it.
//
// Deploy in ~5 minutes — see serverless/README.md.
// Secrets/vars: ANTHROPIC_API_KEY (required), DOJO_TOKEN (optional light gate),
// ALLOWED_ORIGINS (optional comma-separated override of the list below).

const DEFAULT_ORIGINS = [
  "https://spindecks.app",
  "https://www.spindecks.app",
  "http://localhost:8123", // local testing with the repo's http-server
];

function corsHeaders(origin, allowed) {
  const ok = allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-dojo-token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...headers } });

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ORIGINS;
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, allowed);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);
    // Only serve browsers on our own site(s). (Origin can be spoofed by non-browser
    // clients, so also add a Cloudflare rate-limit rule — see the README.)
    if (origin && !allowed.includes(origin)) return json({ error: "forbidden origin" }, 403, cors);
    if (env.DOJO_TOKEN && request.headers.get("x-dojo-token") !== env.DOJO_TOKEN) return json({ error: "bad token" }, 401, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "server not configured" }, 500, cors);

    let bodyIn;
    try { bodyIn = await request.json(); } catch { return json({ error: "bad json" }, 400, cors); }
    const topic = String(bodyIn.topic || "").trim().slice(0, 120);
    if (!topic) return json({ error: "missing topic" }, 400, cors);
    const count = Math.max(6, Math.min(16, parseInt(bodyIn.count, 10) || 12));

    const system = [
      "You create multiple-choice quiz question sets for a fast classroom game where two students race to tap the correct answer.",
      "Output ONLY a JSON object — no prose, no code fences — in exactly this shape:",
      '{"name":"<short set name>","questions":[{"q":"<question>","a":"<correct answer>","distractors":["<wrong>","<wrong>","<wrong>"]}]}',
      "Rules: keep each question and answer short enough to fit on a button (a few words or a number).",
      "Give exactly 3 plausible but clearly wrong distractors per question.",
      "Use UK spelling, keep it factual and age-appropriate, and never use gambling or betting themes.",
      "For maths you may use this light markup: \\frac{a}{b} for fractions, x^2 for powers, \\sqrt{9} for roots, and \\times \\div \\pm for symbols.",
    ].join(" ");
    const user = `Make ${count} questions for this topic/level: ${topic}`;

    let apiRes;
    try {
      apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1500,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
    } catch { return json({ error: "upstream unreachable" }, 502, cors); }

    if (!apiRes.ok) {
      const t = await apiRes.text().catch(() => "");
      return json({ error: "upstream " + apiRes.status, detail: t.slice(0, 300) }, 502, cors);
    }

    const data = await apiRes.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.questions)) return json({ error: "could not parse model output" }, 502, cors);

    const questions = parsed.questions
      .filter((q) => q && q.q && q.a)
      .slice(0, 20)
      .map((q) => ({
        q: String(q.q),
        a: String(q.a),
        distractors: Array.isArray(q.distractors) ? q.distractors.slice(0, 9).map(String) : [],
      }));
    if (questions.length < 2) return json({ error: "not enough questions" }, 502, cors);

    return json({ name: String(parsed.name || topic).slice(0, 60), questions }, 200, cors);
  },
};

// Pull the first {...} JSON object out of the model text (tolerates fences/prose).
function extractJson(text) {
  if (!text) return null;
  const s = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1 || b < a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
