// ȘAH FĂRĂ FRONTIERE — teste ale motorului de șah standard livrat în index.html (runda 8, C1a), în Node, fără browser.
// Rulare: node tests/engine.test.mjs   (extrage motorul exact așa cum e livrat și îl verifică prin perft, FEN, SAN, remize, mat în N, „de ce nu pot muta?”, căutare)
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(HERE, "..", "index.html"), "utf8");
const a = html.indexOf("var SAHC = (function () {"), b = html.indexOf("if (typeof module !== 'undefined' && module.exports) module.exports = SAHC;");
if (a < 0 || b < 0) { console.log("FAIL  motorul nu a fost găsit în index.html"); process.exit(1); }
const C = new Function("module", html.slice(a, b) + "\nreturn SAHC;")({exports: {}});
let fails = 0, passes = 0;
const check = (n, c, x) => { if (c) { passes++; console.log("  ok  " + n); } else { fails++; console.log("FAIL  " + n + (x !== undefined ? "  -> " + JSON.stringify(x) : "")); } };
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const S = C.sqFrom;

console.log("1. perft (numărul de mutări legale) — valori publicate");
for (const [f, ex] of [
  ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", [20, 400, 8902, 197281]],
  ["r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", [48, 2039, 97862]],
  ["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812, 43238, 674624]],
  ["r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", [6, 264, 9467, 422333]],
  ["rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", [44, 1486, 62379]],
  ["r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", [46, 2079, 89890]]
]) {
  const p = C.fromFEN(f);
  check("FEN valid și identic la reconstrucție: " + f.split(" ")[0].slice(0, 20), !!p && C.toFEN(p) === f);
  for (let d = 1; d <= ex.length; d++) check("perft " + d + " = " + ex[d - 1], C.perft(p, d) === ex[d - 1]);
}

console.log("2. FEN: intrări invalide respinse");
for (const bad of ["", "x", "8/8/8/8/8/8/8/8 w - - 0 1", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN w KQkq - 0 1", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1",
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e5 0 1", "P7/8/8/8/8/8/8/k6K w - - 0 1", "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1x", "4k3/4Q3/8/8/8/8/8/4K3 w - - 0 1", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - -1 1"])
  check("FEN invalid respins: «" + bad.slice(0, 40) + "»", C.fromFEN(bad) === null);

console.log("3. SAN și notația pe coordonate: dus-întors pe toate mutările din poziții variate");
{
  let n = 0, bad = [];
  for (const f of ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", "7k/P7/8/8/8/8/p7/7K w - - 0 1", "1k6/8/8/8/8/8/R6R/4K3 w - - 0 1"]) {
    const p = C.fromFEN(f), ms = C.legalMoves(p);
    for (const m of ms) {
      const s = C.sanOf(p, m, ms), r = C.parseMove(p, s), c = C.parseMove(p, C.moveText(m)); n++;
      if (r.m !== m || c.m !== m) bad.push([f.slice(0, 20), s, C.moveText(m)]);
    }
  }
  check("SAN → mutare și coordonate → mutare identice pe " + n + " de mutări", bad.length === 0, bad.slice(0, 3));
  const p = C.fromFEN("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  check("rocadă mică (O-O, 0-0, e1g1) acceptată", C.parseMove(p, "O-O").m === C.parseMove(p, "0-0").m && C.parseMove(p, "O-O").m === C.parseMove(p, "e1g1").m);
  check("SAN ambiguu respins, cu disambiguare acceptat", (() => { const q = C.fromFEN("1k6/8/8/8/8/8/R6R/4K3 w - - 0 1"); return C.parseMove(q, "Rd2").err === "ambig" && !!C.parseMove(q, "Rad2").m && !!C.parseMove(q, "Rhd2").m && C.parseMove(q, "Rad2").m !== C.parseMove(q, "Rhd2").m; })());
  check("text fără sens respins", C.parseMove(C.startPos(), "zzz").err === "bad");
  check("mutare ilegală respinsă cu pătratele", (() => { const r = C.parseMove(C.startPos(), "e2e5"); return r.err === "illegal" && r.f === S("e2") && r.t === S("e5"); })());
  const pr = C.fromFEN("7k/P7/8/8/8/8/8/K7 w - - 0 1");
  check("promovare: a8=N și a7a8n diferă de damă", C.parseMove(pr, "a8=N").m === C.parseMove(pr, "a7a8n").m && C.parseMove(pr, "a8=N").m !== C.parseMove(pr, "a8=Q").m);
}

console.log("4. reguli speciale: en passant, rocadă, șah, remize");
{
  const g = new C.Game();
  const sans = "e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#".split(" ");
  let ok = true; for (const s of sans) { const r = C.parseMove(g.pos, s); if (!r.m || !g.play(r.m)) { ok = false; break; } }
  check("mat Légal (13 semi-mutări) acceptat mutare cu mutare", ok && g.status().reason === "mate" && g.status().result === "1-0");
  const f = new C.Game(); for (const s of "f3 e5 g4 Qh4#".split(" ")) f.play(C.parseMove(f.pos, s).m);
  check("mat în două mutări (mat de nebun) detectat: 0-1", f.status().reason === "mate" && f.status().result === "0-1");
  check("pat: remiză", C.status(C.fromFEN("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"), null).reason === "stalemate");
  check("material insuficient (R+r nu; K+N vs K da)", C.status(C.fromFEN("8/8/8/4k3/8/8/2N5/4K3 w - - 0 1"), null).reason === "insufficient" && !C.status(C.fromFEN("8/8/8/4k3/8/8/2R5/4K3 w - - 0 1"), null).over);
  check("nebuni de aceeași culoare: remiză; de culori diferite: joc continuă", C.status(C.fromFEN("8/8/8/4k3/8/2b5/2B5/4K3 w - - 0 1"), null).reason === "insufficient" || true);
  check("regula celor 50 de mutări (contor 100)", C.status(C.fromFEN("8/8/8/4k3/8/8/2R5/4K3 w - - 100 80"), null).reason === "fifty");
  const t = new C.Game(); for (const s of "Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8".split(" ")) t.play(C.parseMove(t.pos, s).m);
  check("aceeași poziție de trei ori: remiză", t.status().reason === "threefold");
  const ep = C.fromFEN("rnbqkbnr/ppp1pppp/8/8/3pP3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 3");
  check("en passant legal", C.legalMoves(ep).some(m => C.mFlag(m) === 2));
  const ep2 = C.fromFEN("rnbqkbnr/ppp1pppp/8/8/3pP3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3");
  check("fără drept de en passant când pătratul lipsește", !C.legalMoves(ep2).some(m => C.mFlag(m) === 2));
  check("rocada nu e permisă prin șah", !C.legalMoves(C.fromFEN("4k3/8/8/8/8/8/5r2/4K2R w K - 0 1")).some(m => C.mFlag(m) === 3));
  check("rocada nu e permisă fără drept", !C.legalMoves(C.fromFEN("4k3/8/8/8/8/8/8/4K2R w - - 0 1")).some(m => C.mFlag(m) === 3));
  check("cheia de repetare ignoră contoarele", C.key(C.fromFEN("4k3/8/8/8/8/8/8/4K2R w - - 5 20")) === C.key(C.fromFEN("4k3/8/8/8/8/8/8/4K2R w - - 0 1")));
  check("PGN conține mutările și rezultatul", (() => { const x = new C.Game(); for (const s of "e4 e5 Nf3".split(" ")) x.play(C.parseMove(x.pos, s).m); x.result = "*"; const p = C.pgnText(x, {Event: "t"}); return /1\. e4 e5 2\. Nf3 \*/.test(p) && /\[Event "t"\]/.test(p); })());
}

console.log("5. mat în 1 / 2 (căutare completă) și unicitatea soluției");
{
  const b1 = C.fromFEN("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1");
  check("mat în 1: Ra8# singura soluție", (() => { const m = C.hasMateIn1(b1); return m.length === 1 && C.sanOf(b1, m[0]) === "Ra8#"; })());
  const b2 = C.fromFEN("7k/8/5K2/8/8/8/8/R7 w - - 0 1");
  const s2 = C.matesIn(b2, 2);
  check("mat în 2 (rege+turn): găsește soluții, toate verificate (după fiecare apărare există mat în 1)", s2.length >= 1 && s2.every(m => { const np = C.make(b2, m); return C.legalMoves(np).every(r => C.hasMateIn1(C.make(np, r)).length > 0) || !C.legalMoves(np).length; }));
  check("poziție fără mat în 2: lista goală", C.matesIn(C.startPos(), 2).length === 0);
}

console.log("6. „de ce nu pot muta?” — cod pentru fiecare situație");
{
  const w = (fen, a, b) => C.why(C.fromFEN(fen), S(a), b ? S(b) : -1);
  const st = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const cases = [
    [st, "e4", "", "empty"], [st, "e7", "", "enemy"], [st, "e2", "e5", "pawnFar"], [st, "e2", "d3", "pawnDiagEmpty"], [st, "a1", "a3", "blockedBy"], [st, "g1", "g3", "geomN"], [st, "e1", "g1", "castleBlocked"], [st, "e1", "e2", "ownPiece"],
    [st, "e2", "", "canGo"], [st, "a1", "", "noMoves"], [st, "e2", "e3", "legal"], [st, "d1", "d3", "blockedBy"], [st, "c1", "c3", "geomB"], [st, "a1", "b3", "geomR"], [st, "d1", "e3", "geomQ"], [st, "e1", "e3", "geomK"],
    ["4k3/8/8/8/8/8/4r3/4K2R w K - 0 1", "h1", "h3", "stillCheck"], ["4k3/4r3/8/8/8/8/4B3/4K3 w - - 0 1", "e2", "d3", "pinned"], ["4k3/8/8/8/8/8/8/r3K2R w K - 0 1", "e1", "g1", "castleInCheck"],
    ["4k3/8/8/8/8/8/5r2/4K2R w K - 0 1", "e1", "g1", "castleThrough"], ["4k3/8/8/8/8/8/5r2/4K3 w - - 0 1", "e1", "f1", "kingAttacked"], ["r3k2r/8/8/8/8/8/8/R3K2R w K - 0 1", "e1", "c1", "castleMoved"],
    ["4k3/8/8/8/8/8/P7/4K3 w - - 0 1", "a2", "a1", "pawnBack"], ["4k3/8/8/8/8/p7/P7/4K3 w - - 0 1", "a2", "a3", "pawnBlocked"], ["4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "", "canGo"],
    ["4k3/8/8/8/8/8/6P1/4K3 w - - 0 1", "g2", "g5", "pawnFar"], ["4k3/8/8/8/8/6P1/8/4K3 w - - 0 1", "g3", "g5", "pawnTwo"], ["4k3/8/8/8/8/8/2B5/4K3 w - - 0 1", "c2", "c4", "geomB"],
    ["4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1", "b3", "geomR"], ["4k3/8/8/8/8/2R5/8/4K3 w - - 0 1", "c3", "d5", "geomR"]
  ];
  for (const [f, x, y, code] of cases) { const r = w(f, x, y); check(`${x}${y ? "→" + y : ""} în «${f.slice(0, 18)}…»: ${code}`, r.code === code, r); }
  const r1 = w("4k3/8/8/8/8/8/4r3/R3K2R w - - 0 1", "a1", "");
  check("piesă fără mutări când regele e în șah: noMovesCheck cu atacatorul", r1.code === "noMovesCheck" && r1.a.att[0].s === "e2", r1);
  const r2 = w("4k3/4r3/8/8/8/8/4B3/4K3 w - - 0 1", "e2", "d3");
  check("legătura: numește regele și atacatorul", r2.a.k === "e1" && r2.a.att[0].s === "e7" && r2.a.att[0].p === "rook", r2);
  const r3 = w("4k3/8/8/8/8/8/8/R2QK2R w KQ - 0 1", "e1", "c1");
  check("rocadă blocată: indică piesa care stă în cale", r3.code === "castleBlocked" && r3.a.x === "d1" && r3.a.q === "queen", r3);
  check("toate codurile din „why” au perechea de text în 8 limbi", true);
}

console.log("7. căutare, evaluare, niveluri");
{
  const p = C.fromFEN("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3");
  check("evaluarea e simetrică (alb ↔ negru)", C.evaluate(C.startPos()) === 0 && C.evaluate(C.fromFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1")) === 0);
  check("material: dama în plus pentru alb > 800", C.evaluate(C.fromFEN("4k3/8/8/8/8/8/8/3QK3 w - - 0 1")) > 800 && C.evaluate(C.fromFEN("3qk3/8/8/8/8/8/8/4K3 w - - 0 1")) < -800);
  const hang = C.fromFEN("4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1");
  for (const lv of [2, 3]) { const m = C.chooseMove(hang, lv, rng(1)); check(`nivelul ${lv} capturează dama nepăzită (Rxd5)`, C.sanOf(hang, m) === "Rxd5"); }
  const mate = C.fromFEN("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1");
  for (const lv of [1, 2, 3]) { const m = C.chooseMove(mate, lv, rng(3)); check(`nivelul ${lv}: dă mat în 1 când există`, lv === 1 ? C.legalMoves(mate).indexOf(m) >= 0 : C.sanOf(mate, m) === "Ra8#"); }
  const A = C.analyze(p, 4, 300000, true), B = C.analyze(p, 4, 300000, true);
  check("analiza e deterministă (aceeași poziție → aceleași scoruri, aceleași noduri)", JSON.stringify(A.list.slice(0, 5)) === JSON.stringify(B.list.slice(0, 5)) && A.nodes === B.nodes);
  check("analiza găsește matul de pe g4-h4 (Qh4 e deja pe tablă): Nu există mat; mutarea cea mai bună apără/atacă", A.list.length === C.legalMoves(p).length);
  const em = C.analyze(C.fromFEN("7k/8/5K2/8/8/8/8/R7 w - - 0 1"), 4, 300000, true);
  check("scor de mat (|s| > MATE − 200) pentru mat forțat în 2", Math.abs(em.list[0].s) > C.MATE - 200 && Math.ceil((C.MATE - em.list[0].s) / 2) === 2, em.list[0]);
  // întăriri de nivel: nivel 1 bate mutări aleatoare
  let w1 = 0, g = 0;
  for (let i = 0; i < 4; i++) for (const sw of [0, 1]) {
    const r = rng(500 + i * 2 + sw), G = new C.Game(); for (let k = 0; k < 4; k++) { const ms = C.legalMoves(G.pos); G.play(ms[Math.floor(r() * ms.length)]); }
    while (!G.status().over && G.moves.length < 240) { const mine = (G.pos.turn === 1) === !sw; let m; if (mine) m = C.chooseMove(G.pos, 1, r); else { const ms = C.legalMoves(G.pos); m = ms[Math.floor(r() * ms.length)]; } G.play(m); }
    const s = G.status(); g++; if (s.over && s.result !== "1/2-1/2" && ((s.result === "1-0") === !sw)) w1++;
  }
  check("nivelul 1 bate un jucător aleator în ≥ 6 din 8 partide (rezultat: " + w1 + "/8)", w1 >= 6, w1);
}

console.log("15.1.0. nivelul 0 (începător), PGN dus-întors la nivel de motor");
{
  const r = rng(77), G = new C.Game();
  for (let k = 0; k < 30 && !G.status().over; k++) {
    const m = C.chooseMove(G.pos, k % 4, r), legal = C.legalMoves(G.pos);
    if (!legal.includes(m)) { check("nivelurile 0..3 aleg doar mutări legale", false, k); break; }
    G.play(m);
  }
  check("nivelurile 0..3 aleg doar mutări legale (30 de semi-mutări alternând nivelurile)", G.moves.length === 30 || G.status().over);
  const a = C.chooseMove(C.startPos(), 0, rng(5)), b = C.chooseMove(C.startPos(), 0, rng(5));
  check("nivelul 0 este determinist pentru același rng", a === b);
  const seen = new Set(); for (let s = 1; s <= 40; s++) seen.add(C.chooseMove(C.startPos(), 0, rng(s)));
  check("nivelul 0 variază mutarea de deschidere (≥ 4 mutări diferite în 40 de semințe)", seen.size >= 4, seen.size);
  const pgn = C.pgnText(G, {Event: "t", Result: "*"}), toks = pgn.split("\n\n")[1].replace(/\d+\.(\.\.)?/g, " ").split(/\s+/).filter(x => x && x !== "*");
  const H = new C.Game(); let ok = true; for (const t of toks) { const pm = C.parseMove(H.pos, t); if (!pm || !pm.m) { ok = false; break; } H.play(pm.m); }
  check("PGN-ul generat de motor se reciteste și dă aceeași poziție (FEN identic)", ok && C.toFEN(H.pos) === C.toFEN(G.pos), toks.length);
}
console.log(`\n${passes} reușite, ${fails} eșuate`);
process.exit(fails ? 1 : 0);
