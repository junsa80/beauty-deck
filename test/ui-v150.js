// v1.5 스모크: 오늘의 원정(같은 날 = 같은 시드·히로인, 기록·보너스 경험치, 다시 = 같은 판) · 승천 권장 줄 · 밸런스 수치 · 모바일 한 화면 규칙
// 사용: NODE_PATH=<puppeteer-core 위치> URL=http://127.0.0.1:8765/ SHOTS=/tmp/shots node test/ui-v150.js
'use strict';
const puppeteer = require('puppeteer-core');
const path = require('path');
const URL = process.env.URL || 'file://' + path.join(__dirname, '..', 'dist', 'beauty-deck.html');
const shots = process.env.SHOTS || path.join(__dirname, 'shots');
const res = [];
const ok = (n, c, i) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (i ? '  ' + i : '')); };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  for (const [W, H] of (process.env.VPS || '390x844,360x780').split(',').map(s => s.split('x').map(Number))) {
    const T = `${W}x${H}`;
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|service worker|sw\.js/i.test(m.text())) errors.push(m.text()); });
    await page.goto(URL); await page.evaluate(() => localStorage.clear());
    // 승천 3까지 열린 저장 (예전 형식: daily 키 없음)
    await page.evaluate(() => localStorage.setItem('beautydeck.meta.v2', JSON.stringify({ v: 3, runs: 5, wins: 3, ascMax: 3, heroXp: { sera: 800 }, ach: { boss_belita: 1 }, ownedPacks: ['dlc-night-trio'] })));
    await page.reload(); await wait(300);
    const shot = n => page.screenshot({ path: path.join(shots, `daily_${T}_${n}.png`) });
    const audit = async label => {
      const r = await page.evaluate(() => {
        const vis = el => { const s = getComputedStyle(el), b = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
        const small = [], taps = [];
        document.querySelectorAll('#daily-panel *, #daily-res *, .asc-panel *, .title-screen > .col *').forEach(el => {
          if (!vis(el)) return;
          if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12) small.push(el.className + ':' + getComputedStyle(el).fontSize);
          if (el.tagName === 'BUTTON') { const b = el.getBoundingClientRect(); if (b.height < 44 || b.width < 44) taps.push((el.id || el.dataset.act) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height)); }
        });
        return { small, taps, hscroll: document.documentElement.scrollWidth > innerWidth };
      });
      ok(`${T} ${label} 글자 ≥12px`, !r.small.length, r.small.slice(0, 4).join(', '));
      ok(`${T} ${label} 버튼 ≥44px`, !r.taps.length, r.taps.slice(0, 4).join(', '));
      ok(`${T} ${label} 가로 넘침 없음`, !r.hscroll);
    };
    // 밸런스 수치 (v1.5)
    const v = await page.evaluate(() => { const D = window.BD_DATA || (window.BD_ENGINE && window.BD_ENGINE.D); return { ariaHp: D.STARTERS.aria.hp, serenaHp: D.STARTERS.serena.hp, asc4: D.ASCENSION[4], ver: D.VERSION }; });
    ok(`${T} 밸런스 수치 · 버전`, v.ariaHp === 66 && v.serenaHp === 70 && /\+5%/.test(v.asc4) && /^1\.5\.\d+$/.test(v.ver), JSON.stringify(v));
    await page.tap('[data-act="newGame"]'); await wait(250);
    ok(`${T} 오늘의 원정 칸`, !!(await page.$('#daily-panel')));
    const hint = await page.$eval('#asc-hint', e => e.textContent).catch(() => '');
    ok(`${T} 승천 권장 줄`, /권장/.test(hint), hint);
    await audit('히로인 선택');
    await shot('pick');
    const d0 = await page.evaluate(() => window.BD_ENGINE.dailyOf(window.BD_UI.meta));
    await page.tap('#btn-daily'); await wait(300);
    const r0 = await page.evaluate(() => { const r = window.BD_UI.run; return { daily: r.daily, seed: r.seed, starter: r.starter, asc: r.asc, map: JSON.stringify(r.map), deck: r.deck.map(c => c.id).join(',') }; });
    ok(`${T} 오늘의 원정 = 그날 시드·히로인·승천 0`, r0.daily === d0.key && r0.seed === d0.seed && r0.starter === d0.hero && r0.asc === 0, `${d0.hero} ${d0.seed}`);
    await shot('map');
    // 2막 3층에서 끝난 것으로
    await page.evaluate(() => { const U = window.BD_UI, r = U.run; r.act = 2; r.floor = 3; r.hp = 0; r.over = true; r.won = false; r.screen = 'gameover'; window.BD_ENGINE.recordRun(U.meta, r); U.render(); });
    await wait(300);
    const m1 = await page.evaluate(() => window.BD_UI.meta.daily);
    ok(`${T} 기록 저장 · 보너스 경험치`, m1 && m1.best && m1.best.prog === 14 && m1.tries === 1 && m1.done, JSON.stringify(m1 && m1.best));
    ok(`${T} 결과 화면 오늘의 원정 줄`, /최고 기록 갱신.*\+40/.test(await page.$eval('#daily-res', e => e.textContent).catch(() => '')));
    await audit('결과');
    await shot('end');
    await page.tap('[data-act="again"]'); await wait(300);
    const r2 = await page.evaluate(() => { const r = window.BD_UI.run; return { daily: r.daily, seed: r.seed, map: JSON.stringify(r.map), deck: r.deck.map(c => c.id).join(',') }; });
    ok(`${T} 다시 도전 = 같은 판`, r2.daily === r0.daily && r2.seed === r0.seed && r2.map === r0.map && r2.deck === r0.deck);
    // 예전 저장 호환: daily 없는 meta 가 그대로 열린다
    const mig = await page.evaluate(() => { const E = window.BD_ENGINE, m = E.migrateMeta({ v: 3, runs: 2, heroXp: { sera: 100 } }); return m.daily === null && m.heroXp.sera === 100; });
    ok(`${T} 예전 저장 호환`, mig);
    ok(`${T} 콘솔·페이지 오류 없음`, !errors.length, errors.slice(0, 3).join(' | '));
    await page.close();
  }
  await browser.close();
  const f = res.filter(x => !x).length;
  console.log(`${res.length - f}/${res.length} passed`);
  process.exit(f ? 1 : 0);
})();
