// axiom-engine.js — the pure rules of Axiom, with no DOM or browser deps so it
// can be unit-tested in Node and shared by the game UI (axiom.js).
//
// A "line" is an array of cell tokens laid left→right. Consecutive NUMBER tiles
// combine into one multi-digit number (3,5 → 35; 1,2 → 12), and a negative tile
// may only lead such a group (−2,0 → −20, but 2,−3 is illegal). After grouping,
// a line reads:
//   expr  REL  expr        e.g.  3 5 + 4 = 3 9   or   3 + 4 > 6   or   2 × 3 ≠ 5
// where expr = number (op number)*  (evaluated strictly LEFT TO RIGHT, no
// BIDMAS), REL is one of = < ≤ > ≥ ≠, and the whole line must contain at least
// one of the four arithmetic operations. A true line scores:
//   =            → the value both sides equal (can be negative)
//   ≠            → NEQ_SCORE
//   < ≤ > ≥      → the game's inequality score "X", plus a little more the
//                  wider the gap between the two sides (capped at X), so a
//                  bold 12 × 3 > 5 beats a safe little 4 > 3.
// A ×2 modifier doubles the line's score.

export const OPS = ["+", "−", "×", "÷"];
export const RELS = ["=", "<", "≤", ">", "≥", "≠"];
export const NEQ_SCORE = 5;

export function applyOp(a, op, b) {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
  }
  return NaN;
}

// Combine a run of consecutive number cells into one value. A negative tile is
// only allowed as the leading (first) tile; digits are concatenated.
export function combineNumber(group) {
  for (let i = 1; i < group.length; i++) if (group[i].v < 0) return { ok: false, reason: "A negative tile can only lead a number." };
  const sign = group[0].v < 0 ? -1 : 1;
  const mag = group.map((g, i) => (i === 0 ? String(Math.abs(g.v)) : String(g.v))).join("");
  return { ok: true, v: sign * Number(mag) };
}

// Collapse a line's cells into segments: combined numbers + op/rel separators.
// Returns {ok, reason} or {ok:true, segs:[{t:"num"|"op"|"rel", v}]}.
export function segment(cells) {
  const segs = [];
  for (let i = 0; i < cells.length; ) {
    const c = cells[i];
    if (c.kind === "num") {
      const group = [c]; let j = i + 1;
      while (j < cells.length && cells[j].kind === "num") group.push(cells[j++]);
      const combined = combineNumber(group);
      if (!combined.ok) return combined;
      segs.push({ t: "num", v: combined.v });
      i = j;
    } else if (c.kind === "op") { segs.push({ t: "op", v: c.v }); i++; }
    else if (c.kind === "rel") { segs.push({ t: "rel", v: c.v }); i++; }
    else return { ok: false, reason: "bad tile" };
  }
  return { ok: true, segs };
}

// Evaluate a segment expression [num, op, num, …] strictly left to right.
export function evalExpr(segs) {
  if (!segs.length || segs[0].t !== "num") return NaN;
  let acc = segs[0].v;
  for (let i = 1; i < segs.length; i += 2) {
    const op = segs[i], n = segs[i + 1];
    if (!op || op.t !== "op" || !n || n.t !== "num") return NaN;
    acc = applyOp(acc, op.v, n.v);
  }
  return acc;
}

// A well-formed expression alternates num, op, num, … and is odd-length.
export function exprOk(segs) {
  if (!segs.length || segs.length % 2 === 0) return false;
  for (let i = 0; i < segs.length; i++) if (segs[i].t !== (i % 2 === 0 ? "num" : "op")) return false;
  return true;
}

// Parse + evaluate a full line. Returns {ok, reason} or {ok:true, leftVal, rightVal, rel}.
export function parseLine(cells) {
  const sg = segment(cells);
  if (!sg.ok) return sg;
  const segs = sg.segs;
  if (segs.filter((s) => s.t === "rel").length !== 1) return { ok: false, reason: "Use exactly one relation (=, <, >, ≠ …)." };
  const ri = segs.findIndex((s) => s.t === "rel");
  const left = segs.slice(0, ri), right = segs.slice(ri + 1);
  if (!exprOk(left) || !exprOk(right)) return { ok: false, reason: "Each side must read number, operation, number…" };
  if (left.length === 1 && right.length === 1) return { ok: false, reason: "Use at least one operation (+ − × ÷)." };
  const L = evalExpr(left), R = evalExpr(right);
  if (!Number.isFinite(L) || !Number.isFinite(R)) return { ok: false, reason: "That doesn't work out (check ÷ by zero)." };
  return { ok: true, leftVal: L, rightVal: R, rel: segs[ri].v };
}

export function relTrue(L, rel, R) {
  switch (rel) {
    case "=": return L === R;
    case "≠": return L !== R;
    case "<": return L < R;
    case "≤": return L <= R;
    case ">": return L > R;
    case "≥": return L >= R;
  }
  return false;
}

// Score a parsed line. { true: bool, score: number } — before any Gift reassignment.
export function scoreLine(parsed, { x2 = false, ineqScore = 5 } = {}) {
  if (!parsed.ok || !relTrue(parsed.leftVal, parsed.rel, parsed.rightVal)) return { true: false, score: 0 };
  let s;
  if (parsed.rel === "=") s = parsed.leftVal;
  else if (parsed.rel === "≠") s = NEQ_SCORE;
  else s = ineqScore + Math.min(ineqScore, Math.abs(parsed.leftVal - parsed.rightVal)); // X + margin (capped at X)
  if (x2) s *= 2;
  return { true: true, score: s };
}

// Classify a line for commit validation — so you can only lay tiles that build
// or complete a real equation, never a dead false sum or an inert clump of
// digits that just blocks squares. Returns { status, hasOp }:
//   "true"    — a complete, TRUE equation/inequality (it scores)
//   "false"   — a complete statement that is FALSE (illegal to leave on board)
//   "garbage" — malformed / can never become true (e.g. two relations, ÷0)
//   "partial" — a well-formed beginning of an equation, still completable
// hasOp = the line already contains an operation or relation (a genuine
// calculation in progress), as opposed to a bare multi-digit number.
export function classifyLine(cells) {
  const sg = segment(cells);
  if (!sg.ok) return { status: "garbage", hasOp: false };
  const segs = sg.segs;
  const hasOp = segs.some((s) => s.t === "op" || s.t === "rel");
  const rels = segs.filter((s) => s.t === "rel").length;
  if (rels > 1) return { status: "garbage", hasOp };            // two relations: nonsense
  const parsed = parseLine(cells);
  if (parsed.ok) {
    return { status: relTrue(parsed.leftVal, parsed.rel, parsed.rightVal) ? "true" : "false", hasOp, parsed };
  }
  // Not a complete statement. A ÷0 anywhere makes the line un-completable.
  for (let i = 0; i + 2 < segs.length; i++) if (segs[i].t === "num" && segs[i + 1].t === "op" && segs[i + 1].v === "÷" && segs[i + 2].t === "num" && segs[i + 2].v === 0) return { status: "garbage", hasOp };
  return { status: "partial", hasOp };
}
