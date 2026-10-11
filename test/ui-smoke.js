// UI 스모크 테스트: 헤드리스 크롬(모바일 터치 에뮬레이션)으로 실제 화면을 터치하며 한 판을 끝까지 진행합니다.
// 사용: NODE_PATH=/tmp/pt/node_modules URL=http://127.0.0.1:8765/ VP=390x844 HERO=sera node test/ui-smoke.js
'use strict';
const puppeteer = require('puppeteer-core');
const path = require('path');
const URL = process.env.URL || 'file://' + path.join(__dirname, '..', 'dist', 'beauty-deck.html');
const shots = process.env.SHOTS || path.join(__dirname, 'shots');
const [VW, VH] = (process.env.VP || '390x844').split('x').map(Number);
const tag = `${VW}x${VH}`;
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|service worker|sw\.js/i.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const shot = async n => { if (process.env.NOSHOT) return; await page.screenshot({ path: path.join(shots, `smoke-${tag}-${n}.png`) }); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const tap = async sel => { const el = await page.$(sel); if (!el) return false; try { await el.tap(); } catch (e) { await el.click(); } await wait(40); return true; };
  await tap('[data-act="newGame"]');
  await tap(`[data-act="pick"][data-id="${process.env.HERO || 'sera'}"]`); await wait(300);
  const seen = new Set();
  let steps = 0, lastKey = '', same = 0;
  while (steps++ < (+process.env.STEPS || 4000)) {
    const st = await page.evaluate(() => { const U = window.BD_UI, r = U.run; return r ? { screen: r.screen, over: r.over, busy: U.ui.busy, hold: U.ui.hold, modal: !!U.ui.modal, act: r.act, floor: r.floor, hp: r.hp, tut: !!document.querySelector('.tutbox'), turn: r.combat && r.combat.turn, hand: r.combat && r.combat.hand.length, en: r.combat && r.combat.energy } : null; });
    if (!st) break;
    if (st.busy || st.hold) { await wait(150); continue; }
    if (process.env.GOD && st.screen === 'combat') await page.evaluate(() => { const r = window.BD_UI.run; r.hp = r.maxHp; r.combat.p.st.str = 30; });
    const key = JSON.stringify(st);
    if (key === lastKey) { if (++same > 40) { errors.push('stuck at ' + key); break; } } else { same = 0; lastKey = key; }
    if (!seen.has(st.screen)) { seen.add(st.screen); await wait(120); await shot('s-' + st.screen); }
    if (st.over) { await wait(500); await shot('end'); break; }
    if (st.modal) { (await tap('.modal .btn.primary:not(.disabled)')) || (await tap('.modal .btn.gold:not(.disabled)')) || (await tap('.modal [data-act="closeModal"]')); continue; }
    if (st.tut) { await tap('[data-act="tutNext"]'); continue; }
    switch (st.screen) {
      case 'map': await tap('.node.avail'); break;
      case 'combat': {
        const can = await page.evaluate(() => !!document.querySelector('.hand .card.playable'));
        if (can) {
          await tap('.hand .card.playable:last-child') || await tap('.hand .card.playable');
          if (await page.$('.enemy.targetable')) await tap('.enemy.targetable');
          else await tap('.hand .card.sel');
        } else await tap('[data-act="endTurn"]');
        await wait(60);
        break;
      }
      case 'reward':
        if (await page.$('[data-act="rwBoss"]')) { await tap('[data-act="rwBoss"]'); await tap('.modal [data-act="rwBossOk"]'); }
        else if (await page.$('[data-act="rwCardView"]')) { await tap('[data-act="rwCardView"]'); if (!seen.has('rwmodal')) { seen.add('rwmodal'); await wait(100); await shot('reward-card-detail'); } await tap('.modal .btn.primary'); }
        else await tap('[data-act="rwLeave"]');
        break;
      case 'rest': (await tap('[data-act="restSmith"]:not(.done)')) || (await tap('[data-act="restHeal"]')); break;
      case 'select': await tap('[data-act="selView"]'); if (!seen.has('selmodal')) { seen.add('selmodal'); await wait(100); await shot('upgrade-diff'); } await tap('.modal .btn.primary'); break;
      case 'shop': await tap('[data-act="leaveShop"]'); break;
      case 'treasure': (await tap('[data-act="openChest"]')) || (await tap('[data-act="leaveTreasure"]')); break;
      case 'event': (await tap('[data-act="evOpt"]:not(.done)')) || (await tap('[data-act="evLeave"]')); break;
    }
  }
  const fin = await page.evaluate(() => { const r = window.BD_UI.run; return r && { screen: r.screen, act: r.act, floor: r.floor, hp: r.hp, won: r.won }; });
  // 가로 넘침 검사
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) errors.push('horizontal overflow');
  console.log(tag, 'steps', steps, 'final', JSON.stringify(fin), 'screens', [...seen].join(','));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no JS errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
