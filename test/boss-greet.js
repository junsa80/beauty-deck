// v1.3.3: 보스 4명 × 히로인 7명 인사 말풍선이 그 조합의 문장인지. 저장 형식은 안 봄.
// 사용: node test/boss-greet.js
'use strict';
const D = require('../data.js');
const E = require('../engine.js');
const heroes = ['sera', 'luna', 'yuki', 'aria', 'mariel', 'serena', 'odette'];
const bosses = ['morgana', 'belita', 'celes', 'nyx'];
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'PASS ' : 'FAIL ') + m); };
for (const b of bosses) {
  const g = D.ENEMIES[b].greet || {};
  ok(heroes.every(h => typeof g[h] === 'string' && g[h].length >= 8 && g[h].length <= 42), b + ' greet 7명·길이');
  const uniq = new Set(heroes.map(h => g[h]));
  ok(uniq.size === heroes.length, b + ' 히로인마다 문장이 다름');
}
for (const h of heroes) {
  const t = D.LINES[h].bossTo || {};
  ok(bosses.every(b => typeof t[b] === 'string' && t[b].length >= 6), h + ' bossTo 4보스');
}
let n = 0;
for (const h of heroes) for (const b of bosses) {
  const run = E.newRun(h, 7);
  E.startCombat(run, [b], 'boss');
  const say = run.fx.find(f => f.k === 'say' && f.text === D.ENEMIES[b].greet[h]);
  if (!say) fails.push(h + '+' + b + ' 시작 대사가 greet와 다름: ' + JSON.stringify(run.fx.filter(f => f.k === 'say')));
  else n++;
}
ok(n === 28, '시작 연출 28조합이 greet 문장 ' + n);
const elite = E.newRun('sera', 3);
E.startCombat(elite, ['isabel'], 'elite');
ok(!elite.fx.some(f => f.k === 'say' && /리본|제자|새벽별/.test(f.text || '')), '엘리트는 보스 greet를 안 씀');
ok(D.VERSION === '1.4.0', '버전 ' + D.VERSION);
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('boss-greet OK');
