// axiom-engine.js — the pure rules of Axiom, with no DOM or browser deps so it
// can be unit-tested in Node and shared by the game UI (axiom.js).
//
// A "line" is an array of cell tokens laid left→right:
//   expr  REL  expr        e.g.  3 + 4 = 7   or   3 + 4 > 6   or   2 × 3 ≠ 5
// where expr = num (op num)*  (evaluated strictly LEFT TO RIGHT, no BIDMAS),
// REL is one of = < ≤ > ≥ ≠, and the whole line must contain at least one of the
// four arithmetic operations. A true line scores:
//   =            → the value both sides equal (can be negative)
//   ≠            → NEQ_SCORE
//   < ≤ > ≥      → the game's inequality score "X"
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

// Evaluate an expression [num, op, num, op, num, …] strictly left to right.
export function evalExpr(tok) {
  if (!tok.length || tok[0].kind !== "num") return NaN;
  let acc = tok[0].v;
  for (let i = 1; i < tok.length; i += 2) {
    const op = tok[i], n = tok[i + 1];
    if (!op || op.kind !== "op" || !n || n.kind !== "num") return NaN;
    acc = applyOp(acc, op.v, n.v);
  }
  return acc;
}

// Split a line at its single relation into { left, rel, right }.
export function splitLine(cells) {
  const rels = cells.filter((c) => c.kind === "rel");
  if (rels.length !== 1) return null;
  const ri = cells.findIndex((c) => c.kind === "rel");
  return { left: cells.slice(0, ri), rel: cells[ri].v, right: cells.slice(ri + 1) };
}

// A well-formed expression alternates num, op, num, … and is odd-length.
export function exprOk(tok) {
  if (!tok.length || tok.length % 2 === 0) return false;
  for (let i = 0; i < tok.length; i++) if (tok[i].kind !== (i % 2 === 0 ? "num" : "op")) return false;
  return true;
}

// Parse + evaluate a full line. Returns {ok, reason} or {ok:true, leftVal, rightVal, rel}.
export function parseLine(cells) {
  const sp = splitLine(cells);
  if (!sp) return { ok: false, reason: "Use exactly one relation (=, <, >, ≠ …)." };
  if (!exprOk(sp.left) || !exprOk(sp.right)) return { ok: false, reason: "Each side must read number, operation, number…" };
  if (sp.left.length === 1 && sp.right.length === 1) return { ok: false, reason: "Use at least one operation (+ − × ÷)." };
  const L = evalExpr(sp.left), R = evalExpr(sp.right);
  if (!Number.isFinite(L) || !Number.isFinite(R)) return { ok: false, reason: "That doesn't work out (check ÷ by zero)." };
  return { ok: true, leftVal: L, rightVal: R, rel: sp.rel };
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
  else s = ineqScore;
  if (x2) s *= 2;
  return { true: true, score: s };
}

// Composer: may a token of `kind` ("num" | "op" | "rel") be appended next?
export function canAppend(cells, kind) {
  const n = cells.length;
  if (n === 0) return kind === "num";
  const hasRel = cells.some((c) => c.kind === "rel");
  const last = cells[n - 1];
  if (last.kind === "num") {
    if (kind === "op") return true;
    if (kind === "rel") return !hasRel;
    return false;
  }
  if (last.kind === "op" || last.kind === "rel") return kind === "num";
  return false;
}

// Structurally complete (both sides well-formed around one relation)?
export function isComplete(cells) {
  const sp = splitLine(cells);
  return !!sp && exprOk(sp.left) && exprOk(sp.right);
}
