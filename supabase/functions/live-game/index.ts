// live-game — backend for SpinDecks Live: a whole-class, Kahoot-style quiz where
// students join from their own devices with a PIN. No sign-in: the teacher hosts
// and students join anonymously. All reads and writes go through this function
// (service role), so the live_games/live_players/live_answers tables have RLS on
// with no anon policies. verify_jwt is off; there is no user auth here.
//
// POST { action: "create", setName, questions:[{q,options:[...],correct:int}] }
//   -> { gameId, pin, hostToken }
// POST { action: "join", pin, name }            -> { gameId, playerId, playerToken, name }
// POST { action: "host", gameId, hostToken, op: "next"|"reveal"|"end" } -> { ok, state, currentQ }
// POST { action: "answer", gameId, playerId, playerToken, qIndex, choice } -> { correct, gained, score }
// POST { action: "state", pin|gameId }          -> sanitized game state (no correct answer until reveal)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const ORIGINS = ["https://spindecks.app", "https://www.spindecks.app"];
const isLocal = (o: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": ORIGINS.includes(origin) || isLocal(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

const TIME_LIMIT_MS = 20000; // question window used for the speed bonus
const MAX_PLAYERS = 60;
const MAX_Q = 60;
const makePin = () => String(Math.floor(100000 + Math.random() * 900000));

function sanitizeQuestions(arr: any): any[] | null {
  if (!Array.isArray(arr) || !arr.length || arr.length > MAX_Q) return null;
  const out = [];
  for (const q of arr) {
    if (!q || typeof q.q !== "string" || !q.q.trim()) return null;
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) return null;
    const options = q.options.map((o: any) => String(o).slice(0, 160));
    const correct = Number(q.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
    out.push({ q: String(q.q).slice(0, 320), options, correct });
  }
  return out;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, 405, origin);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400, origin); }
  const action = body.action;

  try {
    if (action === "create") {
      const questions = sanitizeQuestions(body.questions);
      if (!questions) return json({ error: "bad_questions" }, 400, origin);
      const setName = String(body.setName || "Quiz").slice(0, 80);
      // Housekeeping: clear games older than a day (cascades to players/answers).
      await admin.from("live_games").delete().lt("created_at", new Date(Date.now() - 864e5).toISOString());
      const hostToken = crypto.randomUUID();
      let pin = "";
      for (let i = 0; i < 10; i++) {
        const p = makePin();
        const { data } = await admin.from("live_games").select("id").eq("pin", p).maybeSingle();
        if (!data) { pin = p; break; }
      }
      if (!pin) return json({ error: "no_pin" }, 500, origin);
      const { data, error } = await admin.from("live_games")
        .insert({ pin, host_token: hostToken, set_name: setName, questions, state: "lobby", current_q: -1 })
        .select("id,pin").single();
      if (error) return json({ error: "db" }, 500, origin);
      return json({ gameId: data.id, pin: data.pin, hostToken }, 200, origin);
    }

    if (action === "join") {
      const pin = String(body.pin || "").trim();
      const name = String(body.name || "").trim().slice(0, 20);
      if (!name) return json({ error: "bad_name" }, 400, origin);
      const { data: g } = await admin.from("live_games").select("id,state")
        .eq("pin", pin).neq("state", "ended").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!g) return json({ error: "no_game" }, 404, origin);
      const { count } = await admin.from("live_players").select("id", { count: "exact", head: true }).eq("game_id", g.id);
      if ((count || 0) >= MAX_PLAYERS) return json({ error: "full" }, 403, origin);
      const playerToken = crypto.randomUUID();
      const { data: p, error } = await admin.from("live_players")
        .insert({ game_id: g.id, name, player_token: playerToken }).select("id").single();
      if (error) return json({ error: "db" }, 500, origin);
      return json({ gameId: g.id, playerId: p.id, playerToken, name }, 200, origin);
    }

    if (action === "host") {
      const { gameId, hostToken, op } = body;
      const { data: g } = await admin.from("live_games").select("*").eq("id", gameId).maybeSingle();
      if (!g || g.host_token !== hostToken) return json({ error: "forbidden" }, 403, origin);
      const patch: any = { updated_at: new Date().toISOString() };
      if (op === "next") {
        const next = g.current_q + 1;
        if (next >= g.questions.length) { patch.state = "ended"; }
        else { patch.state = "question"; patch.current_q = next; patch.q_started_at = new Date().toISOString(); }
      } else if (op === "reveal") { patch.state = "reveal"; }
      else if (op === "end") { patch.state = "ended"; }
      else return json({ error: "bad_op" }, 400, origin);
      await admin.from("live_games").update(patch).eq("id", gameId);
      return json({ ok: true, state: patch.state ?? g.state, currentQ: patch.current_q ?? g.current_q }, 200, origin);
    }

    if (action === "answer") {
      const { gameId, playerId, playerToken, qIndex, choice } = body;
      const { data: p } = await admin.from("live_players").select("id,player_token,score,streak,game_id").eq("id", playerId).maybeSingle();
      if (!p || p.player_token !== playerToken || p.game_id !== gameId) return json({ error: "forbidden" }, 403, origin);
      const { data: g } = await admin.from("live_games").select("questions,state,current_q,q_started_at").eq("id", gameId).maybeSingle();
      if (!g || g.state !== "question" || g.current_q !== Number(qIndex)) return json({ error: "closed" }, 409, origin);
      const q = g.questions[g.current_q];
      const choiceN = Number(choice);
      if (!Number.isInteger(choiceN) || choiceN < 0 || choiceN >= q.options.length) return json({ error: "bad_choice" }, 400, origin);
      const correct = choiceN === q.correct;
      const started = g.q_started_at ? Date.parse(g.q_started_at) : Date.now();
      const ms = Math.max(0, Date.now() - started);
      let gained = 0;
      const streak = correct ? p.streak + 1 : 0;
      if (correct) {
        gained = Math.round(1000 - 500 * Math.min(1, ms / TIME_LIMIT_MS));
        if (streak >= 2) gained += Math.min(500, (streak - 1) * 50);
      }
      const { error: ansErr } = await admin.from("live_answers")
        .insert({ game_id: gameId, player_id: playerId, q_index: g.current_q, choice: choiceN, correct, ms });
      if (ansErr) return json({ error: "already" }, 409, origin); // duplicate (already answered)
      await admin.from("live_players").update({ score: p.score + gained, streak }).eq("id", playerId);
      return json({ correct, gained, score: p.score + gained, streak }, 200, origin);
    }

    if (action === "state") {
      const { pin, gameId } = body;
      let g: any = null;
      if (gameId) ({ data: g } = await admin.from("live_games").select("*").eq("id", gameId).maybeSingle());
      else ({ data: g } = await admin.from("live_games").select("*").eq("pin", String(pin || "")).neq("state", "ended").order("created_at", { ascending: false }).limit(1).maybeSingle());
      if (!g) return json({ error: "no_game" }, 404, origin);
      const { data: players } = await admin.from("live_players").select("name,score").eq("game_id", g.id).order("score", { ascending: false });
      let question: any = null, answered = 0, tally: any = null, correctIndex: any = null;
      if (g.current_q >= 0 && g.questions[g.current_q]) {
        const q = g.questions[g.current_q];
        question = { index: g.current_q, q: q.q, options: q.options, count: g.questions.length };
        const { data: ans } = await admin.from("live_answers").select("choice,correct").eq("game_id", g.id).eq("q_index", g.current_q);
        answered = ans?.length || 0;
        if (g.state === "reveal" || g.state === "ended") {
          correctIndex = q.correct;
          tally = q.options.map((_: any, i: number) => (ans || []).filter((a: any) => a.choice === i).length);
        }
      }
      return json({
        state: g.state, currentQ: g.current_q, setName: g.set_name,
        question, answered, total: players?.length || 0, correctIndex, tally,
        players: (players || []).map((p: any) => ({ name: p.name, score: p.score })),
      }, 200, origin);
    }

    return json({ error: "bad_action" }, 400, origin);
  } catch (_e) {
    return json({ error: "server" }, 500, origin);
  }
});
