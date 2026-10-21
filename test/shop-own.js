// 받기 = 보유. 플레이 보상(레벨·스토리·추가 카드·칭호·금테·업적)은 열리지 않는다.
const D = require('../data.js');
const E = require('../engine.js');
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('FAIL', m); } else console.log('ok', m); };
const snap = m => JSON.stringify({ xp: m.heroXp, story: m.storyRead, ach: m.ach, wins: m.heroWins, runs: m.heroRuns });
const now = Date.parse('2026-10-21T12:00:00+01:00');

const fresh = E.newMeta();
ok(!E.ownsPack(fresh, 'dlc-night-trio') && !E.heroUnlocked(fresh, 'mariel'), '새 기록: 세 사람 없음');
ok(E.heroUnlocked(fresh, 'sera') && !E.heroUnlocked(fresh, 'aria'), '세라만 기본, 아리아는 보스 전');
const before = snap(fresh);
ok(E.claimPack(fresh, 'dlc-night-trio', now).ok, '캐릭터 받기');
ok(snap(fresh) === before, '경험치·스토리·업적·승수 그대로');
ok(E.heroUnlocked(fresh, 'mariel') && E.heroLevel(fresh, 'mariel').lv === 1, '고를 수 있고 레벨 1');
ok(!E.masteryHas(fresh, 'mariel', 'story', 0) && !E.masteryHas(fresh, 'mariel', 'card'), '스토리 1장·추가 카드 잠김');
ok(!E.masteryHas(fresh, 'mariel', 'deck') && !E.masteryHas(fresh, 'mariel', 'frame') && !E.heroTitle(fresh, 'mariel'), '덱 변형·금테·칭호 잠김');
ok(!E.heroUnlocked(fresh, 'aria'), '캐릭터 상품이 아리아를 열지 않음');

const look = E.newMeta();
ok(E.claimPack(look, 'look-portrait-trim', now).ok && E.skinFor(look, 'sera').id === 'trim-sera', '장식은 보유라 바로 켜짐');
ok(E.heroLevel(look, 'sera').lv === 1 && !E.masteryHas(look, 'sera', 'frame'), '장식이 레벨 금테를 대신 열지 않음');
ok(!E.heroUnlocked(look, 'aria'), '장식을 받아도 아리아 합류는 잠김');

const old = E.migrateMeta({ v: 3, runs: 2, heroXp: { mariel: 100 } });
ok(E.ownsPack(old, 'dlc-night-trio') && old.heroXp.mariel === 100, '예전 기록은 보유만 이어 받고 경험치는 유지');
ok(!E.ownsPack(E.migrateMeta(null), 'dlc-night-trio'), '빈 기록은 자동 보유 아님');
ok(E.claimPack(E.newMeta(), 'dlc-night-trio', Date.parse('2099-01-01')).ok, '공개 버전은 기한이 없어 나중에도 받기 가능');
const late = E.newMeta();
D.SHOP.offerUntil = '2020-01-01T00:00:00Z';
ok(!E.claimPack(late, 'dlc-night-trio', Date.parse('2026-10-21')).ok && !E.ownsPack(late, 'dlc-night-trio'), '기한을 넣으면 그 뒤에 안 열림');
D.SHOP.offerUntil = null;
if (fail) process.exit(1);
console.log('shop-own: all ok');
