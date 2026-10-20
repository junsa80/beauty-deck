// v1.3.1 검사: 새 히로인 3명(마리엘·세레나·오데트) 초상·카드 45장이 실제 그림인지 (임시 SVG 그림이 남지 않았는지)
// 사용: NODE_PATH=/tmp/pt/node_modules URL=http://127.0.0.1:18821/ SHOTS=/tmp/shots node test/ui-v131.js
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'data.js'));
const URL = process.env.URL || 'http://127.0.0.1:18821/';
const shots = process.env.SHOTS || path.join(__dirname, 'shots');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
const NEW = ['mariel', 'serena', 'odette'];
global.window = {}; eval(fs.readFileSync(path.join(ROOT, 'artmap.js'), 'utf8')); const AM = window.BD_ARTMAP;
const webpSize = f => { const b = fs.readFileSync(f); if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const t = b.toString('ascii', 12, 16); if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]; if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]; if (t === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; } return null; };
const ids = Object.entries(D.CARDS).filter(([, c]) => NEW.includes(c.hero)).map(([id]) => id);
ok(ids.length === 45, `새 히로인 카드 45장 (${ids.length})`);
const keys = [...NEW.map(h => 'hero:' + h), ...ids.map(id => 'card:' + id)];
const missing = keys.filter(k => !AM[k] || !fs.existsSync(path.join(ROOT, AM[k])));
ok(missing.length === 0, `artmap에 실제 그림 등록·파일 있음 48칸 (없음: ${missing.join(',') || '-'})`);
const bad = keys.filter(k => AM[k] && fs.existsSync(path.join(ROOT, AM[k])) && String(webpSize(path.join(ROOT, AM[k]))) !== '540,960');
ok(bad.length === 0, `모두 540×960 webp (틀림: ${bad.join(',') || '-'})`);
(async () => {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
  await page.goto(URL); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('beautydeck.meta.v2', JSON.stringify({ v: 3, tutorialDone: true, heroXp: { mariel: 3200, serena: 3200, odette: 3200 } })); });
  await page.reload(); await wait(600);
  // 브라우저에서 렌더된 결과: 초상·카드 칸이 <img>(실제 그림)인지, 임시 SVG가 아닌지
  const r = await page.evaluate((ids, NEW) => { const A = window.BD_ART; const isReal = (k, f) => { const h = A.html(k, {}, {}); return /<img[^>]+src="img\/[^"]+\.webp"/.test(h) && !/<svg/.test(h) && h.includes(f); };
    return { heroes: NEW.filter(h => !isReal('hero:' + h, 'hero_' + h)), cards: ids.filter(id => !isReal('card:' + id, 'card_' + id)) }; }, ids, NEW);
  ok(r.heroes.length === 0 && r.cards.length === 0, `렌더: 임시 그림 0칸 (초상 ${r.heroes.join(',') || '-'} / 카드 ${r.cards.join(',') || '-'})`);
  // 선택 화면
  await page.evaluate(() => window.BD_UI.H.newGame()); await wait(500);
  await page.evaluate(() => { const b = document.querySelector('[data-act="pick"][data-id="mariel"]'); b && b.closest('.panel').scrollIntoView({ block: 'start' }); }); await wait(500);
  ok(await page.evaluate(() => ['mariel', 'serena', 'odette'].every(h => document.querySelector(`img[src*="hero_${h}.webp"]`))), '선택 화면: 새 히로인 3명 초상 실제 그림');
  await shot('v131-select');
  // 전투
  for (const h of NEW) {
    await page.evaluate(() => { window.BD_UI.run = null; localStorage.removeItem('beautydeck.run.v1'); window.BD_UI.H.newGame(); }); await wait(300);
    await page.evaluate(h => window.BD_UI.H.pick({ id: h }), h); await wait(500);
    await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, r = U.run; const id = E.availableNodes(r)[0]; r.map.nodes[id].type = 'monster'; U.render(); });
    await page.click('.node.avail'); await wait(1500);
    const st = await page.evaluate(h => { const hand = [...document.querySelectorAll('.hand .card, .hand [data-uid]')]; return { portrait: !!document.querySelector(`.pportrait img[src*="hero_${h}.webp"]`), cards: document.querySelectorAll('img[src*="img/card_"]').length, svg: document.querySelectorAll('.pportrait svg').length }; }, h);
    ok(st.portrait && st.svg === 0 && st.cards >= 3, `${h} 전투: 초상 실제 그림, 손패 카드 그림 ${st.cards}장`);
    await shot('v131-battle-' + h);
  }
  // 스토리 + 말풍선 초상
  await page.evaluate(() => { const U = window.BD_UI; U.run = null; U.ui.view = 'title'; U.render(); U.H.story({ h: 'serena', ch: '0' }); }); await wait(400);
  for (let i = 0; i < 6; i++) { const done = await page.evaluate(() => !!document.querySelector('.story-stage img[src*="hero_serena"]')); if (done) break; await page.evaluate(() => window.BD_UI.H.storyNext()); await wait(250); }
  ok(await page.evaluate(() => !!document.querySelector('.story-stage img[src*="hero_serena.webp"]')), '스토리: 세레나 대사 장면에 실제 초상');
  await shot('v131-story-serena');
  await page.evaluate(() => window.BD_UI.H.storyClose());
  // 카드 시트 (45장)
  await page.evaluate((ids) => { const D = window.BD_DATA, A = window.BD_ART; document.body.innerHTML = `<div style="background:#120a1e;color:#fff;padding:6px;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;font:10px sans-serif">${ids.map(id => `<div style="text-align:center"><div style="aspect-ratio:9/16;overflow:hidden;border-radius:6px;border:2px solid ${id.startsWith('mx_') ? '#ffd36e' : '#555'}">${A.html('card:' + id, {}, { eager: true }).replace('class="artimg"', 'style="width:100%;height:100%;object-fit:cover"')}</div>${D.CARDS[id].name}</div>`).join('')}</div>`; }, ids);
  await wait(1500);
  ok(await page.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth === 540)), '카드 시트: 45장 그림 모두 로드(540px)');
  await page.screenshot({ path: path.join(shots, 'v131-cardsheet.png'), fullPage: true });
  ok(errors.length === 0, 'JS 오류 없음 ' + errors.join(' | '));
  await browser.close();
  console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL PASS'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
