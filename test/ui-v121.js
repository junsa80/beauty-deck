// v1.2.1 검사: 숙련 카드 12장 전용 일러스트 · 스토리 장 길이(600~900자) · v1.2.0 저장 그대로 불러오기 · 버전/캐시 이름
// 사용: NODE_PATH=/tmp/pt/node_modules URL=http://127.0.0.1:18793/ SHOTS=/tmp/shots node test/ui-v121.js
'use strict';
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const URL = process.env.URL || 'http://127.0.0.1:18793/';
const shots = process.env.SHOTS || path.join(__dirname, 'shots');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
const MX = ['sx_flurry', 'sx_vow', 'sx_dawn', 'lx_comet', 'lx_veil', 'lx_orbit', 'yx_mist', 'yx_needle', 'yx_moon', 'ax_lantern', 'ax_oath', 'ax_dawnshield'];
(async () => {
  // 1) 정적 검사
  const am = fs.readFileSync(path.join(ROOT, 'artmap.js'), 'utf8');
  const miss = MX.filter(id => !am.includes(`"card:${id}": "img/card_${id}.webp"`) || !fs.existsSync(path.join(ROOT, 'img', `card_${id}.webp`)));
  ok(miss.length === 0, '숙련 카드 12장 artmap 등록 + img 파일 존재 ' + miss.join(','));
  const bad = MX.filter(id => { const b = fs.readFileSync(path.join(ROOT, 'img', `card_${id}.webp`)); return b.slice(8, 12).toString() !== 'WEBP' || b.length < 20000 || b.length > 125 * 1024; });
  ok(bad.length === 0, '숙련 카드 그림 webp·20~125KB ' + bad.join(','));
  const S = require(path.join(ROOT, 'story.js'));
  const lens = []; for (const h in S) S[h].forEach((c, i) => lens.push([h + (i + 1), c.lines.map(l => l[1]).join('').length]));
  const out = lens.filter(([, n]) => n < 600 || n > 900);
  ok(lens.length === 20 && out.length === 0, `스토리 20장 모두 600~900자 (최소 ${Math.min(...lens.map(x => x[1]))}, 최대 ${Math.max(...lens.map(x => x[1]))}) ` + out.join(' '));
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ver = require(path.join(ROOT, 'data.js')) && (globalThis.BD_DATA || {}).VERSION;
  ok(sw.includes("'beautydeck-v1.2.1'") && !/1\.2\.0/.test(sw + idx), 'sw 캐시 이름·index 쿼리 v1.2.1');
  // 2) 브라우저
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|service worker|sw\.js/i.test(m.text())) errors.push('console: ' + m.text()); });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await page.goto(URL); await page.evaluate(() => localStorage.clear());
  // v1.2.0 형식 저장(heroXp·storyRead 있음, 숙련 카드 발견됨)
  const v120 = { v: 3, runs: 20, wins: 5, bestFloor: 40, bestAct: 4, kills: 500, elites: 15, bosses: { morgana: 5 }, heroWins: { sera: 3 }, heroRuns: { sera: 10, luna: 5, yuki: 3, aria: 2 }, heroBestAsc: {},
    cardsSeen: ['s_twin'].concat(MX), relicsSeen: [], enemiesSeen: [], ach: { first_win: 1, win_sera: 1, boss_morgana: 1 }, ascMax: 2, maxHit: 60, cardsPlayed: 2000, dmgDealt: 30000, potionsUsed: 10, goldEarned: 4000, playMs: 0,
    tutorialDone: true, newGallery: [], heroXp: { sera: 1800, luna: 900, yuki: 700, aria: 400 }, storyRead: { sera0: 1, sera1: 1, sera3: 1, yuki0: 1 }, updatedAt: '2026-10-20T10:00:00.000Z' };
  await page.evaluate(m => localStorage.setItem('beautydeck.meta.v2', JSON.stringify(m)), v120);
  await page.reload(); await wait(600);
  const m = await page.evaluate(() => { const m = window.BD_UI.meta; return { xp: m.heroXp, read: m.storyRead, runs: m.runs, ach: Object.keys(m.ach).length, from: m.xpMigratedFrom, ver: window.BD_DATA.VERSION }; });
  ok(m.ver === '1.2.1', '게임 버전 1.2.1');
  ok(m.runs === 20 && m.ach === 3 && m.xp.sera === 1800 && m.xp.aria === 400 && m.read.sera3 && m.read.yuki0 && !m.from, 'v1.2.0 저장 그대로 유지(경험치 재계산 없음·읽은 스토리 유지)');
  // 도감 → 히로인별 카드 탭, 숙련 카드 그림 확인
  for (const [cls, h] of [['sword', 'sera'], ['magic', 'luna'], ['ninja', 'yuki'], ['holy', 'aria']]) {
    await page.evaluate(c => { window.BD_UI.ui.modal = null; window.BD_UI.ui.modalStack = []; window.BD_UI.H.codex(); window.BD_UI.H.codexCls({ c }); }, cls); await wait(200);
    await page.evaluate(() => { const ids = ['sx_', 'lx_', 'yx_', 'ax_']; const el = [...document.querySelectorAll('.modal img.artimg')].find(i => ids.some(p => i.src.includes('card_' + p))); if (el) el.scrollIntoView({ block: 'center' }); });
    await wait(900);
    const r = await page.evaluate(() => [...document.querySelectorAll('.modal img.artimg')].filter(i => /card_(sx|lx|yx|ax)_/.test(i.src)).map(i => ({ s: i.src.split('/').pop(), w: i.naturalWidth })));
    ok(r.length === 3 && r.every(x => x.w === 540), `${h} 숙련 카드 3장 전용 그림 표시 ` + JSON.stringify(r));
    await page.screenshot({ path: path.join(shots, `v121-codex-${h}.png`) });
  }
  // 카드 상세
  await page.evaluate(() => window.BD_UI.H.closeModal && window.BD_UI.H.closeModal());
  await page.evaluate(() => { window.BD_UI.ui.modal = null; window.BD_UI.ui.modalStack = []; window.BD_UI.H.codex(); window.BD_UI.H.codexCls({ c: 'sword' }); });
  await wait(200);
  const el = await page.$('.modal .card[data-id="sx_dawn"], .modal [data-act="cardInfo"][data-id="sx_dawn"]');
  if (el) { await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await el.click(); await wait(900); await page.screenshot({ path: path.join(shots, 'v121-card-detail-sx_dawn.png') }); }
  ok(!!el && await page.evaluate(() => !!document.querySelector('.cd-art img[src*="card_sx_dawn"]')), '카드 상세에서 전용 그림(새벽 검무)');
  // 늘린 스토리 장 열어 보기 (유키 4장)
  await page.evaluate(() => { window.BD_UI.ui.modal = null; window.BD_UI.ui.modalStack = []; window.BD_UI.H.story({ h: 'yuki', ch: '3' }); }); await wait(500);
  ok(await page.evaluate(() => !!document.querySelector('.story-bg')), '보강한 스토리 장(유키 4장) 열림');
  await page.screenshot({ path: path.join(shots, 'v121-story-yuki4.png') });
  ok(errors.length === 0, 'JS 오류 없음 ' + errors.join(' | '));
  await browser.close();
  console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
