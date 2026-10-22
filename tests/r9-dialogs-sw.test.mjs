// Teste r9 pentru Șah fără frontiere: dialoguri inline traduse (în locul confirm()/prompt()), service worker + manifest reale (pornire offline).
// Rulare: node tests/r9-dialogs-sw.test.mjs   (Playwright din /opt/node-tools; rețea externă blocată)
import {createRequire} from 'module';
import fs from 'fs';
import http from 'http';
import path from 'path';
import {fileURLToPath} from 'url';
const require = createRequire('/opt/node-tools/package.json');
const {chromium} = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
let ok = 0, bad = 0;
function t(name, cond, extra) { if (cond) { ok++; console.log('  ok  ' + name); } else { bad++; console.log('  FAIL ' + name + (extra ? ' :: ' + JSON.stringify(extra) : '')); } }
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png'};
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox']});

for (const [L, rx, cancel] of [['de', /Fortschritt/, 'Abbrechen'], ['en', /progress/i, 'Cancel'], ['ro', /progresul/, 'Anulează'], ['hu', /haladás/i, 'Mégse']]) {
  const ctx = await b.newContext({viewport: {width: 1000, height: 800}, serviceWorkers: 'block', locale: L});
  await ctx.addInitScript((l) => { try { localStorage.setItem('sff:lang', l); localStorage.setItem('sff:welcomeSeen', '1'); localStorage.setItem('sff:tourSeen', '1'); } catch (e) {} }, L);
  const p = await ctx.newPage(); const errs = []; let native = 0;
  p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { native++; d.dismiss(); });
  await p.goto(BASE); await p.waitForTimeout(4000);
  await p.evaluate(() => document.getElementById('curriculum-reset-btn').click()); await p.waitForTimeout(300);
  const info = await p.evaluate(() => { const bx = document.querySelector('.ffui-box'); return bx ? {txt: bx.textContent, btns: [...bx.querySelectorAll('button')].map((x) => x.textContent)} : null; });
  t(L + ': resetare parcurs → confirmare inline tradusă', info && rx.test(info.txt) && info.btns[0] === cancel, info);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  t(L + ': Esc închide dialogul', await p.evaluate(() => !document.querySelector('.ffui-box')));
  // dialog de copiere (fallback când clipboard e refuzat)
  await p.evaluate(() => FFUI.show(sffTr('FEN (Ctrl+C pentru a copia):'), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w'));
  t(L + ': dialog de copiere cu textarea', await p.evaluate(() => { const x = document.querySelector('.ffui-box textarea'); return !!x && /rnbqkbnr/.test(x.value) && x.readOnly; }));
  await p.keyboard.press('Escape');
  t(L + ': fără dialoguri native, fără erori', native === 0 && errs.length === 0, {native, errs});
  await ctx.close();
}
// service worker + manifest
{
  const ctx = await b.newContext({viewport: {width: 1000, height: 800}});
  await ctx.addInitScript(() => { try { localStorage.setItem('sff:welcomeSeen', '1'); localStorage.setItem('sff:tourSeen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(3000);
  const reg = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; for (let i = 0; i < 100 && r.active && r.active.state !== 'activated'; i++) await new Promise((x) => setTimeout(x, 100)); return r.active && r.active.state; });
  t('service worker activ', reg === 'activated', reg);
  t('manifest real (nu data:)', await p.evaluate(() => { const l = document.querySelector('link[rel=manifest]'); return !!l && /manifest\.webmanifest$/.test(l.getAttribute('href')); }));
  const keys = await p.evaluate(async () => (await caches.keys()));
  t('cache fff-sah-fara-frontiere-<versiune>', keys.some((k) => /^fff-sah-fara-frontiere-\d+\.\d+\.\d+$/.test(k)), keys);
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(4000);
  t('repornire offline: pagina se încarcă', await p.evaluate(() => !!document.getElementById('app-version')) && errs.length === 0, errs);
  await ctx.close();
}
await b.close(); srv.close();
console.log('\n' + ok + ' reușite, ' + bad + ' eșuate'); process.exit(bad ? 1 : 0);
