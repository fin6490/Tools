// highroller-chat — AI character chat for The Meridian (formerly High Roller) on spindecks.app.
// The Anthropic key lives only here (secret ANTHROPIC_API_KEY). Every request must
// carry a signed-in SpinDecks user's token. Players bring their own Anthropic key, so
// only the owner's account gets replies from here, capped per day. verify_jwt is off so the browser's CORS preflight works; the user
// is checked by hand below, like create-checkout.
//
// POST { kind: "status" }                      -> { premium, owner, left, cap }
// POST { kind: "chat", system, messages }      -> streamed JSON lines: {"t": "..."} ... {"left": n}
// POST { kind: "paper", prompt }               -> same stream (the morning newspaper)
//
// Secrets: ANTHROPIC_API_KEY (required), HIGHROLLER_OWNER_EMAILS (comma-separated,
// optional: those accounts get the owner's personal story layer).
import Anthropic from "npm:@anthropic-ai/sdk@0.132.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const MODEL = "claude-haiku-5-5";
const CAP = 100;          // chats per player per day
const OWNER_CAP = 1000;   // the owner plays a lot
const ORIGINS = ["https://spindecks.app", "https://www.spindecks.app", "http://localhost:8123"];
// the game's name in its prompts: the new one, and the old one for pages still cached
const GAME = ['in "The Meridian", a casino game', 'in "High Roller", a casino game'];

const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

// keep the endpoint a character voice for this game, not a general-purpose proxy
function validate(body: any): { system?: string; messages: { role: "user" | "assistant"; content: string }[] } | null {
  if (body.kind === "paper") {
    const p = body.prompt;
    if (typeof p !== "string" || p.length > 12000 || !p.startsWith('Write the front page of "The Lucky Ledger"')) return null;
    return { messages: [{ role: "user", content: p }] };
  }
  if (body.kind !== "chat") return null;
  const { system, messages } = body;
  if (typeof system !== "string" || system.length > 20000 || !GAME.some((g) => system.includes(g))) return null;
  if (!Array.isArray(messages) || !messages.length || messages.length > 16) return null;
  const out = [];
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content || m.content.length > 2000) return null;
    out.push({ role: m.role, content: m.content });
  }
  if (out[out.length - 1].role !== "user") return null;
  return { system, messages: out };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ code: "method" }, 405, origin);
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ code: "not_signed_in" }, 401, origin);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: prof } = await admin.from("profiles").select("plan").eq("id", user.id).maybeSingle();
    const premium = prof?.plan === "premium";
    const owners = (Deno.env.get("HIGHROLLER_OWNER_EMAILS") || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    const owner = !!user.email && owners.includes(user.email.toLowerCase());
    const cap = owner ? OWNER_CAP : CAP;

    const body = await req.json().catch(() => ({}));
    if (body.kind === "status") {
      const { data: used } = await admin.rpc("hr_usage_today", { p_user: user.id });
      return json({ premium, owner, cap, left: Math.max(0, cap - (used || 0)), chat: owner && !!Deno.env.get("ANTHROPIC_API_KEY") }, 200, origin);
    }
    if (!premium) return json({ code: "not_premium" }, 403, origin);
    // players bring their own Anthropic key and talk to it from the browser; only the owner's account uses this server
    if (!owner) return json({ code: "own_key" }, 403, origin);
    const ask = validate(body);
    if (!ask) return json({ code: "bad_request" }, 400, origin);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ code: "not_configured" }, 503, origin);

    const { data: n, error } = await admin.rpc("hr_bump_usage", { p_user: user.id, p_cap: cap });
    if (error) return json({ code: "usage" }, 500, origin);
    if (n < 0) return json({ code: "cap", left: 0 }, 429, origin);
    const left = cap - n;

    const client = new Anthropic({ apiKey: key });
    const enc = new TextEncoder();
    const out = new ReadableStream({
      async start(ctl) {
        const send = (o: unknown) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        try {
          // Haiku has no server-side refusal fallback; a refusal just ends the reply
          const stream = client.messages.stream({
            model: MODEL,
            max_tokens: 1024, // in-character lines are a sentence or three; the paper is four short items
            ...(ask.system ? { system: ask.system } : {}),
            messages: ask.messages,
            output_config: { effort: "low" },
          });
          stream.on("text", (d: string) => send({ t: d }));
          const msg = await stream.finalMessage();
          if (msg.stop_reason === "refusal") send({ error: "refused" });
          send({ done: true, left });
        } catch (e) {
          const status = (e as { status?: number })?.status;
          send({ error: status === 429 ? "rate_limited" : "upstream" });
        } finally {
          ctl.close();
        }
      },
    });
    return new Response(out, { headers: { ...cors(origin), "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
  } catch (e) {
    return json({ code: "server", error: String((e as Error)?.message || e) }, 500, origin);
  }
});
