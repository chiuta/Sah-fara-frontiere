// ȘAH FĂRĂ FRONTIERE 15.1.0 — filtre dificultate/jucători în atlas, „Contra motorului” (nivel reglabil, anulare, PGN dus-întors).
// Rulare: node tests/vs-filters.test.mjs   (motor local, fără rețea)
import {launch, check, summary} from "./_lib.mjs";
const SPEECH = {content: "try{if(window.name!=='__sff_lang'){window.name='__sff_lang';localStorage.setItem('sah-fara-frontiere.lang','en')}}catch(e){}"};
const {page, st} = await launch({init: SPEECH});
await page.waitForTimeout(1200);

// --- filtre atlas ---
const total = await page.evaluate(() => V.length);
const count = () => page.evaluate(() => document.querySelectorAll("#grid .card:not(.hidden)").length);
check("atlasul pornește cu toate intrările vizibile", await count() === total, [await count(), total]);
const expDiff = await page.evaluate(() => [1, 2, 3, 4].map(d => V.filter(v => v.difficulty === d).length));
for (const d of [1, 2, 3, 4]) {
  await page.click(`.diff-filter[data-diff="${d}"]`);
  await page.waitForTimeout(150);
  check(`filtru dificultate ${d}: ${expDiff[d - 1]} intrări`, await count() === expDiff[d - 1], [await count(), expDiff[d - 1]]);
}
await page.click(`.diff-filter[data-diff="0"]`); await page.waitForTimeout(150);
check("«Toate» (dificultate) readuce lista completă", await count() === total);
const expPl = await page.evaluate(() => { const o = {solo: 0, two: 0, multi: 0}; V.forEach(v => { const c = _playersClass(v); if (c) o[c]++; }); return o; });
check("clasificarea jucătorilor acoperă majoritatea variantelor", expPl.two > 600 && expPl.solo > 40 && expPl.multi > 5, expPl);
for (const k of ["solo", "two", "multi"]) {
  await page.click(`.pl-filter[data-pl="${k}"]`); await page.waitForTimeout(150);
  check(`filtru jucători «${k}»: ${expPl[k]} intrări`, await count() === expPl[k], [await count(), expPl[k]]);
}
await page.click(`.diff-filter[data-diff="4"]`); await page.waitForTimeout(150);
const comb = await page.evaluate(() => V.filter(v => v.difficulty === 4 && _playersClass(v) === "multi").length);
check("filtrele se combină (dificultate × jucători)", await count() === comb, [await count(), comb]);
await page.click(`.diff-filter[data-diff="0"]`); await page.click(`.pl-filter[data-pl="all"]`); await page.waitForTimeout(150);
check("fără filtre: lista completă din nou", await count() === total);
check("clase jucători: 2+arbitru → two, 1+AI → solo, 2-4 → multi, — → nespecificat", await page.evaluate(() => [_playersClass({meta:{players:"2+arbitru"}}), _playersClass({meta:{players:"1+AI"}}), _playersClass({meta:{players:"2-4"}}), _playersClass({meta:{players:"—"}})].join()) === "two,solo,multi,");

// --- contra motorului ---
await page.click("#table-btn");
await page.waitForSelector("dialog.c1a-dlg[open]");
await page.locator(".c1a-tab", {hasText: "Against the engine"}).click();
await page.waitForTimeout(300);
const PANE = ".c1a-pane:not([hidden])";
check("tab «Against the engine» afișat", await page.locator(`${PANE} h3`).innerText() === "Play against the local engine");
check("selector de nivel cu 4 niveluri (începător…avansat)", await page.locator(`${PANE} select`).first().locator("option").count() === 4);
await page.locator(`${PANE} select`).first().selectOption("1");
await page.locator(`${PANE} select`).nth(1).selectOption("-1"); // omul joacă negru → motorul mută primul
await page.locator(`${PANE} button`, {hasText: "Start the game"}).click();
await page.waitForFunction(() => window.__sah8.vs().G && window.__sah8.vs().G.game.moves.length >= 1, null, {timeout: 20000});
const v1 = await page.evaluate(() => { const V = window.__sah8.vs(); return {lvl: V.level, human: V.human, n: V.G.game.moves.length, turn: V.G.game.pos.turn}; });
check("nivelul 1 și culoarea neagră sunt respectate; motorul (alb) a mutat primul", v1.lvl === 1 && v1.human === -1 && v1.n === 1 && v1.turn === -1, v1);
// omul mută e7e5 cu API-ul vizual: folosim câmpul de comandă
await page.fill(`${PANE} .sh-cmd input`, "e5"); await page.press(`${PANE} .sh-cmd input`, "Enter");
await page.waitForFunction(() => window.__sah8.vs().G.game.moves.length >= 3, null, {timeout: 20000});
check("după mutarea omului, motorul răspunde", await page.evaluate(() => window.__sah8.vs().G.game.moves.length) >= 3);
// anulare
await page.locator(`${PANE} button`, {hasText: "Take back the last move"}).click();
await page.waitForTimeout(300);
const afterTake = await page.evaluate(() => window.__sah8.vs().G.game.moves.length);
check("anularea scoate mutarea omului și răspunsul motorului (rămâne mutarea 1 a albului)", afterTake === 1, afterTake);
// PGN dus-întors
await page.fill(`${PANE} .sh-cmd input`, "e5"); await page.press(`${PANE} .sh-cmd input`, "Enter");
await page.waitForFunction(() => window.__sah8.vs().G.game.moves.length >= 3 && !window.__sah8.vs().busy, null, {timeout: 20000});
const rt = await page.evaluate(() => { const A = window.__sah8, G = A.vs().G, pgn = A.pgnOf(G, {White: "x", Black: "y"}), r = A.gameFromPGN(pgn); return {orig: A.uciList(G).join(" "), back: r.G ? A.uciList(r.G).join(" ") : r.err, san: G.game.moves.map(m => m.san).join(" "), pgn}; });
check("PGN exportat se reimportă identic (mutări UCI)", rt.orig === rt.back, rt);
check("PGN conține etichetele White/Black și mutările SAN", /\[White "x"\]/.test(rt.pgn) && rt.pgn.includes("1. " + rt.san.split(" ")[0]), rt.pgn);
// partidă nouă + reluare din PGN
await page.locator(`${PANE} button`, {hasText: "New game"}).click();
await page.waitForTimeout(200);
await page.locator(`${PANE} select`).first().selectOption("0");
await page.locator(`${PANE} select`).nth(1).selectOption("1");
await page.locator(`${PANE} textarea`).fill("1. e4 e5 2. Nf3");
await page.locator(`${PANE} button`, {hasText: "Start the game"}).click();
await page.waitForFunction(() => window.__sah8.vs().G && window.__sah8.vs().G.game.moves.length >= 4, null, {timeout: 20000});
check("reluare din PGN: 3 semi-mutări importate + răspunsul motorului (nivel începător)", await page.evaluate(() => window.__sah8.vs().G.game.moves.slice(0, 3).map(m => m.san).join(" ")) === "e4 e5 Nf3");
await page.locator(`${PANE} button`, {hasText: "New game"}).click();
await page.locator(`${PANE} textarea`).fill("1. e4 e5 2. Ke3");
await page.locator(`${PANE} button`, {hasText: "Start the game"}).click();
await page.waitForTimeout(200);
check("PGN cu mutare ilegală: respins cu mesaj, fără partidă", /rejected/.test(await page.locator(`${PANE} .c1a-msg`).innerText()) && await page.evaluate(() => window.__sah8.vs().G) === null);
// abandon
await page.locator(`${PANE} textarea`).fill("");
await page.locator(`${PANE} button`, {hasText: "Start the game"}).click();
await page.waitForTimeout(300);
await page.locator(`${PANE} button`, {hasText: "Resign"}).click();
await page.waitForTimeout(200);
check("abandon: partida e încheiată", await page.evaluate(() => window.__sah8.outcome(window.__sah8.vs().G).over));
check("fără erori de pagină și fără rețea", st.errs.length === 0 && st.net.length === 0, [st.errs, st.net]);
summary();
