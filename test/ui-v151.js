// v1.5.1: 상단 줄(물약 3/5칸 · 승천 표시)이 360/390/412 폭에서 잘리지 않는지 + 물약·유물 누르는 범위 (브라우저 에뮬레이션, 실제 폰 아님)
// 사용: NODE_PATH=... URL=http://127.0.0.1:8765/ node test/ui-v151.js
'use strict';
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:8765/';
const res = []; const ok = (n, c, i) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? '  ' + i : '')); };
const W = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  for (const [w, h] of (process.env.VPS || '360x800,390x844,412x915').split(',').map(s => s.split('x').map(Number))) {
    const T = `${w}x${h}`, ctx = await browser.createBrowserContext(), pg = await ctx.newPage(), errors = [];
    pg.on('pageerror', e => errors.push(e.message));
    await pg.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto(URL); await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('beautydeck.settings.v1', JSON.stringify({ sound: false, talk: false })); }); await pg.reload();
    const c = s => pg.evaluate(q => { const e = document.querySelector(q); e && e.click(); }, s);
    await c('[data-act="newGame"]'); await W(300); await c('[data-act="pick"][data-id="sera"]'); await W(600);
    for (let i = 0; i < 20; i++) { if (await pg.evaluate(() => window.BD_UI.run.screen) === 'combat') break; await pg.evaluate(() => { const m = document.querySelector('.modal .btn.primary'); if (m) return m.click(); const t = document.querySelector('[data-act="tutSkip"]'); if (t) return t.click(); const n = document.querySelector('.node.avail'); n && n.click(); }); await W(400); }
    ok(`${T} 전투 진입`, await pg.evaluate(() => window.BD_UI.run.screen === 'combat'));
    for (const [np, asc] of [[3, 0], [3, 5], [5, 0], [5, 10]]) {
      await pg.evaluate((np, asc) => { const U = window.BD_UI; U.run.potions = Array(np).fill(null); U.run.asc = asc; U.render(); }, np, asc); await W(250);
      const r = await pg.evaluate(() => { const t = document.querySelector('.topbar'), vw = innerWidth; const out = [...t.querySelectorAll('.tb')].filter(e => { const q = e.getBoundingClientRect(); return q.right > vw + 1 || q.left < -1; }).map(e => e.dataset.act || e.className); const cards = [...document.querySelectorAll('.hand .card')].filter(e => e.getBoundingClientRect().bottom > innerHeight + 1).length; const end = document.querySelector('[data-act="endTurn"]').getBoundingClientRect(); return { out, cards, endOk: end.bottom <= innerHeight, cls: t.className }; });
      ok(`${T} 물약 ${np}칸 승천 ${asc}: 상단 줄 화면 안`, r.out.length === 0, r.cls + ' ' + r.out.join(','));
      ok(`${T} 물약 ${np}칸 승천 ${asc}: 손패·턴 종료 화면 안`, r.cards === 0 && r.endOk);
    }
    await pg.evaluate(() => { const U = window.BD_UI; U.run.potions = [null, null, null]; U.run.asc = 0; U.render(); }); await W(250);
    const hit = await pg.evaluate(() => ['[data-act="potion"]', '[data-act="relic"]'].map(q => { const e = document.querySelector(q); if (!e) return 0; const r = e.getBoundingClientRect(), cy = r.top + r.height / 2, cx = r.left + r.width / 2; return [[r.left - 3, cy], [r.right + 3, cy], [cx, r.top - 3], [cx, r.bottom + 3]].filter(([x, y]) => { const t = document.elementFromPoint(x, y); return t && t.closest(q); }).length; }));
    ok(`${T} 물약 바깥 3px 탭도 물약`, hit[0] === 4, hit[0] + '/4'); ok(`${T} 유물 바깥 3px 탭도 유물`, hit[1] === 4, hit[1] + '/4');
    ok(`${T} JS 오류 없음`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  console.log(`${res.filter(Boolean).length}/${res.length} passed`); await browser.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
