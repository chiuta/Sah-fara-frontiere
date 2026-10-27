// ȘAH FĂRĂ FRONTIERE 15.2.0 — nivelul AI 4 („expert”): parametri, determinism, legalitate, buget de noduri, tactici simple; nivelurile 0–3 neschimbate.
// Rulare: node tests/level4.test.mjs   (motor local, fără browser, fără rețea). Simularea de forță (≥50 de partide) este în tests/level4-sim.mjs (lungă, nu rulează implicit).
import fs from "fs"; import path from "path"; import {fileURLToPath} from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(HERE, "..", "index.html"), "utf8");
const a = html.indexOf("var SAHC = (function () {"), b = html.indexOf("if (typeof module !== 'undefined' && module.exports) module.exports = SAHC;");
const C = new Function("module", html.slice(a, b) + "\nreturn SAHC;")({exports: {}});
let fails = 0; const check = (n, c, x) => { console.log((c ? "  ok  " : "FAIL  ") + n + (!c && x !== undefined ? "  -> " + JSON.stringify(x) : "")); if (!c) fails++; };
const L = C.LEVELS;
console.log("1. nivelurile 0–3 sunt neschimbate (turneul Elo le folosește la fel)");
check("nivel 0: adâncime 1, 5000 noduri, pick 6, margin 300", JSON.stringify(L[0]) === JSON.stringify({depth: 1, nodes: 5000, pick: 6, margin: 300}), L[0]);
check("nivel 1: adâncime 1, 20000 noduri, pick 3, margin 60", JSON.stringify(L[1]) === JSON.stringify({depth: 1, nodes: 20000, pick: 3, margin: 60}), L[1]);
check("nivel 2: adâncime 2, 60000 noduri, pick 2, margin 15", JSON.stringify(L[2]) === JSON.stringify({depth: 2, nodes: 60000, pick: 2, margin: 15}), L[2]);
check("nivel 3: adâncime 5, 300000 noduri, pick 1, margin 0", JSON.stringify(L[3]) === JSON.stringify({depth: 5, nodes: 300000, pick: 1, margin: 0}), L[3]);
check("SIM (simularea turneului) neschimbat", JSON.stringify(C.SIM) === JSON.stringify({1: {depth: 1, nodes: 8000, pick: 3, margin: 60}, 2: {depth: 2, nodes: 20000, pick: 2, margin: 15}, 3: {depth: 3, nodes: 60000, pick: 1, margin: 0}}));
console.log("2. nivelul 4");
check("nivel 4 definit: adâncime 7, 1 500 000 noduri, fără variație (pick 1)", JSON.stringify(L[4]) === JSON.stringify({depth: 7, nodes: 1500000, pick: 1, margin: 0}), L[4]);
check("bugetul nivelului 4 încape sub plafonul HARD al căutării (3 000 000)", L[4].nodes <= 3000000);
const fens = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1"];
for (const f of fens) {
  const p = C.fromFEN(f), legal = C.legalMoves(p);
  const m1 = C.chooseMove(p, 4, null), m2 = C.chooseMove(p, 4, () => 0.5);
  check("mutare legală și identică la rulări repetate (determinist), cu și fără rng: " + f.slice(0, 18), legal.indexOf(m1) >= 0 && m1 === m2, [C.moveText(m1), C.moveText(m2)]);
}
console.log("3. buget de noduri și adâncime");
{
  const p = C.fromFEN(fens[1]);
  const r4 = C.analyze(p, L[4].depth, L[4].nodes, false), r3 = C.analyze(p, L[3].depth, L[3].nodes, false);
  check("nivel 4: nodurile ≤ plafonul 3 000 000", r4.nodes <= 3000000, r4.nodes);
  check("nivel 4 caută cel puțin la fel de adânc ca nivelul 3 și folosește mai multe noduri", r4.depth >= r3.depth && r4.nodes > r3.nodes, {d4: r4.depth, d3: r3.depth, n4: r4.nodes, n3: r3.nodes});
}
console.log("4. tactici simple (nivelul 4 trebuie să le găsească)");
{
  const mate1 = C.fromFEN("rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2");
  check("mat în 1 (Dh4#)", C.moveText(C.chooseMove(mate1, 4, null)) === "d8h4");
  const legal = C.fromFEN("r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 0 1");
  const sol = C.matesIn(legal, 2).map(C.moveText), mv = C.moveText(C.chooseMove(legal, 4, null));
  check("mat în 2 (poziția lui Légal): mutarea aleasă este una din soluțiile motorului de mat", sol.length > 0 && sol.indexOf(mv) >= 0, {sol, mv});
}
console.log(fails ? "EȘEC: " + fails : "TOATE OK"); process.exit(fails ? 1 : 0);
