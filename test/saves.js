// 저장 엣지 케이스 (node, DOM 없음): node test/saves.js
// 망가진·옛·부분 meta(백업 가져오기 포함) → migrateMeta 뒤 기록·업적·레벨·해금·오늘의 원정이 던지지 않는지, 정상 세이브는 그대로인지.
'use strict';
const E = require('../engine.js'), D = E.D;
let pass = 0, fail = 0;
const ok = (n, c, i) => { if (c) pass++; else { fail++; console.log('FAIL ' + n + (i ? '  ' + i : '')); } };
const J = x => JSON.parse(JSON.stringify(x));
const HEROES = Object.keys(D.STARTERS);
function finishedRun(h, won, daily) {
  const run = E.newRun(h, 12345, Object.assign({ asc: 0 }, daily ? { daily: E.dayKey(new Date(2026, 9, 26)) } : {}));
  run.over = true; run.won = won; run.floor = 5; run.stats.kills = 3; run.stats.bosses = won ? ['morgana'] : [];
  return run;
}
function useMeta(tag, m) {
  try {
    HEROES.forEach(h => { E.heroUnlocked(m, h); E.heroLevel(m, h); E.runOptions(m, h); });
    Object.keys(D.GALLERY).forEach(g => E.galleryUnlocked(m, g));
    E.unlockedCards(m);
    E.recordRun(m, finishedRun(HEROES[0], true));
    E.recordRun(m, finishedRun(HEROES[0], false, true));
    E.checkAchievements(m, null);
    JSON.stringify(m);
    ok(tag + ' 기록·업적·레벨 던지지 않음', true);
  } catch (e) { ok(tag + ' 기록·업적·레벨 던지지 않음', false, e.message); }
  ok(tag + ' 숫자 칸 유한', ['runs', 'wins', 'kills', 'elites', 'bestFloor', 'ascMax', 'maxHit', 'cardsPlayed', 'dmgDealt', 'potionsUsed', 'goldEarned', 'playMs'].every(k => Number.isFinite(m[k])),
    JSON.stringify(['runs', 'wins', 'kills', 'ascMax'].map(k => m[k])));
}
// 1) 정상: 새 meta, 왕복 동일
const fresh = E.migrateMeta(null);
ok('새 meta v3', fresh.v === 3);
ok('정상 meta 이관 멱등', JSON.stringify(E.migrateMeta(J(fresh))) === JSON.stringify(fresh));
useMeta('새 meta', E.migrateMeta(null));
// 2) 진짜 옛 세이브 모양: v1.1(heroXp 없음), v1.4(ownedPacks 있음), v1.5(daily)
const v11 = { v: 2, runs: 12, wins: 3, bestFloor: 20, kills: 90, bosses: { morgana: 2 }, heroWins: { sera: 2, luna: 1 }, heroRuns: { sera: 8, luna: 4 }, ach: { win_sera: 1 }, cardsSeen: ['strike'] };
const m11 = E.migrateMeta(J(v11));
ok('v1.1 → 경험치 추정', m11.heroXp.sera > 0 && m11.xpMigratedFrom === 'v1.1');
ok('v1.1 → 기록 유지', m11.runs === 12 && m11.wins === 3 && m11.bosses.morgana === 2 && m11.ach.win_sera === 1);
ok('v1.1 → 기본 팩 지급', m11.ownedPacks.includes('dlc-night-trio'));
useMeta('v1.1', m11);
const v15 = Object.assign(E.newMeta(), { runs: 5, heroXp: { sera: 700 }, daily: { key: '2026-10-25', best: null, tries: 1, done: false, won: false, wins: [] } });
const m15 = E.migrateMeta(J(v15));
ok('v1.5 → 경험치·daily 유지', m15.heroXp.sera === 700 && m15.daily.key === '2026-10-25');
ok('v1.5 이관 멱등', JSON.stringify(E.migrateMeta(J(m15))) === JSON.stringify(m15));
useMeta('v1.5', m15);
// 3) 망가진 값 (백업 파일 손편집·다른 앱 데이터)
const junk = [0, 'x', [], {}, { runs: '7', wins: null, kills: NaN, ascMax: 99 },
  { ach: null, bosses: null, heroWins: [], heroRuns: 'x', heroBestAsc: null },
  { cardsSeen: 'strike', relicsSeen: null, enemiesSeen: {}, newGallery: 'g' },
  { heroXp: { sera: 'abc', luna: -5 }, storyRead: [], ownedPacks: 'dlc-night-trio', skins: [] },
  { daily: 'today' }, { daily: { key: 5, wins: 'x' } }];
junk.forEach((o, i) => {
  let m; try { m = E.migrateMeta(J(o)); } catch (e) { ok(`망가진 #${i} 이관 던지지 않음`, false, e.message); return; }
  ok(`망가진 #${i} 이관 던지지 않음`, true);
  useMeta(`망가진 #${i}`, m);
  ok(`망가진 #${i} 이관 멱등`, JSON.stringify(E.migrateMeta(J(m))) === JSON.stringify(m));
});
// 4) 진행 중 런 JSON 왕복 → 같은 판 계속
for (const h of HEROES) {
  const run = E.newRun(h, 777, { asc: 2 }); const r2 = J(run);
  ok(`${h} 런 JSON 왕복 같은 지도`, JSON.stringify(r2.map) === JSON.stringify(run.map) && r2.v === 2 && r2.starter === h);
}
console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
