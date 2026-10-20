// v1.2 히로인 레벨·스토리·대사·이전 저장 이전·백업 왕복 검사 (헤드리스 크롬, 모바일 터치)
// 사용: NODE_PATH=/tmp/pt/node_modules URL=http://127.0.0.1:18793/ SHOTS=/tmp/shots node test/ui-mastery.js
'use strict';
const puppeteer = require('puppeteer-core');
const path = require('path');
const URL = process.env.URL || 'http://127.0.0.1:18793/';
const shots = process.env.SHOTS || path.join(__dirname, 'shots');
const [VW, VH] = (process.env.VP || '390x844').split('x').map(Number);
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|service worker|sw\.js/i.test(m.text())) errors.push('console: ' + m.text()); });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
  const tap = async sel => { const el = await page.$(sel); if (!el) { fails.push('no element ' + sel); console.log('FAIL no element ' + sel); return false; } try { await el.tap(); } catch (e) { await el.click(); } await wait(120); return true; };
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  // 1) v1.1 형식 기록(heroXp 없음)을 넣고 새로고침 → 이전
  const old = { v: 2, runs: 14, wins: 3, bestFloor: 30, bestAct: 4, kills: 312, elites: 11, bosses: { morgana: 4, belita: 3, celes: 3, nyx: 3 },
    heroWins: { sera: 2, luna: 1 }, heroRuns: { sera: 6, luna: 5, yuki: 3 }, heroBestAsc: { sera: 2, luna: 0 }, cardsSeen: ['s_twin', 'm_fire'], relicsSeen: ['red_ribbon'], enemiesSeen: ['slime'],
    ach: { first_win: 1, win_sera: 1, win_luna: 1, boss_morgana: 1, boss_belita: 1, boss_celes: 1, boss_nyx: 1, big_hit: 1, elite10: 1, asc1: 1, kills100: 1 },
    ascMax: 3, maxHit: 52, cardsPlayed: 1840, dmgDealt: 23110, potionsUsed: 20, goldEarned: 3000, playMs: 0, tutorialDone: true, newGallery: [], updatedAt: '2026-10-12T10:00:00.000Z' };
  await page.evaluate(m => localStorage.setItem('beautydeck.meta.v2', JSON.stringify(m)), old);
  await page.reload(); await wait(500);
  const mig = await page.evaluate(() => { const m = window.BD_UI.meta; const E = window.BD_ENGINE; return { runs: m.runs, wins: m.wins, ach: Object.keys(m.ach).length, ascMax: m.ascMax, xp: m.heroXp, lv: ['sera', 'luna', 'yuki', 'aria'].map(h => E.heroLevel(m, h).lv), from: m.xpMigratedFrom, cards: m.cardsSeen.length }; });
  console.log('migrated', JSON.stringify(mig));
  ok(mig.runs === 14 && mig.wins === 3 && mig.ach === 11 && mig.ascMax === 3 && mig.cards === 2, 'v1.1 기록 유지(원정·클리어·업적·승천·도감)');
  ok(mig.xp.sera === 760 && mig.xp.luna === 460 && mig.xp.yuki === 120 && mig.xp.aria === 0 && mig.from === 'v1.1', '히로인 경험치 이전 계산 (세라 760·루나 460·유키 120·아리아 0)');
  await shot('01-title');
  // 2) 히로인 목록 → 세라 프로필
  await tap('[data-act="heroes"]'); await wait(300); await shot('02-hero-list');
  await tap('[data-act="profile"][data-id="sera"]'); await wait(400); await shot('03-profile-sera');
  const prof = await page.evaluate(() => ({ rows: document.querySelectorAll('.trackrow').length, locked: document.querySelectorAll('.trackrow.locked').length, stories: document.querySelectorAll('[data-act="story"]').length }));
  ok(prof.rows === 15 && prof.locked > 0 && prof.stories === 2, `프로필: 보상 15칸(잠긴 칸 ${prof.locked}) · 열린 스토리 ${prof.stories}장`);
  await page.evaluate(() => document.querySelector('.modal').scrollTop = 9999); await wait(200); await shot('04-profile-sera-track');
  await page.evaluate(() => document.querySelector('.modal').scrollTop = 0);
  // 3) 스토리 1장
  await tap('[data-act="story"][data-ch="0"]'); await wait(400); await shot('05-story-ch1-a');
  for (let i = 0; i < 2; i++) await tap('.story-bg');
  await wait(300); await shot('06-story-ch1-b');
  const n = await page.evaluate(() => window.BD_DATA.STORIES.sera[0].lines.length);
  for (let i = 0; i < n; i++) { if (!(await page.$('.story-bg'))) break; await tap('.story-bg'); }
  ok(!(await page.$('.story-bg')) && await page.evaluate(() => !!window.BD_UI.meta.storyRead.sera0), '스토리 끝까지 넘기면 닫히고 읽음 표시');
  await tap('.modal [data-act="closeModal"]'); await wait(150);
  if (await page.$('.modal')) { await tap('.modal [data-act="closeModal"]'); await wait(150); }
  // 4) 히로인 선택 화면 (세라 Lv5: 시작 유물 선택 가능)
  await tap('[data-act="newGame"]'); await wait(300);
  await tap('[data-act="loadout"][data-h="sera"][data-k="relic"][data-v="alt"]'); await wait(200);
  await shot('07-pick');
  // 5) 원정 시작 → 엘리트 칸으로 바꿔서 들어가 대사 말풍선 확인
  await tap('[data-act="pick"][data-id="sera"]'); await wait(500);
  const st = await page.evaluate(() => { const r = window.BD_UI.run; return { relic: r.relics.slice(), passive: r.passive, unlocked: r.unlocked.filter(x => /^(sx|lx|yx|ax)_/.test(x)) }; });
  console.log('run start', JSON.stringify(st));
  ok(st.relic.includes('crimson_sheath') && st.passive === 'sera' && st.unlocked.includes('sx_vow') && st.unlocked.includes('sx_flurry'), '시작 유물 선택 · 패시브 · 숙련 카드가 원정에 반영');
  await page.evaluate(() => { const U = window.BD_UI, E = window.BD_ENGINE, r = U.run; const id = E.availableNodes(r)[0]; r.map.nodes[id].type = 'elite'; U.render(); });
  await wait(200);
  await page.evaluate(() => { const el = document.querySelector('.node.avail'); el.scrollIntoView({ block: 'center' }); });
  await tap('.node.avail'); await wait(1100);
  const bubble = await page.evaluate(() => { const b = document.querySelector('.herosay.live'); return b ? b.textContent : null; });
  ok(!!bubble, '엘리트 전투 시작 대사 말풍선: ' + bubble);
  await shot('08-elite-dialogue');
  // 6) 원정 종료 화면: 진행을 조금 만들고 포기 → 경험치 화면
  await page.evaluate(() => { const r = window.BD_UI.run; r.act = 2; r.floor = 4; r.stats.elites = 2; r.stats.bosses = ['morgana']; r.combat = null; r.screen = 'map'; window.BD_UI.render(); });
  await wait(300);
  await page.evaluate(() => window.BD_UI.H.abandonYes()); await wait(700);
  const xr = await page.evaluate(() => { const r = window.BD_UI.run; return r.xpResult && { gain: r.xpResult.gain, b: r.xpResult.before.lv, a: r.xpResult.after.lv, unl: r.xpResult.unlocks.map(u => u.kind) }; });
  console.log('xp result', JSON.stringify(xr));
  ok(xr && xr.gain === 14 * 10 + 2 * 25 + 60 && xr.a === 6 && xr.unl.includes('story') && xr.unl.includes('deck'), '실패한 원정도 경험치 지급(+250) · Lv5→6 · 스토리/덱 변형 해금');
  ok(await page.evaluate(() => !!document.querySelector('.xppanel')), '원정 종료 화면에 경험치 패널');
  await wait(1500); await shot('09-run-end-xp');
  await page.evaluate(() => document.querySelector('.scroll').scrollTop = 9999); await wait(200); await shot('10-run-end-xp-bottom');
  // 7) 백업 내보내기 → 초기화 → 가져오기 왕복
  const blobText = await page.evaluate(async () => {
    let captured = null; const orig = URL.createObjectURL;
    URL.createObjectURL = b => { captured = b; return orig.call(URL, b); };
    window.BD_UI.H.exportBackup(); URL.createObjectURL = orig;
    return captured ? await captured.text() : null;
  });
  const bk = JSON.parse(blobText);
  ok(bk.meta.heroXp && bk.meta.heroXp.sera === 1010 && bk.meta.storyRead.sera0 && bk.settings.loadout.sera.relic === 'alt' && bk.settings.talk === true, '백업 파일에 히로인 경험치·스토리 읽음·시작 선택·대사 설정 포함');
  await page.evaluate(() => { window.BD_UI.H.resetYes(); });
  ok(await page.evaluate(() => !(window.BD_UI.meta.heroXp.sera)), '초기화 후 경험치 0');
  await page.evaluate(b => { window.BD_UI.ui.pendingBackup = b; window.BD_UI.H.importConfirm(); }, bk); await wait(300);
  const rt = await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('beautydeck.meta.v2')); return { xp: m.heroXp, read: m.storyRead, runs: m.runs, ach: Object.keys(m.ach).length }; });
  ok(rt.xp.sera === 1010 && rt.xp.luna === 460 && rt.read.sera0 && rt.runs === 15 && rt.ach >= 11, '백업 가져오기 후 경험치·스토리·기록 복원');
  // 8) 대사 설정 끄기
  await tap('[data-act="settings"]'); await wait(200); await shot('11-settings');
  ok(await page.evaluate(() => !!document.querySelector('[data-k="talk"]')), '설정에 히로인 대사 토글');
  ok(errors.length === 0, 'JS 오류 없음 ' + errors.join(' | '));
  await browser.close();
  console.log(fails.length ? `\nFAILED ${fails.length}` : '\nALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
