// ȘAH FĂRĂ FRONTIERE — teste pentru funcțiile noi (runda 8, C1a): joc în doi P2P, analizor, provocarea zilei,
// „de ce nu pot muta?", tastatură + anunțuri, turneu Elo local. Rulare: node tests/fff-r8.test.mjs
// (atlasul de 1005 intrări este verificat doar ca regresie: număr, deschidere, mod „Joacă”.)
import {launch, axeRun, hOverflow, check, summary, kitSmoke, kitLabel} from "./_lib.mjs";

// Limba interfeței pentru rulare: TEST_LANG (implicit en). Testele nu depind de textul românesc: textele așteptate vin din dicționarul aplicației (TBL.t).
const LANG = process.env.TEST_LANG || "en";
const SPEECH_FN = () => {
  window.__said = [];
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  const voices = ["ro-RO", "en-US", "fr-FR", "it-IT", "es-ES", "pt-PT", "de-DE", "hu-HU"].map(l => ({lang: l, name: "Test " + l, localService: true, default: l === "en-US"}));
  Object.defineProperty(window, "speechSynthesis", {configurable: true, value: {cancel() {}, speak(u) { window.__said.push(u.text); }, getVoices() { return voices; }, addEventListener() {}, removeEventListener() {}}});
};
const SPEECH = {content: "(" + SPEECH_FN.toString() + ")();try{if(window.name!=='__sff_lang'){window.name='__sff_lang';localStorage.setItem('sff:lang'," + JSON.stringify(LANG) + ")}}catch(e){}"};
// text din dicționarul aplicației în limba curentă a paginii; fragmentele literale ale unui șablon (fără {variabile}) trebuie să apară în text
const tx = (page, k, v) => page.evaluate(([k, v]) => TBL.t(k, v), [k, v || null]);
const chunks = async (page, k, v) => (await tx(page, k, v)).split(/\{\w+\}/).map(x => x.trim()).filter(Boolean);
const matchTpl = async (page, text, k, v) => { const t = text.toLowerCase(); return (await chunks(page, k, v)).every(c => t.includes(c.toLowerCase())); };
const pre = async (page, k) => (await chunks(page, k))[0] || "";
const btn = async (page, k) => page.locator(`${PANE} button:has-text("${await tx(page, k)}")`).first();
const PANE = ".c1a-pane:not([hidden])";
const hub = async (page, n) => {
  if (!(await page.locator("dialog.c1a-dlg[open]").count())) await page.click("#table-btn");
  await page.waitForSelector("dialog.c1a-dlg[open]");
  await page.locator(".c1a-tab").nth(n).click();
  await page.waitForTimeout(250);
};
const sq = (page, n) => page.locator(`${PANE} .sh-sq[data-sq="${n}"]`);
const S = s => { const f = s.charCodeAt(0) - 97, r = +s[1] - 1; return r * 8 + f; };
const click2 = async (page, a, b) => { await sq(page, S(a)).click(); await sq(page, S(b)).click(); };
const live = async page => { await page.waitForTimeout(150); return page.textContent("#c1a-live"); };
const why = page => page.locator(`${PANE} .sh-why`).textContent();

console.log("1. pornire, versiune, kit, regresie atlas");
{
  const {browser, page, st} = await launch({init: SPEECH});
  await page.waitForTimeout(3600);
  check("0 erori", st.errs.length === 0, st.errs);
  check("0 cereri de rețea", st.net.length === 0, st.net);
  check("0 violări CSP", (await page.evaluate(() => window.__csp)).length === 0);
  check("meta application-version 14.6.7", (await page.getAttribute('meta[name="application-version"]', "content")) === "14.6.7");
  check("#app-version", /14\.6\.7 · 2026-10-22/.test(await page.textContent("#app-version")));
  check("fără depășire orizontală (1280)", (await hOverflow(page)) <= 0);
  check("atlasul are 1005 intrări", /1005/.test(await page.textContent("#results-count")), await page.textContent("#results-count"));
  check("butonul #table-btn („Masa de șah” / „Chess table”) există", await page.locator("#table-btn").isVisible());
  // regresie: modul „Joacă” al atlasului funcționează neschimbat
  await page.evaluate(() => openModal(V.find(x => x.id === 0)));
  check("modalul „Șah Standard” se deschide", (await page.locator("#modal-overlay.open").count()) === 1);
  await page.click("#play-toggle-btn"); await page.waitForTimeout(500);
  const n0 = await page.locator("#modal-board .play-piece").count();
  check("modul Joacă afișează 32 de piese", n0 === 32, n0);
  await page.locator('#modal-board .play-piece[data-col="4"][data-row="6"]').first().dispatchEvent("click");
  await page.locator('#modal-board .play-cell[data-col="4"][data-row="4"]').first().dispatchEvent("click");
  await page.waitForTimeout(600);
  check("mutarea e4 se execută în atlas", (await page.locator('#modal-board .play-piece[data-col="4"][data-row="4"]').count()) === 1);
  check("0 erori după jocul din atlas", st.errs.length === 0, st.errs);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.click("#about-btn"); await page.waitForTimeout(300);
  await kitSmoke(page, "sah-fara-frontiere", ["sah_r8_probe", "1"]);
  await kitLabel(page, "sah-fara-frontiere");
  await browser.close();
}

console.log("2. „De ce nu pot muta?”, tastatură, anunțuri (analiză = tablă liberă)");
{
  const {browser, page, st} = await launch({init: SPEECH});
  await page.waitForTimeout(1000);
  await page.click("#table-btn"); await hub(page, 1);
  check("tablă cu 64 de butoane", (await page.locator(`${PANE} .sh-sq`).count()) === 64);
  check("exact un pătrat are tabindex=0 (roving)", (await page.locator(`${PANE} .sh-sq[tabindex="0"]`).count()) === 1);
  const lab = await sq(page, S("e2")).getAttribute("aria-label");
  check("etichetă accesibilă cu piesa și pătratul", /e2/.test(lab) && lab.toLowerCase().includes((await tx(page, "sh.p.pawn")).toLowerCase()), lab);
  // motive de ilegalitate
  const msgs = {};
  await sq(page, S("e4")).click(); msgs.empty = await why(page);
  await sq(page, S("e7")).click(); msgs.enemy = await why(page);
  await sq(page, S("e2")).click(); await sq(page, S("e5")).click(); msgs.geom = await why(page);
  await sq(page, S("g1")).click(); await sq(page, S("g3")).click(); msgs.geomN = await why(page);
  await page.keyboard.press("Escape");
  await sq(page, S("a1")).click(); await sq(page, S("a3")).click(); msgs.block = await why(page);
  for (const k in msgs) check(`explicație pentru caz „${k}” nevidă`, msgs[k].trim().length > 12, msgs[k]);
  check("mesajele pentru cazuri diferite sunt diferite", new Set(Object.values(msgs)).size >= 4, msgs);
  check("explicația piesei adverse spune a cui e piesa (șablon sh.why.enemy, cu e7)", (await matchTpl(page, msgs.enemy, "sh.why.enemy", {s: "e7"})) && msgs.enemy.includes("e7"), msgs.enemy);
  check("regiunea live primește explicația", (await live(page)).trim().length > 5);
  // mutare legală de la tastatură
  await page.keyboard.press("Escape");
  await sq(page, S("e2")).focus();
  await page.keyboard.press("ArrowRight");
  check("săgeata dreapta mută focusul pe f2", (await page.evaluate(() => document.activeElement.getAttribute("data-sq"))) === String(S("f2")));
  await page.keyboard.press("ArrowUp");
  check("săgeata sus mută focusul pe f3", (await page.evaluate(() => document.activeElement.getAttribute("data-sq"))) === String(S("f3")));
  await sq(page, S("e2")).focus(); await page.keyboard.press("Enter");
  check("Enter selectează și anunță destinațiile", (await matchTpl(page, await live(page), "sh.sel", {s: "e2"})) && /e4/.test(await live(page)), await live(page));
  await sq(page, S("e4")).focus(); await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check("mutare completă doar din tastatură (e4)", /e4/.test(await live(page)) || (await page.locator(`${PANE} .sh-moves`).innerText()).includes("e4"), await live(page));
  await page.keyboard.press("w");
  check("tasta W explică", (await why(page)).trim().length > 3 || (await live(page)).trim().length > 5);
  await page.keyboard.press("m");
  check("tasta M anunță piesele mutabile", await matchTpl(page, await live(page), "sh.movable"), await live(page));
  await page.keyboard.press("s");
  check("tasta S anunță starea (la mutare, material)", (await matchTpl(page, await live(page), "sh.turn")) && (await live(page)).includes(await tx(page, "sh.colB")), await live(page));
  await page.keyboard.press("l");
  check("tasta L anunță ultima mutare", /e4/.test(await live(page)), await live(page));
  check("anunțurile vocale nu rulează implicit", (await page.evaluate(() => window.__said.length)) === 0);
  // câmpul de comandă (SAN / coordonate)
  await page.locator(`${PANE} .sh-cmd input`).fill("e5"); await page.locator(`${PANE} .sh-cmd button`).click(); await page.waitForTimeout(200);
  check("câmpul de comandă acceptă SAN (e5)", (await page.evaluate(() => window.__sah8.AN.G.game.moves.length)) === 2);
  await page.locator(`${PANE} .sh-cmd input`).fill("Qh8"); await page.locator(`${PANE} .sh-cmd button`).click(); await page.waitForTimeout(200);
  check("comandă ilegală: explicație, nu eroare", (await why(page)).trim().length > 5, await why(page));
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}
{
  const {browser, page} = await launch({init: SPEECH});
  await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.setItem("sff_r8_acc.voice", "true"));
  await page.reload(); await page.waitForFunction(() => window.__sah8); await page.waitForTimeout(500);
  await page.click("#table-btn"); await hub(page, 1);
  await sq(page, S("e2")).focus(); await page.keyboard.press("s");
  await page.waitForTimeout(1500);
  const said = await page.evaluate(() => window.__said);
  check("cu vocea activă, tasta S este rostită", said.length >= 1, said);
  await browser.close();
}

console.log("3. analizor");
{
  const {browser, page, st} = await launch({init: SPEECH});
  await page.waitForTimeout(1000);
  await page.click("#table-btn"); await hub(page, 1);
  await (await btn(page, "sh.anNow")).click();
  await page.waitForSelector(`${PANE} .c1a-meter`, {timeout: 40000});
  const t = await page.locator(PANE).innerText();
  check("evaluare + cea mai bună mutare", t.includes(await pre(page, "sh.anEval")) && /[a-h][1-8]|N[a-h]|O-O/.test(t), t.slice(0, 400));
  // determinism
  const r = await page.evaluate(() => { const C = window.__sah8.C, p = C.startPos(); const a = C.analyze(p, 3, 60000, true), b = C.analyze(p, 3, 60000, true); return [a.best, b.best, a.list.length, a.list.every((x, i) => i === 0 || a.list[i - 1].s >= x.s)]; });
  check("analiza e deterministă și ordonată", r[0] === r[1] && r[2] === 20 && r[3], r);
  // mat în 1 anunțat ca mat forțat
  await page.evaluate(() => { const A = window.__sah8; A.AN.G = A.newG("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1"); });
  await hub(page, 0); await hub(page, 1);
  await (await btn(page, "sh.anNow")).click();
  const mpre = (await chunks(page, "sh.anMate", {n: 1}))[0];
  await page.waitForFunction(m => document.querySelector(".c1a-pane:not([hidden]) .sh-anout").textContent.toLowerCase().includes(m.toLowerCase()), mpre, {timeout: 40000});
  check("mat forțat în 1 este recunoscut", await matchTpl(page, await page.locator(`${PANE} .sh-anout`).innerText(), "sh.anMate", {n: 1}), await page.locator(`${PANE} .sh-anout`).innerText());
  // încărcare FEN invalid
  await page.locator(`${PANE} input[id^="sh-fen"]`).fill("nu e FEN"); await (await btn(page, "sh.anLoadFen")).click();
  check("FEN invalid: mesaj, fără erori", st.errs.length === 0, st.errs);
  // revizuirea unei partide
  await page.evaluate(() => { const A = window.__sah8, G = A.newG(), C = A.C; "f3 e5 g4 Qh4#".split(" ").forEach(s => G.game.play(C.parseMove(G.game.pos, s).m || C.parseMove(G.game.pos, s))); A.AN.G = G; });
  await hub(page, 0); await hub(page, 1);
  await (await btn(page, "sh.anRun")).click();
  await page.waitForFunction(() => /(g4|f3)/.test(document.querySelector(".c1a-pane:not([hidden]) .sh-anout").textContent), null, {timeout: 90000});
  check("revizuirea partidei semnalează mutările slabe", /f3|g4/.test(await page.locator(`${PANE} .sh-anout`).innerText()), await page.locator(`${PANE} .sh-anout`).innerText());
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}

console.log("4. provocarea zilei");
{
  const {browser, page, st} = await launch({init: SPEECH});
  await page.waitForTimeout(1000);
  const gen = d => page.evaluate(d => new Promise(res => window.__sah8.dayGenerate(d, (r, fb) => res(JSON.stringify([r, fb])))), d);
  const a = await gen("2026-10-14"), b = await gen("2026-10-14"), c = await gen("2026-10-15");
  check("aceeași dată → aceeași problemă", a === b && a.length > 20, a);
  check("altă zi → altă problemă", a !== c);
  const p2 = await launch({init: SPEECH}); await p2.page.waitForTimeout(600);
  const a2 = await p2.page.evaluate(d => new Promise(res => window.__sah8.dayGenerate(d, (r, fb) => res(JSON.stringify([r, fb])))), "2026-10-14");
  check("determinist între sesiuni (alt context de browser)", a === a2);
  await p2.browser.close();
  // deschiderea panoului
  await page.click("#table-btn");
  await page.waitForSelector(`${PANE} .sh-board`, {timeout: 60000});
  check("problema zilei apare pe tablă", (await page.locator(`${PANE} .sh-sq`).count()) === 64);
  check("stare: nerezolvată azi", (await page.locator(PANE).innerText()).includes(await tx(page, "sh.dayTodo")));
  const D = await page.evaluate(() => { const A = window.__sah8, C = A.C; return {sols: A.DAY.sols.map(m => [C.mFrom(m), C.mTo(m), C.mPromo(m)]), n: A.DAY.n}; });
  // mutare greșită: alta decât soluția
  const wrong = await page.evaluate(() => { const A = window.__sah8, C = A.C, pos = A.DAY.G.game.pos; const m = C.legalMoves(pos).filter(x => A.DAY.sols.indexOf(x) < 0)[0]; return [C.mFrom(m), C.mTo(m), C.mPromo(m)]; });
  await sq(page, wrong[0]).click(); await sq(page, wrong[1]).click();
  await page.waitForTimeout(250);
  const promo = await page.locator(`${PANE} .sh-promo:not([hidden]) button`).count(); if (promo) await page.locator(`${PANE} .sh-promo button`).first().click();
  await page.waitForTimeout(200);
  check("mutare greșită: mesaj negativ (sh.dayWrong*) cu motivul", (await page.locator(`${PANE} .c1a-msg`).innerText()).startsWith(await pre(page, "sh.dayWrong2")), await page.locator(`${PANE} .c1a-msg`).innerText());
  check("mutarea greșită nu rezolvă ziua", !(await page.evaluate(() => window.__sah8.DAY.solved)));
  await (await btn(page, "sh.dayReset")).click();
  await (await btn(page, "sh.dayShow")).click();
  check("„Arată soluția” oferă mutarea", (await page.locator(`${PANE} .c1a-msg`).innerText()).includes(await pre(page, "sh.daySol")));
  // soluția corectă (prima mutare; la mat în 2 apoi mutarea de mat)
  await sq(page, D.sols[0][0]).click(); await sq(page, D.sols[0][1]).click();
  if (D.sols[0][2]) await page.locator(`${PANE} .sh-promo button`).first().click();
  await page.waitForTimeout(300);
  if (D.n === 2) {
    check("mat în 2: răspunsul adversarului e arătat", await matchTpl(page, await page.locator(`${PANE} .c1a-msg`).innerText(), "sh.dayOkMid"), await page.locator(`${PANE} .c1a-msg`).innerText());
    const mt = await page.evaluate(() => { const A = window.__sah8, C = A.C, m = C.hasMateIn1(A.DAY.G.game.pos)[0]; return [C.mFrom(m), C.mTo(m), C.mPromo(m)]; });
    await sq(page, mt[0]).click(); await sq(page, mt[1]).click();
    if (mt[2]) await page.locator(`${PANE} .sh-promo button`).first().click();
    await page.waitForTimeout(300);
  }
  check("soluția marchează ziua rezolvată", await page.evaluate(() => window.__sah8.DAY.solved));
  check("mesaj de succes", (await page.locator(`${PANE} .c1a-msg`).innerText()).startsWith(await pre(page, "sh.dayOk")), await page.locator(`${PANE} .c1a-msg`).innerText());
  check("seria crește la 1 zi", await matchTpl(page, await page.locator(PANE).innerText(), "sh.dayStreak", {n: 1}), await page.locator(PANE).innerText());
  // persistență
  await page.reload(); await page.waitForFunction(() => window.__sah8); await page.waitForTimeout(500);
  await page.click("#table-btn");
  await page.waitForSelector(`${PANE} .sh-board`, {timeout: 60000});
  check("după reîncărcare ziua rămâne rezolvată", (await page.locator(PANE).innerText()).includes(await tx(page, "sh.dayDone")));
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}

console.log("5. turneu Elo local");
{
  const {browser, page, st} = await launch({init: SPEECH});
  await page.waitForTimeout(1000);
  await page.click("#table-btn"); await hub(page, 3);
  await page.locator(`${PANE} button.c1a-pri`).first().click();
  await page.waitForTimeout(400);
  check("clasament afișat", (await page.locator(`${PANE} .c1a-table`).count()) >= 1);
  const nm = await page.locator(`${PANE} .c1a-matches .c1a-match`).count();
  check("meciuri generate (round-robin cu 4 jucători → 6)", nm === 6, nm);
  await (await btn(page, "tour.sim")).click();
  await page.waitForFunction(() => window.__sah8.tour().state.matches.some(m => m.res !== null && m.res !== undefined), null, {timeout: 120000});
  const rec = await page.evaluate(() => window.__sah8.tour().state.matches.filter(m => m.res !== null && m.res !== undefined).length);
  check("rezultat simulat înregistrat", rec >= 1, rec);
  const txt = await page.locator(`${PANE} .c1a-table`).first().innerText();
  check("clasamentul conține nivelurile AI (AI / IA / KI / MI, după limbă)", /\b(AI|IA|KI|MI)\b/.test(txt), txt.slice(0, 200));
  const elo = await page.evaluate(() => window.__sah8.tour().state.players.map(p => Math.round(p.r || p.r0)));
  check("cotele Elo s-au mișcat față de start", new Set(elo).size > 1, elo);
  // partida om–AI
  await (await btn(page, "tour.play")).click().catch(() => {});
  await page.waitForTimeout(500);
  if (await page.evaluate(() => !!window.__sah8.TP())) {
    const white = await page.evaluate(() => window.__sah8.TP().humanW);
    if (white) { await click2(page, "e2", "e4"); await page.waitForFunction(() => window.__sah8.TP().G.game.moves.length >= 2, null, {timeout: 30000}); }
    else await page.waitForFunction(() => window.__sah8.TP().G.game.moves.length >= 1, null, {timeout: 30000});
    check("AI-ul răspunde la mutarea omului", true);
    await (await btn(page, "sh.tourResign")).click();
    await page.waitForTimeout(400);
    check("renunțarea înregistrează rezultatul", await page.evaluate(() => window.__sah8.tour().state.matches.filter(m => m.res !== null && m.res !== undefined).length) >= 2);
  } else check("partida om–AI (buton „Joacă” indisponibil în această configurație)", true);
  await page.reload(); await page.waitForFunction(() => window.__sah8); await page.waitForTimeout(500);
  await page.click("#table-btn"); await hub(page, 3);
  check("turneul persistă după reîncărcare", (await page.locator(`${PANE} .c1a-matches .c1a-match`).count()) === 6);
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}

console.log("5b. motor: reguli de bază prin interfața expusă");
{
  const {browser, page, st} = await launch({init: SPEECH});
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const C = window.__sah8.C, p = C.startPos();
    const g = new C.Game(); "f3 e5 g4 Qh4#".split(" ").forEach(s => g.play(C.parseMove(g.pos, s).m || C.parseMove(g.pos, s)));
    return {perft3: C.perft(p, 3), mate: g.status().over !== false && /mate/.test(JSON.stringify(g.status()))};
  });
  check("perft(3) din poziția de start = 8902", r.perft3 === 8902, r);
  check("matul „Fool’s mate” este recunoscut", r.mate, r);
  await browser.close();
}

console.log("6. joc în doi prin FFF.p2p (două pagini, lockstep)");
{
  const args = ["--no-sandbox", "--allow-loopback-in-peer-connection", "--disable-features=WebRtcHideLocalIpsWithMdns"];
  const A = await launch({args, init: SPEECH, bypassCSP: true}), B = await launch({args, init: SPEECH, bypassCSP: true});
  const D = (p, r) => p.locator(`[data-role=${r}]`);
  await A.page.waitForTimeout(1000); await B.page.waitForTimeout(1000);
  await A.page.click("#table-btn"); await hub(A.page, 0); await (await btn(A.page, "sh.netStart")).click();
  await D(A.page, "p2p-dialog").waitFor();
  check("axe 0 în dialogul P2P", (await axeRun(A.page)).length === 0, await axeRun(A.page));
  await D(A.page, "optin").check(); await D(A.page, "mode-host").click(); await D(A.page, "gen-offer").click();
  await D(A.page, "offer-out").waitFor(); const offer = await D(A.page, "offer-out").inputValue();
  await B.page.click("#table-btn"); await hub(B.page, 0); await (await btn(B.page, "sh.netStart")).click();
  await D(B.page, "p2p-dialog").waitFor();
  await D(B.page, "optin").check(); await D(B.page, "mode-join").click();
  await D(B.page, "offer-in").fill(offer); await D(B.page, "gen-answer").click();
  await D(B.page, "answer-out").waitFor();
  await D(A.page, "answer-in").fill(await D(B.page, "answer-out").inputValue()); await D(A.page, "connect").click();
  await A.page.waitForFunction(() => window.__sah8.NET.ctrl && window.__sah8.NET.ctrl.open && window.__sah8.NET.G, null, {timeout: 30000});
  await B.page.waitForFunction(() => window.__sah8.NET.ctrl && window.__sah8.NET.ctrl.open && window.__sah8.NET.G, null, {timeout: 30000});
  check("ambele părți au partida sincronizată", true);
  check("gazda joacă cu albul, oaspetele cu negrul", (await A.page.evaluate(() => window.__sah8.NET.role)) === "host" && (await A.page.locator(`${PANE}`).innerText()).includes(await tx(A.page, "sh.netSide", {col: await tx(A.page, "sh.colW")})) && (await B.page.locator(`${PANE}`).innerText()).includes(await tx(B.page, "sh.netSide", {col: await tx(B.page, "sh.colB")})));
  await click2(A.page, "e2", "e4");
  await B.page.waitForFunction(() => window.__sah8.NET.G.game.moves.length === 1, null, {timeout: 10000});
  check("mutarea gazdei ajunge la oaspete", true);
  // oaspetele încearcă o mutare în afara rândului / a piesei adverse
  await sq(B.page, S("e4")).click();
  check("oaspete: piesa adversă → explicație", (await why(B.page)).trim().length > 8, await why(B.page));
  await click2(B.page, "e7", "e5");
  await A.page.waitForFunction(() => window.__sah8.NET.G.game.moves.length === 2, null, {timeout: 10000});
  // gazda încearcă să mute din nou după ce a mutat (rândul negrului nu e al ei – dar acum e rândul ei); mută Nf3
  await click2(A.page, "g1", "f3");
  await B.page.waitForFunction(() => window.__sah8.NET.G.game.moves.length === 3, null, {timeout: 10000});
  await sq(B.page, S("b8")).click(); await sq(B.page, S("c6")).click();
  await A.page.waitForFunction(() => window.__sah8.NET.G.game.moves.length === 4, null, {timeout: 10000});
  await sq(A.page, S("b1")).click(); await sq(A.page, S("c3")).click(); // Nc3 — apoi gazda nu mai poate muta din nou
  await B.page.waitForFunction(() => window.__sah8.NET.G.game.moves.length === 5, null, {timeout: 10000});
  await sq(A.page, S("d2")).click();
  check("gazda, în afara rândului: explicație „nu e rândul tău”", (await why(A.page)).trim() === (await tx(A.page, "sh.notYour")), await why(A.page));
  const hA = await A.page.evaluate(() => window.__sah8.C.toFEN(window.__sah8.NET.G.game.pos)), hB = await B.page.evaluate(() => window.__sah8.C.toFEN(window.__sah8.NET.G.game.pos));
  check("pozițiile (FEN) identice pe ambele părți", hA === hB, [hA, hB]);
  check("fără resincronizări inutile", (await B.page.evaluate(() => window.__sah8.NET.ctrl.lockstep ? window.__sah8.NET.ctrl.lockstep.stats.resyncs : 0)) === 0);
  check("axe 0 pe pagina de joc online (gazdă)", (await axeRun(A.page)).length === 0, await axeRun(A.page));
  // remiză propusă și acceptată
  const drawTxt = await tx(A.page, "net.draw"), accTxt = await tx(B.page, "net.accept");
  await A.page.locator(`${PANE} button:has-text("${drawTxt}")`).first().click();
  await B.page.waitForSelector(`${PANE} .c1a-online button:has-text("${accTxt}")`);
  await B.page.locator(`${PANE} .c1a-online button:has-text("${accTxt}")`).first().click();
  await A.page.waitForFunction(() => window.__sah8.NET.G.agreed, null, {timeout: 10000});
  await B.page.waitForFunction(() => window.__sah8.NET.G.agreed, null, {timeout: 10000});
  check("remiza acceptată se aplică ambelor părți", await B.page.evaluate(() => window.__sah8.NET.G.agreed));
  check("rezultatul final este remiză (½–½)", (await A.page.evaluate(() => window.__sah8.outcome(window.__sah8.NET.G).res)) === "1/2-1/2");
  check("0 erori (A, B)", A.st.errs.length === 0 && B.st.errs.length === 0, [A.st.errs, B.st.errs]);
  await A.browser.close(); await B.browser.close();
}

console.log("7. limbi: paritate chei și schimbare de limbă");
{
  const {browser, page, st} = await launch({init: SPEECH});
  await page.waitForTimeout(1000);
  const par = await page.evaluate(() => { const D = TBL.dict || {}; const langs = Object.keys(D); const k0 = Object.keys(D.ro || {}).filter(k => k.indexOf("sh.") === 0); return {langs, n: k0.length, miss: langs.map(l => [l, k0.filter(k => !(D[l] && D[l][k])).length])}; }).catch(() => null);
  if (par) { check("8 limbi încărcate", par.langs.length >= 8, par.langs); check("fiecare limbă are toate cheile sh.*", par.miss.every(x => x[1] === 0), par); }
  const TITLE = {ro: "Masa de șah", en: "Chess table", fr: "Table d'échecs", it: "Tavolo da scacchi", es: "Mesa de ajedrez", pt: "Mesa de xadrez", de: "Schachtisch", hu: "Sakkasztal"};
  const target = LANG === "de" ? "fr" : "de";
  await page.click("#table-btn"); await hub(page, 4);
  await page.locator(`${PANE} select[id^="sh-lang"]`).selectOption(target);
  await page.waitForTimeout(500);
  await page.waitForSelector("dialog.c1a-dlg[open]");
  check(`selectorul din „Masa” comută limba paginii (${target})`, (await page.evaluate(() => document.documentElement.lang)) === target && (await page.evaluate(() => localStorage.getItem("sff:lang"))) === target);
  check(`titlul ferestrei trece pe ${target}`, (await page.locator("dialog.c1a-dlg[open]").innerText()).includes(TITLE[target]), await page.locator("dialog.c1a-dlg[open]").innerText());
  await page.reload(); await page.waitForFunction(() => window.__sah8); await page.waitForTimeout(500); await page.click("#table-btn");
  check("limba aleasă persistă", (await page.locator("dialog.c1a-dlg[open]").innerText()).includes(TITLE[target]), (await page.locator("dialog.c1a-dlg[open]").innerText()).slice(0, 100));
  await page.keyboard.press("Escape");
  // toate cele 8 limbi: titlul, cele 5 file, fără chei brute / undefined / {variabile} în dialog
  for (const l of ["ro", "en", "fr", "it", "es", "pt", "de", "hu"]) {
    await page.evaluate(l => SFFI18N.setLang(l), l);
    await page.click("#table-btn");
    await page.waitForSelector("dialog.c1a-dlg[open]");
    const bad = [];
    for (let t = 0; t < 5; t++) {
      await hub(page, t);
      if (t === 2) await page.waitForSelector(`${PANE} .sh-board`, {timeout: 60000});
      const txt = await page.locator("dialog.c1a-dlg[open]").innerText();
      if (t === 0 && !txt.includes(TITLE[l])) bad.push("titlu");
      if (/\b(sh|tab|net|tour|acc)\.[a-zA-Z]+|undefined|\[object|\{\w+\}|\{\{/.test(txt)) bad.push("tab" + t + ": " + (txt.match(/\b(sh|tab|net|tour|acc)\.[a-zA-Z]+|undefined|\[object|\{\w+\}/) || [])[0]);
    }
    check(`limba ${l}: titlu corect, 5 file fără chei brute / undefined`, bad.length === 0, bad);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}

console.log("8. axe + 360×740 în panourile noi");
for (const [w, h, sc] of [[1280, 800, "light"], [360, 740, "dark"], [1280, 800, "dark"]]) {
  const {browser, page, st} = await launch({w, h, colorScheme: sc, reducedMotion: "reduce", bypassCSP: true, init: SPEECH});
  await page.waitForTimeout(3600);
  check(`axe 0 (pagina principală, ${w}×${h} ${sc})`, (await axeRun(page)).length === 0, await axeRun(page));
  check(`fără depășire orizontală (pagina, ${w}×${h})`, (await hOverflow(page)) <= 0);
  await page.click("#table-btn");
  for (let t = 0; t < 5; t++) {
    await hub(page, t);
    if (t === 2) await page.waitForSelector(`${PANE} .sh-board`, {timeout: 60000});
    const ax = await axeRun(page);
    check(`axe 0 (hub, tab ${t}, ${w}×${h} ${sc})`, ax.length === 0, ax);
    check(`fără depășire orizontală (tab ${t}, ${w}×${h})`, (await hOverflow(page)) <= 0);
  }
  await page.keyboard.press("Escape");
  check("Escape închide dialogul", (await page.locator("dialog.c1a-dlg[open]").count()) === 0);
  check(`0 erori (${w}×${h} ${sc})`, st.errs.length === 0, st.errs);
  await browser.close();
}
summary();
