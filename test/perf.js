// 성능 프로파일 (브라우저 에뮬레이션 390×844, 실제 폰 아님): NODE_PATH=... URL=http://127.0.0.1:8765/ CPU=4 node test/perf.js
// 첫 로드 바이트(종류별)·LCP·long task, 첫 전투 진입 뒤 바이트, 전투 6초 rAF 프레임, 물약·유물 누르는 범위(가장자리 탭)
'use strict';
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:8765/', CPU = Number(process.env.CPU || 4);
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const cdp = await page.createCDPSession(); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const bytes = {}, types = {}, count = {};
  cdp.on('Network.responseReceived', e => { types[e.requestId] = (e.response.url.split('?')[0].split('.').pop() || '?').slice(0, 6); });
  cdp.on('Network.loadingFinished', e => { const t = types[e.requestId] || '?'; bytes[t] = (bytes[t] || 0) + e.encodedDataLength; count[t] = (count[t] || 0) + 1; });
  await page.evaluateOnNewDocument(() => { window.__lcp = 0; window.__lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => (window.__lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ type: 'longtask', buffered: true }); });
  await page.goto(URL, { waitUntil: 'networkidle0' }); await wait(400);
  const sum = () => Object.values(bytes).reduce((a, b) => a + b, 0);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), lcp: Math.round(window.__lcp), lt: window.__lt.length, ltMax: Math.round(Math.max(0, ...window.__lt)) }; });
  console.log(`CPU x${CPU} | 첫 로드 ${Math.round(sum() / 1024)}KB | DCL ${nav.dcl}ms LCP ${nav.lcp}ms | long task ${nav.lt} (최대 ${nav.ltMax}ms)`);
  console.log('  ' + Object.entries(bytes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v / 1024)}KB×${count[k]}`).join(' · '));
  const clk = s => page.evaluate(q => { const e = document.querySelector(q); if (!e) return false; e.click(); return true; }, s);
  await page.evaluate(() => localStorage.setItem('beautydeck.settings.v1', JSON.stringify({ sound: false, talk: false })));
  await clk('[data-act="newGame"]'); await wait(300); await clk('[data-act="pick"][data-id="sera"]'); await wait(500);
  for (let i = 0; i < 30; i++) { const s = await page.evaluate(() => { const U = window.BD_UI; return U.run && U.run.screen; }); if (s === 'combat') break; await page.evaluate(() => { const m = document.querySelector('.modal .btn.primary'); if (m) return m.click(); const t = document.querySelector('[data-act="tutSkip"]'); if (t) return t.click(); const n = document.querySelector('.node.avail'); n && n.click(); }); await wait(300); }
  await wait(800);
  console.log(`첫 전투까지 누적 ${Math.round(sum() / 1024)}KB`);
  // 누르는 범위: 물약·유물 가장자리 바깥 3px 탭이 같은 버튼으로 가는지
  const hit = await page.evaluate(() => ['[data-act="potion"]', '[data-act="relic"]'].map(q => { const e = document.querySelector(q); if (!e) return q + ': 없음'; const r = e.getBoundingClientRect(), cy = r.top + r.height / 2, cx = r.left + r.width / 2; const pts = [[r.left - 3, cy], [r.right + 3, cy], [cx, r.top - 3], [cx, r.bottom + 3]]; const okN = pts.filter(([x, y]) => { const t = document.elementFromPoint(x, y); return t && t.closest(q); }).length; return `${q} 보이는 ${Math.round(r.width)}x${Math.round(r.height)} · 바깥 3px 탭 ${okN}/4`; }));
  console.log('  ' + hit.join(' | '));
  await page.evaluate(() => { window.__lt = []; window.__fr = []; let last = performance.now(); const tick = t => { window.__fr.push(t - last); last = t; if (window.__fr.length < 1e5) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const t0 = Date.now(); while (Date.now() - t0 < 6000) { await page.evaluate(() => { const U = window.BD_UI; if (!U.run || U.run.screen !== 'combat' || U.ui.busy) return; const c = document.querySelector('.hand .card.playable'); if (c) { c.click(); const e = document.querySelector('.enemy.targetable'); if (e) e.click(); else { const s = document.querySelector('.hand .card.sel'); s && s.click(); } } else { const b = document.querySelector('[data-act="endTurn"]'); b && b.click(); } }); await wait(200); }
  const r = await page.evaluate(() => { const f = window.__fr.slice(2).sort((a, b) => a - b); const q = p => f[Math.min(f.length - 1, Math.floor(f.length * p))]; return { n: f.length, p50: q(.5), p95: q(.95), max: f[f.length - 1], slow: f.filter(x => x > 50).length, lt: window.__lt.length, ltMax: Math.max(0, ...window.__lt), heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }; });
  console.log(`전투 6초 프레임 ${r.n} | p50 ${r.p50.toFixed(1)} p95 ${r.p95.toFixed(1)} 최대 ${r.max.toFixed(0)}ms | >50ms ${r.slow} | long task ${r.lt} (최대 ${Math.round(r.ltMax)}ms) | 힙 ${(r.heap / 1048576).toFixed(1)}MB`);
  console.log(errors.length ? 'JS 오류 ' + errors.join(' | ') : 'JS 오류 없음');
  await browser.close();
})();
