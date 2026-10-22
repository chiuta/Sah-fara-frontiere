// Șah fără frontiere — virtualizarea listei (carduri hidratate la cerere) și pachetele de limbă la cerere (14.6.11).
// Rulare: node tests/lazy.test.mjs   (rețea blocată în afară de serverul local)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {chromium, HERE, check, summary} from "./_lib.mjs";
const ROOT = path.resolve(HERE, "..");
const MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json"};
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, {"content-type": MIME[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(r);
});
await new Promise(res => srv.listen(0, "127.0.0.1", res));
const BASE = "http://127.0.0.1:" + srv.address().port + "/";
const browser = await chromium.launch({executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"]});
const errs = [];
async function mk(o = {}) {
  const ctx = await browser.newContext({viewport: {width: o.w || 1366, height: o.h || 850}, locale: o.locale || "en-US", hasTouch: !!o.touch, isMobile: !!o.touch});
  await ctx.addInitScript(l => { try { if (l) localStorage.setItem("sah-fara-frontiere.lang", l); localStorage.setItem("sah-fara-frontiere.welcomeSeen", "1"); } catch (e) {} }, o.ul || null);
  const page = await ctx.newPage(); page.reqs = [];
  page.on("request", r => { if (r.resourceType() !== "fetch") page.reqs.push(r.url().replace(BASE, "")); }); /* prefetch-ul de fundal folosește fetch() */
  page.on("pageerror", e => errs.push(e.message));
  if (o.pre) await o.pre(ctx, page);
  await page.goto(BASE + (o.hash || "")); await page.waitForTimeout(o.wait || 3000);
  return {ctx, page};
}
const hyd = page => page.evaluate(() => ({cards: document.querySelectorAll("#grid .card").length, hyd: [...document.querySelectorAll("#grid .card")].filter(c => c.__h).length, nodes: document.querySelectorAll("*").length}));
console.log("Șah — virtualizare și pachete la cerere");
const sz = fs.statSync(ROOT + "/index.html").size;
console.log("  index.html: " + (sz / 1e6).toFixed(2) + " MB");
check("index.html < 4 MB", sz < 4e6);
{
  const {ctx, page} = await mk({ul: "ro"});
  const a = await hyd(page);
  check("1005 carduri în grilă, puține hidratate la start", a.cards === 1005 && a.hyd > 0 && a.hyd < 150, a);
  check("noduri DOM < 4000 la start (înainte ≈ 22 500)", a.nodes < 4000, a);
  check("ro: nu se cere niciun pachet de limbă", !page.reqs.some(u => u.startsWith("i18n/")), page.reqs.filter(u => /i18n/.test(u)));
  // scroll la final: carduri noi se hidratează, cele vechi se eliberează
  await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: "instant"})); await page.waitForTimeout(1500);
  const b = await hyd(page);
  check("la finalul listei: tot < 200 hidratate", b.hyd > 0 && b.hyd < 200 && b.nodes < 6000, b);
  const last = await page.evaluate(() => { const cs = [...document.querySelectorAll("#grid .card:not(.hidden)")].filter(c => { const r = c.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight - 50; }); const c = cs[cs.length - 1]; return c ? {h: !!c.__h, t: c.querySelector(".card-title") && c.querySelector(".card-title").textContent} : null; });
  check("cardurile din fereastră au conținut", last && last.h && last.t, last);
  const first = await page.evaluate(() => { const c = document.querySelector("#grid .card"); return {h: !!c.__h, lazy: c.getAttribute("data-lazy"), label: c.getAttribute("aria-label")}; });
  check("primul card eliberat, dar păstrează aria-label și tabindex", !first.h && first.lazy === "1" && /#0/.test(first.label), first);
  await page.evaluate(() => window.scrollTo({top: 0, behavior: "instant"})); await page.waitForTimeout(1200);
  check("la revenire, primul card se hidratează", await page.evaluate(() => !!document.querySelector("#grid .card").__h));
  // filtrare + căutare cu evidențiere
  await page.fill("#search-input", "shogi"); await page.waitForTimeout(1500);
  const f = await page.evaluate(() => ({n: document.getElementById("results-count").textContent, vis: document.querySelectorAll("#grid .card:not(.hidden)").length, marks: document.querySelectorAll("#grid mark.search-hl").length, hydVis: [...document.querySelectorAll("#grid .card:not(.hidden)")].filter(c => c.__h).length}));
  check("căutare «shogi»: carduri vizibile hidratate + evidențiere", f.vis > 0 && f.hydVis > 0 && f.marks > 0, f);
  await page.fill("#search-input", ""); await page.waitForTimeout(1000);
  // click pe card -> modal
  await page.evaluate(() => window.scrollTo({top: 3000, behavior: "instant"})); await page.waitForTimeout(800);
  await page.evaluate(() => { const c = [...document.querySelectorAll("#grid .card:not(.hidden)")].find(c => c.__h); c.click(); });
  await page.waitForTimeout(800);
  check("click pe card deschide modalul", await page.evaluate(() => { const m = document.getElementById("modal-title"); return !!(m && m.textContent.trim()) && !!document.querySelector(".modal-overlay.open, #modal.open, [aria-modal=true]"); }));
  await ctx.close();
}
{
  const {ctx, page} = await mk({ul: "fr", locale: "fr-FR"});
  check("fr: se cer vi18n-fr și vi18n-en (fallback), nu și celelalte", page.reqs.some(u => u.startsWith("i18n/vi18n-fr.js")) && page.reqs.some(u => u.startsWith("i18n/vi18n-en.js")) && !page.reqs.some(u => /vi18n-(de|hu|it|es|pt)\.js/.test(u)), page.reqs.filter(u => /i18n/.test(u)));
  const t = await page.evaluate(() => ({lang: SFFVI18N.lang(), title: V[0].title, card: document.querySelector("#grid .card .card-title") && document.querySelector("#grid .card .card-title").textContent}));
  check("fr: titlurile traduse și cardurile reconstruite", t.lang === "fr" && /Échecs|échecs/i.test(t.title) && /Échecs|échecs/i.test(t.card || ""), t);
  await page.evaluate(() => SFFI18N.setLang("de")); await page.waitForTimeout(1800);
  check("schimbare la de: cere vi18n-de", page.reqs.some(u => u.startsWith("i18n/vi18n-de.js")));
  await ctx.close();
}
{ // pachet indisponibil -> notificare, text original
  const {ctx, page} = await mk({ul: "hu", locale: "hu-HU", wait: 1100, pre: async c => { await c.route(/vi18n-hu\.js/, r => r.abort()); }});
  const t = await page.evaluate(() => ({toast: [...document.querySelectorAll("#toast-container .toast")].map(e => e.textContent).join("|"), title: V[0].title, cards: document.querySelectorAll("#grid .card").length}));
  check("hu: notificare «nyelvi csomag» și conținut original", /nyelvi csomag/.test(t.toast) && t.cards === 1005 && t.title !== "", t);
  await ctx.close();
}
{ // service worker + offline
  const {ctx, page} = await mk({ul: "ro", wait: 1500});
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, {timeout: 20000}).catch(() => {});
  await page.reload(); await page.waitForTimeout(1500);
  {
    check("SW controlează pagina", await page.evaluate(() => !!navigator.serviceWorker.controller));
  }
  await page.waitForTimeout(24000);
  const keys = await page.evaluate(async () => { const o = []; for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) o.push(new URL(r.url).pathname); return o; });
  check("toate cele 7 pachete în cache (prefetch în fundal)", ["en", "fr", "it", "es", "pt", "de", "hu"].every(l => keys.some(k => k.endsWith("/i18n/vi18n-" + l + ".js"))), keys.filter(k => /i18n/.test(k)));
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(2500);
  await page.evaluate(() => SFFI18N.setLang("es")); await page.waitForTimeout(2500);
  const t = await page.evaluate(() => ({l: SFFVI18N.lang(), t: V[0].title}));
  check("offline: limba es din cache", t.l === "es" && /Ajedrez/i.test(t.t), t);
  await ctx.close();
}
{ // mobil 360: fără overflow, hidratare
  const {ctx, page} = await mk({w: 360, h: 740, touch: true});
  const a = await hyd(page);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("mobil 360: noduri < 3500 și fără overflow orizontal", a.nodes < 3500 && ov <= 0, [a, ov]);
  await ctx.close();
}
check("fără pageerror", errs.length === 0, errs.slice(0, 3));
await browser.close(); srv.close();
summary();
