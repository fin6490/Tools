// darts-coach — Claude for Oche, the private darts trainer at /darts-coach/ on spindecks.app.
// Two jobs: read a photo of the board to check a visit's darts, and turn practice
// stats into a coaching plan. Only accounts on the owner list may use it, and each
// is capped at CAP calls a day. The prompts are built here, so the endpoint can't be
// used as a general-purpose proxy. verify_jwt is off for the CORS preflight; the
// user is checked by hand below, like highroller-chat.
//
// POST { kind: "status" }                                    -> { owner, ai, left, cap }
// POST { kind: "read", image, mediaType, expected, guesses } -> { darts: [{segment, ring, confidence}], note }
// POST { kind: "coach", data }                               -> { summary, priorities, tips, plan }
//
// Secrets: ANTHROPIC_API_KEY (required), DARTS_OWNER_EMAILS (comma-separated;
// falls back to HIGHROLLER_OWNER_EMAILS when unset).
import Anthropic from "npm:@anthropic-ai/sdk@0.132.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const VISION_MODEL = "claude-sonnet-5-5"; // board reading needs the stronger eyes
const COACH_MODEL = "claude-sonnet-5-5";
const CAP = 600;
const ORIGINS = ["https://spindecks.app", "https://www.spindecks.app", "http://localhost:8123"];
const MEDIA = ["image/jpeg", "image/png", "image/webp"];
const RINGS = ["single", "treble", "double", "outer_bull", "bull"];
const GAMES = ["scoring", "x01", "bobs", "c121", "atc"];

const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

function firstJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) try { return JSON.parse(fence[1]); } catch {}
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) try { return JSON.parse(text.slice(a, b + 1)); } catch {}
  return null;
}

const BOARD = "Numbers clockwise from the top: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5.";

function readPrompt(expected: number, guesses: string[]) {
  return `This photo is from a phone mounted beside a standard steel-tip dartboard, so the board may be seen at an angle. ${BOARD} Use the number ring to orient yourself.
There should be up to ${expected} dart(s) in the board. For each dart, find the exact point where the TIP enters the board (not the flight or barrel, which stick out towards the camera and can overlap other beds) and report the bed it is in.
Beds: "single", "treble" (thin inner ring), "double" (thin outer ring), "outer_bull" (green ring round the centre), "bull" (red centre). Use segment 25 for both bulls.
${guesses.length ? `A motion tracker guessed: ${guesses.join(", ")}. Treat that as a hint only and correct it wherever the photo shows otherwise, especially on the treble and double wires.` : ""}
Only report darts you can actually see. List them in the same order as the tracker's guesses where they match.
Reply with only JSON: {"darts":[{"segment":20,"ring":"treble","confidence":"high|medium|low"}],"note":"one short sentence if anything was unclear, else empty"}`;
}

function coachPrompt(data: unknown) {
  return `You are an experienced darts coach. Here is a player's practice data from their training app (steel-tip, 501 double-out). Games in the app: "scoring" (Ton Machine: 10 visits at T20), "x01" (501 leg), "bobs" (Bob's 27 doubles game), "c121" (121 checkout game), "atc" (Around the Clock).
DATA:
${JSON.stringify(data)}

Work out what will improve this player's game most, using the specific numbers. Reply with only JSON in this shape:
{"summary":"2 sentences on where their game is and the biggest lever","priorities":[{"title":"short","why":"1-2 sentences citing their numbers","drill":"one of scoring|x01|bobs|c121|atc","tip":"one concrete technique or practice instruction"}],"tips":["3 short technique tips tied to their data"],"plan":[{"day":"Mon","session":"20-minute session using the app's games"}]}
Give exactly 3 priorities and a 5-day plan. Plain English, British spelling.`;
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

    const list = Deno.env.get("DARTS_OWNER_EMAILS") || Deno.env.get("HIGHROLLER_OWNER_EMAILS") || "";
    const owners = list.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    const owner = !!user.email && owners.includes(user.email.toLowerCase());
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    if (body.kind === "status") {
      let used = 0;
      if (owner) {
        const { data } = await admin.from("darts_ai_usage").select("n").eq("user_id", user.id).eq("day", new Date().toISOString().slice(0, 10)).maybeSingle();
        used = data?.n || 0;
      }
      return json({ owner, ai: !!key, cap: CAP, left: Math.max(0, CAP - used) }, 200, origin);
    }
    if (!owner) return json({ code: "not_owner" }, 403, origin);
    if (!key) return json({ code: "not_configured" }, 503, origin);

    let messages: any[];
    let model = COACH_MODEL;
    let maxTokens = 1500;
    if (body.kind === "read") {
      const { image, mediaType } = body;
      const expected = Math.max(1, Math.min(3, Number(body.expected) || 3));
      const guesses = Array.isArray(body.guesses) ? body.guesses.filter((g: unknown) => typeof g === "string" && /^(MISS|BULL|25|[SDT]([1-9]|1\d|20))$/.test(g)).slice(0, 3) : [];
      if (typeof image !== "string" || image.length < 1000 || image.length > 5_000_000 || !MEDIA.includes(mediaType)) return json({ code: "bad_request" }, 400, origin);
      messages = [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
        { type: "text", text: readPrompt(expected, guesses) },
      ] }];
      model = VISION_MODEL;
      maxTokens = 600;
    } else if (body.kind === "coach") {
      const s = JSON.stringify(body.data ?? null);
      if (!body.data || typeof body.data !== "object" || s.length > 30000) return json({ code: "bad_request" }, 400, origin);
      messages = [{ role: "user", content: coachPrompt(body.data) }];
    } else return json({ code: "bad_request" }, 400, origin);

    const { data: n, error } = await admin.rpc("darts_bump_usage", { p_user: user.id, p_cap: CAP });
    if (error) return json({ code: "usage" }, 500, origin);
    if (n < 0) return json({ code: "cap", left: 0 }, 429, origin);

    const client = new Anthropic({ apiKey: key });
    let msg;
    try {
      msg = await client.messages.create({ model, max_tokens: maxTokens, messages, output_config: { effort: "low" } } as any);
    } catch (e) {
      const status = (e as { status?: number })?.status;
      return json({ code: status === 429 ? "rate_limited" : "upstream" }, 502, origin);
    }
    const text = (msg.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const out = firstJson(text);
    if (!out) return json({ code: "bad_reply" }, 502, origin);

    if (body.kind === "read") {
      const darts = (Array.isArray(out.darts) ? out.darts : []).slice(0, 3).map((d: any) => ({
        segment: Number(d.segment), ring: String(d.ring || "").toLowerCase(), confidence: String(d.confidence || "medium"),
      })).filter((d: any) => RINGS.includes(d.ring) && (d.ring.includes("bull") ? true : d.segment >= 1 && d.segment <= 20));
      return json({ darts, note: typeof out.note === "string" ? out.note.slice(0, 200) : "", left: CAP - n }, 200, origin);
    }
    const pr = (Array.isArray(out.priorities) ? out.priorities : []).slice(0, 4).map((p: any) => ({
      title: String(p.title || ""), why: String(p.why || ""), tip: String(p.tip || ""), drill: GAMES.includes(p.drill) ? p.drill : null,
    }));
    return json({
      summary: String(out.summary || ""), priorities: pr,
      tips: (Array.isArray(out.tips) ? out.tips : []).slice(0, 5).map(String),
      plan: (Array.isArray(out.plan) ? out.plan : []).slice(0, 7).map((p: any) => ({ day: String(p.day || ""), session: String(p.session || "") })),
      left: CAP - n,
    }, 200, origin);
  } catch (e) {
    return json({ code: "server", error: String((e as Error)?.message || e) }, 500, origin);
  }
});
