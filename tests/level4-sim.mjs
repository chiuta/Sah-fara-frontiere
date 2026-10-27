// ȘAH FĂRĂ FRONTIERE 15.2.0 — simularea de forță: nivelul 4 (expert) contra nivelului 3 (avansat), N ≥ 50 de partide, culori alternate, deschideri aleatoare deterministe.
// Rulare lungă (câteva minute pe partidă, în funcție de calculator):
//   node tests/level4-sim.mjs run <de_la> <până_la> [nivelA=4] [nivelB=3] > rezultate-1.jsonl      (partidele <de_la>..<până_la>-1; perechile i, i+1 au aceeași deschidere cu culori inversate)
//   node tests/level4-sim.mjs summary rezultate-*.jsonl                                           (scor, interval Wilson 95 %, estimare Elo)
// Motorul și toate datele sunt locale; nu există rețea. Rezultatul este deterministic (căutare cu buget de noduri, nu cu ceas).
import fs from "fs"; import path from "path"; import {fileURLToPath} from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [mode, ...args] = process.argv.slice(2);
if (mode === "summary") {
  const rows = args.flatMap(f => fs.readFileSync(f, "utf8").split("\n").filter(l => l.startsWith("{")).map(l => JSON.parse(l)));
  const seen = new Set(), R = rows.filter(r => !seen.has(r.i) && seen.add(r.i));
  const n = R.length, sc = R.reduce((a, r) => a + r.strong, 0), w = R.filter(r => r.strong === 1).length, d = R.filter(r => r.strong === 0.5).length, l = R.filter(r => r.strong === 0).length;
  const p = sc / n, z = 1.96, den = 1 + z * z / n, ctr = (p + z * z / (2 * n)) / den, hw = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den;
  const elo = q => -400 * Math.log10(1 / Math.min(Math.max(q, 1e-6), 1 - 1e-6) - 1);
  console.log(JSON.stringify({games: n, wins: w, draws: d, losses: l, score: +p.toFixed(4), wilson95: [+(ctr - hw).toFixed(4), +(ctr + hw).toFixed(4)], eloDiff: Math.round(elo(p)), eloDiff95: [Math.round(elo(ctr - hw)), Math.round(elo(ctr + hw))], asWhite: R.filter(r => r.strongWhite).reduce((a, r) => a + r.strong, 0) + "/" + R.filter(r => r.strongWhite).length, asBlack: R.filter(r => !r.strongWhite).reduce((a, r) => a + r.strong, 0) + "/" + R.filter(r => !r.strongWhite).length, adjudicated: R.filter(r => r.reason === "adj").length, avgPlies: Math.round(R.reduce((a, r) => a + r.plies, 0) / n)}));
  process.exit(0);
}
if (mode !== "run") { console.error("utilizare: run <de_la> <până_la> [A] [B] | summary fișiere…"); process.exit(2); }
const html = fs.readFileSync(path.resolve(HERE, "..", "index.html"), "utf8");
const a0 = html.indexOf("var SAHC = (function () {"), b0 = html.indexOf("if (typeof module !== 'undefined' && module.exports) module.exports = SAHC;");
const C = new Function("module", html.slice(a0, b0) + "\nreturn SAHC;")({exports: {}});
const from = +args[0], to = +args[1], A = +(args[2] || 4), B = +(args[3] || 3);
const rng = s => { let x = s >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
for (let i = from; i < to; i++) {
  const op = rng(1000 + (i >> 1)), g = new C.Game();
  for (let k = 0; k < 6; k++) { const ms = C.legalMoves(g.pos); g.play(ms[Math.floor(op() * ms.length)]); }
  const strongWhite = (i % 2 === 0), r = rng(77 + i); let res = null;
  while (!res) {
    const st = g.status(); if (st.over) { res = st; break; }
    if (g.moves.length >= 140) { const e = C.evaluate(g.pos); res = {result: Math.abs(e) < 150 ? "1/2-1/2" : (e > 0 ? "1-0" : "0-1"), reason: "adj"}; break; }
    const white = g.pos.turn === 1, lv = (white === strongWhite) ? A : B, m = C.chooseMove(g.pos, lv, r);
    if (!m) { res = {result: "1/2-1/2", reason: "nomove"}; break; }
    g.play(m);
  }
  const rr = res.result, strong = rr === "1/2-1/2" ? 0.5 : ((rr === "1-0") === strongWhite ? 1 : 0);
  console.log(JSON.stringify({i, strongWhite, result: rr, reason: res.reason, plies: g.moves.length, strong}));
}
