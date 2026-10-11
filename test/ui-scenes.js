// 주요 장면 스크린샷: NODE_PATH=/tmp/pt/node_modules URL=http://127.0.0.1:8765/ SHOTS=... node test/ui-scenes.js
'use strict';
const puppeteer = require('puppeteer-core');
const path = require('path');
const URL = process.env.URL || 'file://' + path.join(__dirname, '..', 'dist', 'beauty-deck.html');
const shots = process.env.SHOTS || path.join(__dirname, 'shots');
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (const [w, h] of (process.env.VPS || '390x844,360x780').split(',').map(s => s.split('x').map(Number))) {
    const tag = `${w}x${h}`;
    const shot = n => page.screenshot({ path: `${shots}/${n}-${tag}.png` });
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(300);
    await shot('01-title-new');
    // 진행된 기록(일부 업적·갤러리·승천 해금) 상태로 연출
    await page.evaluate(() => {
      const U = window.BD_UI, E = window.BD_ENGINE, D = window.BD_DATA;
      const m = E.newMeta();
      Object.assign(m, { runs: 14, wins: 3, ascMax: 3, kills: 312, elites: 11, bestAct: 4, maxHit: 52, cardsPlayed: 1840, dmgDealt: 23110, tutorialDone: true });
      ['first_win', 'win_sera', 'win_luna', 'boss_morgana', 'boss_belita', 'boss_celes', 'boss_nyx', 'big_hit', 'elite10', 'asc1', 'kills100'].forEach(a => m.ach[a] = Date.now());
      m.heroWins = { sera: 2, luna: 1 }; m.heroRuns = { sera: 6, luna: 5, yuki: 3 }; m.heroBestAsc = { sera: 2, luna: 0 };
      m.cardsSeen = Object.keys(D.CARDS).filter((k, i) => i % 4 !== 0); m.relicsSeen = Object.keys(D.RELICS).filter((k, i) => i % 3 !== 0);
      m.enemiesSeen = Object.keys(D.ENEMIES).filter((k, i) => i % 5 !== 4); m.bosses = { morgana: 4, belita: 3, celes: 3, nyx: 3 };
      m.newGallery = ['g_nyx'];
      U.meta = m; localStorage.setItem('beautydeck.meta.v2', JSON.stringify(m)); U.render();
    });
    await wait(200); await shot('02-title');
    await page.tap('[data-act="newGame"]'); await wait(250); await shot('03-pick');
    await page.tap('[data-act="pick"][data-id="aria"]'); await wait(300); await shot('04-map-act1');
    // 전투: 일반
    await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE; E.startCombat(U.run, ['mia', 'slime'], 'monster'); U.run.fx = []; U.ui.deal = true; U.render(); });
    await wait(700); await shot('05-combat');
    await page.tap('.hand .card.playable'); await wait(150); await shot('06-combat-select');
    // 보스전들
    for (const [b, act] of [['belita', 2], ['nyx', 4]]) {
      await page.evaluate((b, act) => { const U = window.BD_UI, E = window.BD_ENGINE; U.run.act = act; U.ui.sel = null; E.startCombat(U.run, [b], 'boss'); U.run.fx = []; U.render(); }, b, act);
      await wait(500); await shot(`07-boss-${b}`);
    }
    // 보상(보스 유물 + 조합)
    await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE; const r = U.run; for (const e of r.combat.enemies) { e.hp = 1; } r.combat.p.st.str = 50; U.render(); });
    await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, r = U.run; r.act = 2; r.combat.enemies.forEach(e => { e.hp = 0; }); });
    await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, D = window.BD_DATA, r = U.run; r.combat = null; r.screen = 'reward';
      r.rewards = { kind: 'boss', gold: 95, goldTaken: false, cards: [{ id: 'h_judge', up: false }, { id: 'h_bastion', up: false }, { id: 'ex_aegis', up: false }], cardTaken: false, relic: null, relicTaken: false, bossRelics: ['b_crown', 'b_phoenix', 'b_giant'], bossRelicTaken: false, potion: 'fairy_p', potionTaken: false };
      r.deck.push({ uid: 900, id: 'h_bulwark', up: false }, { uid: 901, id: 'h_sanctuary', up: true }); U.ui.hold = false; U.render(); });
    await wait(300); await shot('08-reward-boss');
    await page.tap('[data-act="rwCardView"][data-i="2"]'); await wait(250); await shot('09-card-detail');
    await page.tap('.cd-art'); await wait(250); await shot('10-art-viewer');
    await page.tap('.viewer'); await wait(100);
    await page.evaluate(() => window.BD_UI.H.closeModal());
    // 강화 비교
    await page.evaluate(() => { const U = window.BD_UI, r = U.run; r.rewards = null; r.screen = 'rest'; U.render(); });
    await wait(200); await shot('11-rest');
    await page.tap('[data-act="restSmith"]'); await wait(200); await page.tap('[data-act="selView"]'); await wait(250); await shot('12-upgrade-diff');
    await page.evaluate(() => window.BD_UI.H.closeModal());
    // 도감
    await page.evaluate(() => window.BD_UI.H.codex()); await wait(250); await shot('13-codex-cards');
    await page.evaluate(() => window.BD_UI.H.codexTab({ t: 'enemies' })); await wait(250); await shot('14-codex-enemies');
    await page.evaluate(() => window.BD_UI.H.codexTab({ t: 'gallery' })); await wait(250); await shot('15-codex-gallery');
    await page.evaluate(() => window.BD_UI.H.codexTab({ t: 'ach' })); await wait(250); await shot('16-achievements');
    await page.evaluate(() => window.BD_UI.H.codexTab({ t: 'stats' })); await wait(250); await shot('17-stats');
    await page.evaluate(() => window.BD_UI.H.settings()); await wait(250); await shot('18-settings');
    await page.evaluate(() => window.BD_UI.H.closeModal());
    // 상점
    await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, r = U.run; r.screen = 'map'; r.pending = null; r.gold = 300; const id = Object.keys(r.map.nodes).find(k => r.map.nodes[k].type === 'shop'); if (id) { r.map.nodes[id].floor = 0; } U.render(); });
    await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, r = U.run; const id = Object.keys(r.map.nodes).find(k => r.map.nodes[k].type === 'shop'); if (id) { r.pos = null; r.visited = []; const n = r.map.nodes[id]; n.floor = 0; E.chooseNode(r, id); r.fx = []; U.render(); } });
    await wait(250); await shot('19-shop');
    // 승리 화면
    await page.evaluate(() => { const U = window.BD_UI, r = U.run; r.over = true; r.won = true; r.screen = 'victory'; r.stats.bosses = ['morgana', 'belita', 'celes', 'nyx']; U.ui.modal = null; U.render(); });
    await wait(400); await shot('20-victory');
  }
  console.log(errors.length ? 'ERRORS ' + errors.join('\n') : 'no JS errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
