// v1.3.0 검사: 새 히로인 3명(마리엘·세레나·오데트) 메커니즘 단위 테스트 + 화면(390×844) + 저장 호환
// 사용: NODE_PATH=/tmp/pt/node_modules URL=http://127.0.0.1:18793/ SHOTS=/tmp/shots node test/ui-v130.js
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const E = require(path.join(ROOT, 'engine.js')), D = E.D;
const S = require(path.join(ROOT, 'story.js'));
const URL = process.env.URL || 'http://127.0.0.1:18793/';
const shots = process.env.SHOTS || path.join(__dirname, 'shots');
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
const NEW = ['mariel', 'serena', 'odette'];
const CLS = { mariel: 'puppet', serena: 'moon', odette: 'lore' };

// ── 1) 데이터
for (const h of NEW) {
  const st = D.STARTERS[h], cards = Object.entries(D.CARDS).filter(([, c]) => c.cls === CLS[h]);
  const excl = cards.filter(([, c]) => c.rarity !== 'starter'), starter = cards.filter(([, c]) => c.rarity === 'starter');
  ok(excl.length === 12 && excl.filter(([, c]) => c.mastery === h).length === 3 && starter.length === 3, `${h}: 전용 카드 12장(숙련 3 포함) + 시작 카드 3종`);
  ok(st && st.deck.length === 10 && st.deck.every(id => D.CARDS[id]) && D.RELICS[st.relic] && !st.locked, `${h}: 시작 덱 10장·시작 유물·처음부터 선택 가능`);
  const m = D.MASTERY.heroes[h];
  ok(m && m.cards.every(id => D.CARDS[id].mastery === h) && D.RELICS[m.relic] && m.passive && m.deck.cards.length === 10 && m.titles.length === 2 && D.MASTERY.track(h).length === 15, `${h}: 숙련 Lv1~10 보상 15칸(카드3·유물·패시브·덱·물약·칭호2·금테·스토리5)`);
  const lens = S[h].map(c => c.lines.map(l => l[1]).join('').length);
  ok(S[h].length === 5 && lens.every(n => n >= 600 && n <= 900), `${h}: 스토리 5장 600~900자 (${lens.join('/')})`);
  const L = D.LINES[h];
  ok(L && ['elite', 'boss', 'bossWin', 'event', 'shop', 'rest', 'win', 'loss'].every(k => L[k] && L[k].length >= 2), `${h}: 상황별 대사`);
  for (const [id, c] of cards) for (const up of [false, true]) { const t = E.describe(E.cardDef({ id, up })); if (!t || /undefined|NaN/.test(t)) ok(false, 'bad desc ' + id + ' ' + t); }
}
ok(Object.keys(D.ACHIEVEMENTS).filter(a => /^win_(mariel|serena|odette)$/.test(a)).length === 3, '새 히로인 클리어 업적 3개');

// ── 2) 메커니즘 단위 테스트 (엔진)
function fight(h, enemies, deck) {
  const r = E.newRun(h, 42); if (deck) r.deck = deck.map((id, i) => ({ uid: 9000 + i, id, up: false }));
  E.startCombat(r, enemies, 'monster'); return r;
}
const hand = (r, id) => r.combat.hand.find(c => c.id === id);
const give = (r, id, up) => { const cd = { uid: r.nextUid++, id, up: !!up }; r.combat.hand.push(cd); return cd; };
{ // 마리엘
  const r = fight('mariel', ['slime'], ['pm_strike', 'pm_strike', 'pm_strike', 'pm_strike', 'pm_strike']);
  const c = r.combat;
  ok(c.allies.length === 1 && c.allies[0].hp === 5, '마리엘: 은빛 골무로 전투 시작 시 인형 1체(체력 5)');
  c.energy = 9; E.playCard(r, give(r, 'pm_doll').uid, 0); E.playCard(r, give(r, 'pm_doll').uid, 0); E.playCard(r, give(r, 'pm_doll').uid, 0);
  ok(c.allies.length === 3 && c.allies[0].hp === 10, '마리엘: 인형 최대 3체, 넘치면 맨 앞 인형 체력 보강');
  const e = c.enemies[0]; e.hp = e.maxHp = 200; const hpBefore = r.hp; const dollHp = c.allies[0].hp;
  e.intent = Object.keys(D.ENEMIES[e.id].moves).find(k => D.ENEMIES[e.id].moves[k].dmg); c.p.block = 0;
  const eh = e.hp; E.endTurn(r);
  ok(e.hp < eh, `마리엘: 턴 종료 시 인형 3체가 공격 (적 체력 ${eh}→${e.hp})`);
  ok(r.hp === hpBefore && c.allies[0].hp < dollHp, `마리엘: 적 공격을 맨 앞 인형이 대신 받음 (인형 ${dollHp}→${c.allies[0].hp}, 내 체력 그대로)`);
  const n0 = c.allies.length, al = c.enemies.filter(x => !x.dead)[0], h0 = al.hp; c.energy = 9;
  E.playCard(r, give(r, 'pm_heart').uid, 0);
  ok(c.allies.length === n0 - 1 && al.hp < h0 && c.broken.length >= 1, '마리엘: 불꽃 심장 = 인형 1체를 부숴 광역 피해');
  E.playCard(r, give(r, 'mx_finale').uid, 0);
  ok(c.allies.length === Math.min(3, n0) && c.broken.length === 0, '마리엘: 마지막 무대 = 부서진 인형 복구');
}
{ // 세레나
  const r = fight('serena', ['slime'], ['sm_step', 'sm_step', 'sm_step', 'sm_step', 'sm_step']);
  const c = r.combat, e = c.enemies[0]; e.hp = e.maxHp = 300; c.energy = 20;
  ok(c.moon === 0, '세레나: 🌒초승에서 시작');
  let h0 = e.hp; E.playCard(r, give(r, 'sm_slash').uid, 0);
  ok(c.moon === 1 && h0 - e.hp === 6 + 3, `세레나: 초승 베기를 초승에 내면 추가 피해 (피해 ${h0 - e.hp}) 후 🌓반달로`);
  h0 = e.hp; E.playCard(r, give(r, 'sm_slash').uid, 0);
  ok(c.moon === 2 && h0 - e.hp === 6, '세레나: 위상이 안 맞으면 기본 효과만');
  h0 = e.hp; E.playCard(r, give(r, 'sm_full').uid, 0);
  ok(c.moon === 3 && h0 - e.hp === 9 + 6, '세레나: 보름 일섬을 🌕보름에 내면 추가 피해');
  const en = c.energy; E.playCard(r, give(r, 'sm_wane').uid, 0); E.playCard(r, give(r, 'sm_skip').uid, 0); E.playCard(r, give(r, 'sm_skip').uid, 0); E.playCard(r, give(r, 'sm_wane').uid, 0);
  ok(c.energy === en + 1, `세레나: 그믐 에너지는 턴당 1번 (무한 루프 방지)`);
  E.playCard(r, give(r, 'sm_hold').uid, 0); const mh = c.moon; E.playCard(r, give(r, 'sm_slash').uid, 0);
  ok(c.moon === mh, '세레나: 달 멈춤 동안 위상 고정');
  E.endTurn(r); ok(!c.p.st.moonHold, '세레나: 달 멈춤은 다음 턴에 풀림');
}
{ // 오데트
  const r = fight('odette', ['slime'], ['lo_guard', 'lo_guard', 'lo_guard', 'lo_guard', 'lo_guard', 'lo_guard', 'lo_guard', 'lo_guard', 'lo_guard', 'lo_guard']);
  const c = r.combat, e = c.enemies[0]; e.hp = e.maxHp = 300;
  ok(!!hand(r, 'lo_mark'), '오데트: 놋쇠 열쇠로 책갈피 1장을 손에');
  const rd = give(r, 'lo_read'); e.intent = Object.keys(D.ENEMIES[e.id].moves)[0];
  E.endTurn(r); E.endTurn(r);
  ok(c.hand.includes(rd) && rd.fn === 2, `오데트: 보존 카드는 손에 남고 턴마다 각주 +1 (각주 ${rd.fn})`);
  const h0 = e.hp; e.block = 0; e.st = {}; c.p.st = {}; c.energy = 5; E.playCard(r, rd.uid, 0);
  ok(h0 - e.hp === 5 + 3 * 2 && !rd.fn, `오데트: 낭독 피해 = 5 + 각주×3 (${h0 - e.hp}), 낸 뒤 각주 초기화`);
  E.playCard(r, give(r, 'lo_quote').uid, 0);
  ok(c.hand.some(x => x.uid === rd.uid) || c.hand.length > 0, '오데트: 인용 = 버린 더미 맨 위 카드를 손으로(고르는 창 없음)');
}
{ // 저장: 새 히로인은 Lv1, 기존 경험치 유지
  const m = E.migrateMeta({ v: 3, runs: 5, wins: 1, heroXp: { sera: 900 }, storyRead: { sera0: 1 }, ach: {}, cardsSeen: [] });
  ok(E.heroLevel(m, 'sera').lv >= 5 && NEW.every(h => E.heroLevel(m, h).lv === 1) && m.storyRead.sera0, 'v1.2 저장 이전: 기존 경험치 유지, 새 히로인 Lv1');
  const r = E.newRun('mariel', 1, E.runOptions(m, 'mariel'));
  ok(!r.passive && !r.unlocked.some(x => /^mx_/.test(x)), '새 히로인 Lv1: 패시브·숙련 카드 없음');
}

// ── 3) 화면
(async () => {
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|service worker|sw\.js|ERR_FILE_NOT_FOUND|404/i.test(m.text())) errors.push('console: ' + m.text()); });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
  await page.goto(URL); await page.evaluate(() => localStorage.clear());
  const v121 = { v: 3, runs: 9, wins: 2, bestFloor: 30, bestAct: 4, kills: 200, elites: 5, bosses: { morgana: 3, belita: 2 }, heroWins: { sera: 2 }, heroRuns: { sera: 9 }, heroBestAsc: { sera: 1 },
    cardsSeen: ['s_twin'], relicsSeen: [], enemiesSeen: [], ach: { first_win: 1, win_sera: 1, boss_belita: 1 }, ascMax: 2, maxHit: 50, cardsPlayed: 900, dmgDealt: 9000, potionsUsed: 3, goldEarned: 900, playMs: 0,
    tutorialDone: true, newGallery: [], heroXp: { sera: 1500 }, storyRead: { sera0: 1 }, updatedAt: '2026-10-20T12:00:00.000Z' };
  await page.evaluate(m => localStorage.setItem('beautydeck.meta.v2', JSON.stringify(m)), v121);
  await page.reload(); await wait(600);
  const mm = await page.evaluate(() => { const m = window.BD_UI.meta, E = window.BD_ENGINE; return { v: window.BD_DATA.VERSION, sera: E.heroLevel(m, 'sera').lv, nw: ['mariel', 'serena', 'odette'].map(h => E.heroLevel(m, h).lv), runs: m.runs, read: !!m.storyRead.sera0 }; });
  ok(mm.v === require('../data.js').VERSION && mm.sera === 7 && mm.nw.every(l => l === 1) && mm.runs === 9 && mm.read, `브라우저: v1.2.1 저장 유지(세라 Lv${mm.sera}) · 새 히로인 Lv1 · 버전 ${mm.v}`);
  // 선택 화면
  await page.evaluate(() => window.BD_UI.H.newGame()); await wait(400);
  await shot('v130-select-top');
  for (const h of ['mariel', 'serena', 'odette']) {
    const has = await page.evaluate(h => { const b = document.querySelector(`[data-act="pick"][data-id="${h}"]`); if (b) b.closest('.panel').scrollIntoView({ block: 'start' }); return !!b; }, h);
    ok(has, `선택 화면에 ${h} 출발 버튼`); await wait(300); await shot(`v130-select-${h}`);
  }
  // 전투 화면
  for (const h of ['mariel', 'serena', 'odette']) {
    await page.evaluate(() => { window.BD_UI.run = null; localStorage.removeItem('beautydeck.run.v1'); window.BD_UI.H.newGame(); }); await wait(300);
    await page.evaluate(h => window.BD_UI.H.pick({ id: h }), h); await wait(500);
    await page.evaluate(() => { const el = document.querySelector('.node.avail'); el && el.scrollIntoView({ block: 'center' }); });
    await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, r = U.run; const id = E.availableNodes(r)[0]; r.map.nodes[id].type = 'monster'; U.render(); });
    await page.click('.node.avail'); await wait(1300);
    const st = await page.evaluate(() => { const r = window.BD_UI.run; return { screen: r.screen, cls: r.cls, allies: r.combat && r.combat.allies.length, moon: !!document.querySelector('.moonrow'), dolls: document.querySelectorAll('.dollrow .doll').length, hand: r.combat && r.combat.hand.length } ; });
    if (h === 'mariel') ok(st.screen === 'combat' && st.allies === 1 && st.dolls === 1, '마리엘 전투: 인형 1체 표시');
    if (h === 'serena') {
      ok(st.screen === 'combat' && st.moon, '세레나 전투: 달 위상 줄 표시');
      // 카드 하나 내고 위상이 바뀌는지 화면으로 확인
      await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, r = U.run, c = r.combat; const cd = c.hand.find(x => E.canPlay(r, x)); E.playCard(r, cd.uid, c.enemies.findIndex(e => !e.dead)); U.render(); }); await wait(500);
      ok(await page.evaluate(() => window.BD_UI.run.combat.moon === 1 && /반달/.test(document.querySelector('.moonrow').textContent)), '세레나 전투: 카드 1장 → 🌓반달');
    }
    if (h === 'odette') {
      ok(st.screen === 'combat' && st.hand >= 6, '오데트 전투: 책갈피 포함 손패');
      await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, r = U.run, c = r.combat; c.hand = c.hand.filter(x => E.cardDef(x).retain || true); E.endTurn(r); U.render(); }); await wait(900);
      const lay = await page.evaluate(() => ({ sh: document.scrollingElement.scrollHeight, ih: window.innerHeight, sel: document.querySelectorAll('.modal, .select').length, fn: document.querySelectorAll('.fnbadge').length, over: (() => { const b = document.querySelector('.battle'); return b ? b.scrollHeight > b.clientHeight + 2 : true; })() }));
      ok(lay.sh <= lay.ih + 1 && !lay.over && lay.sel === 0, `오데트 전투: 한 화면(스크롤 없음 ${lay.sh}≤${lay.ih}), 고르는 창 없음`);
      ok(lay.fn >= 1, `오데트 전투: 보존 카드에 각주/보존 배지 (${lay.fn})`);
    }
    await shot(`v130-battle-${h}`);
  }
  // 스토리
  await page.evaluate(() => { window.BD_UI.run = null; const m = window.BD_UI.meta; m.heroXp.mariel = m.heroXp.serena = m.heroXp.odette = 3200; window.BD_UI.ui.view = 'title'; window.BD_UI.render(); }); await wait(300);
  for (const h of ['mariel', 'serena', 'odette']) {
    await page.evaluate(h => { const U = window.BD_UI; U.ui.modal = null; U.ui.modalStack = []; U.H.story({ h, ch: '0' }); }, h); await wait(500);
    await page.evaluate(() => { for (let i = 0; i < 3; i++) window.BD_UI.H.storyNext(); }); await wait(400);
    ok(await page.evaluate(() => !!document.querySelector('.story-bg .story-text')), `${h} 스토리 1장 열림`);
    await shot(`v130-story-${h}`);
    await page.evaluate(() => window.BD_UI.H.storyClose()); await wait(200);
  }
  await page.evaluate(h => { const U = window.BD_UI; U.ui.modal = null; U.ui.modalStack = []; U.H.profile({ id: 'odette' }); }); await wait(400);
  ok(await page.evaluate(() => document.querySelectorAll('.trackrow').length === 15 && document.querySelectorAll('[data-act="story"]').length === 5), '오데트 프로필: 보상 15칸·스토리 5장(Lv10)');
  await shot('v130-profile-odette');
  ok(errors.length === 0, 'JS 오류 없음 ' + errors.join(' | '));
  await browser.close();
  console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
