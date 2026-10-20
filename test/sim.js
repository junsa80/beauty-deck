// 헤드리스 시뮬레이션 테스트: node test/sim.js [런 수]
// 1) 무작위 봇: 아무 행동이나 막 눌러서 크래시/무한루프/상태 깨짐을 찾음
// 2) 똑똑한 봇: 간단한 휴리스틱으로 플레이해서 밸런스(승률)를 대략 확인
'use strict';
const E = require('../engine.js');
const D = E.D;
const N = parseInt(process.argv[2] || '300', 10);

function assert(cond, msg, run) { if (!cond) { const err = new Error(msg); err.run = run; throw err; } }

function checkInvariants(run) {
  assert(Number.isFinite(run.hp) && run.hp >= 0 && run.hp <= run.maxHp, 'hp out of range ' + run.hp + '/' + run.maxHp, run);
  assert(Number.isFinite(run.gold) && run.gold >= 0, 'gold ' + run.gold, run);
  assert(run.potions.length === 3 || run.potions.length === 5, 'potion slots', run);
  const c = run.combat;
  if (c && run.screen === 'combat') {
    assert(c.hand.length <= 10, 'hand > 10', run);
    assert(c.energy >= 0 && Number.isFinite(c.energy), 'energy ' + c.energy, run);
    const seen = new Set();
    for (const pile of [c.draw, c.hand, c.disc, c.exh]) for (const cd of pile) { assert(!seen.has(cd.uid), 'dup card uid ' + cd.uid, run); seen.add(cd.uid); assert(D.CARDS[cd.id], 'bad card', run); }
    for (const e of c.enemies) {
      assert(Number.isFinite(e.hp) && e.hp >= 0 && e.hp <= e.maxHp, 'enemy hp ' + e.hp, run);
      assert(Number.isFinite(e.block) && e.block >= 0, 'enemy block', run);
      if (!e.dead) assert(D.ENEMIES[e.id].moves[e.intent], 'enemy has no intent ' + e.id + ' ' + e.intent, run);
      for (const k in e.st) assert(Number.isFinite(e.st[k]), 'enemy status NaN ' + k, run);
    }
    assert(c.enemies.length <= 4, 'too many enemies', run);
    for (const k in c.p.st) assert(Number.isFinite(c.p.st[k]), 'player status NaN ' + k, run);
    assert(c.allies.length <= 3 && c.allies.every(d => Number.isFinite(d.hp) && d.hp > 0 && d.hp <= d.maxHp), 'doll state', run);
    assert(c.moon >= 0 && c.moon <= 3, 'moon phase ' + c.moon, run);
    for (const cd of c.hand) assert(cd.fn == null || (Number.isFinite(cd.fn) && cd.fn > 0), 'footnote', run);
    // 설명문 생성이 깨지지 않는지
    for (const cd of c.hand) { const s = E.describe(E.cardDef(cd), { p: c.p }); assert(typeof s === 'string' && !s.includes('undefined') && !s.includes('NaN'), 'bad desc ' + cd.id + ': ' + s, run); }
    for (const e of c.enemies) if (!e.dead) E.intentView(run, e);
  }
  JSON.parse(JSON.stringify(run)); // 저장 가능해야 함
}

// ───── 무작위 봇 ─────
function randomStep(run, R) {
  const r = () => R();
  const pickI = n => Math.floor(r() * n);
  switch (run.screen) {
    case 'map': { const a = E.availableNodes(run); return E.chooseNode(run, a[pickI(a.length)]); }
    case 'combat': {
      const c = run.combat;
      const roll = r();
      if (roll < 0.05 && run.potions.some(p => p)) { const s = run.potions.findIndex(p => p); return E.usePotion(run, s, pickI(c.enemies.length)); }
      if (roll < 0.15 || !c.hand.length) return E.endTurn(run);
      const cd = c.hand[pickI(c.hand.length)];
      const res = E.playCard(run, cd.uid, pickI(c.enemies.length));
      if (!res.ok && !res.needTarget) return E.endTurn(run);
      return res;
    }
    case 'reward': {
      const rw = run.rewards; const roll = r();
      if (rw.bossRelics && !rw.bossRelicTaken) return E.takeBossRelic(run, pickI(rw.bossRelics.length));
      if (roll < 0.3 && !rw.cardTaken) return E.takeCard(run, pickI(rw.cards.length));
      if (roll < 0.4 && rw.potion && !rw.potionTaken) E.takePotion(run);
      if (roll < 0.5) return E.takeGold(run);
      return E.leaveReward(run);
    }
    case 'rest': return r() < 0.5 ? E.restHeal(run) : (E.restSmith(run).ok ? { ok: true } : E.restHeal(run));
    case 'select': { if (r() < 0.2) return E.cancelSelect(run); const s = E.selectableCards(run); if (!s.length) return E.cancelSelect(run); return E.selectCard(run, s[pickI(s.length)].uid); }
    case 'shop': {
      const roll = r();
      if (roll < 0.2) return E.buy(run, 'cards', pickI(5));
      if (roll < 0.3) return E.buy(run, 'relics', pickI(3));
      if (roll < 0.4) return E.buy(run, 'potions', pickI(3));
      if (roll < 0.5) return E.shopRemove(run);
      return E.leaveShop(run);
    }
    case 'treasure': return r() < 0.5 ? E.openChest(run) : E.leaveTreasure(run);
    case 'event': {
      if (run.event.done) return E.leaveEvent(run);
      const opts = D.EVENTS[run.event.id].options;
      const res = E.chooseEvent(run, pickI(opts.length));
      if (!res.ok) { const i = opts.findIndex(o => E.eventOptionOk(run, o)); return E.chooseEvent(run, i); }
      return res;
    }
  }
  throw new Error('unknown screen ' + run.screen);
}

// ───── 똑똑한 봇 ─────
// "괜찮은 첫 플레이"를 흉내: 예고 피해만큼 막고, 남는 에너지로 때리고, 조합 맞는 카드를 고른다.
function cardScore(run, cd, incoming) {
  const c = run.combat, d = E.cardDef(cd), P = c.p;
  if (d.unplayable || !E.canPlay(run, cd)) return -1;
  const al = E.aliveEnemies(run);
  let s = 0;
  const needBlock = Math.max(0, incoming - P.block - c.allies.reduce((a, x) => a + (x === c.allies[0] ? x.hp : 0), 0));
  const atk = (v, o) => E.calcAttack(P, null, v, o);
  const fn = cd.fn || 0;
  const effs = d.effects.map(e => e.fn ? Object.assign({}, e, { v: e.v + e.fn * fn }) : e);
  if (d.moon && run.cls === 'moon' && c.moon === d.moon.p) effs.push(...d.moon.effects);
  // 오데트: 각주가 적은 보존 카드는 아껴 둠(다른 낼 카드가 있으면)
  if (d.retain && d.effects.some(e => e.fn) && fn < 2 && c.turn > 0 && needBlock === 0) s -= 8;
  for (const e of effs) {
    switch (e.t) {
      case 'doll': s += c.allies.length < 3 ? 8 + e.hp * 1.2 + e.atk * 3 : e.hp; break;
      case 'dollHp': s += c.allies.length * e.v; break;
      case 'dmgPerDoll': s += atk(e.v) * (c.allies.length + 1); break;
      case 'blockPerDoll': { const v = (e.base || 0) + e.v * c.allies.length; s += needBlock > 0 ? Math.min(needBlock, v) * 1.6 + 1 : 1; break; }
      case 'breakDoll': { const dl = c.allies[c.allies.length - 1]; if (!dl) { s -= 20; break; } s += (e.draw || 0) * 6 + (e.energy || 0) * 12 + (e.boom ? dl.maxHp * e.boom * al.length : 0) - (dl.hp + dl.atk * 3); break; }
      case 'dollAct': s += c.allies.reduce((a, x) => a + x.atk + (P.st.dollCraft || 0), 0) * (e.n || 1); break;
      case 'reviveDolls': s += c.broken.length * 10; break;
      case 'moonShift': s += 3; break;
      case 'moonSet': s += 6; break;
      case 'dmgMoon': s += atk(e.v) * (c.moonMoves + 1); break;
      case 'fnAll': s += c.hand.filter(x => E.cardDef(x).retain).length * 4 * e.v; break;
      case 'blockFn': { const v = (e.base || 0) + e.m * c.hand.reduce((a, x) => a + (x.fn || 0), 0); s += needBlock > 0 ? Math.min(needBlock, v) * 1.6 + 1 : 1; break; }
      case 'recall': s += c.disc.length ? 6 : 0; break;
      case 'upgradeRetain': s += 5; break;
      case 'dmg': s += atk(e.v, { strMult: e.strMult, shiv: cd.id === 'shiv' }) * (e.hitsFrom === 'atk' ? c.atkThisTurn : e.hitsFrom === 'skill' ? c.skillThisTurn : (e.hits || 1)) + (e.bonusIfWeak && al.some(x => x.st.weak) ? e.bonusIfWeak : 0); break;
      case 'dmgAll': s += atk(e.v) * al.length * (e.hits === 'X' ? c.energy : (e.hits || 1)) * 1.1; break;
      case 'dmgRandom': s += atk(e.v) * e.hits; break;
      case 'dmgBlock': s += P.block; break;
      case 'dmgBlockAll': s += P.block * al.length; break;
      case 'dmgPoison': s += Math.max(...al.map(x => x.st.poison || 0)); break;
      case 'dmgAllThorns': s += (P.st.thorns || 0) * e.m * al.length; break;
      case 'exhaustBurns': s += c.hand.filter(x => x.id === 'burn').length * e.v * al.length; break;
      case 'block': s += needBlock > 0 ? Math.min(needBlock, e.v + (P.st.dex || 0)) * 1.6 + 1 : 1; break;
      case 'blockDex': s += needBlock > 0 ? Math.min(needBlock, (P.st.dex || 0) * e.m) * 1.6 : 0; break;
      case 'doubleBlock': s += needBlock > 0 ? Math.min(needBlock, P.block) * 1.5 : 0; break;
      case 'draw': s += 6 * e.v; break;
      case 'energy': s += 12 * e.v; break;
      case 'energyIfAtk': s += c.atkThisTurn + 1 >= e.n ? 10 : 0; break;
      case 'apply': s += e.s === 'poison' ? e.v * 2 : 9 * e.v; break;
      case 'applyAll': s += (e.s === 'poison' ? e.v * 2 : 7 * e.v) * al.length; break;
      case 'self': s += D.STATUS[e.s].power ? (c.turn <= 3 ? 45 : 20) : e.s === 'regen' ? e.v * 2 : 15 * e.v; break;
      case 'doubleStr': s += (P.st.str || 0) * 12; break;
      case 'heal': s += Math.min(e.v, run.maxHp - run.hp) * 1.5; break;
      case 'loseHp': s -= run.hp < 20 ? 30 : e.v; break;
      case 'cleanse': s += Object.keys(P.st).filter(k => D.STATUS[k].type === 'debuff').length * 6; break;
      case 'add': s += e.to === 'hand' ? 8 * e.n : -3; break;
      case 'upgradeHand': s += 4; break;
      case 'multiplyPoison': s += Math.max(...al.map(x => x.st.poison || 0)) * (e.v - 1); break;
    }
  }
  if (d.type === 'skill' && al.some(e => e.st.enrage) && needBlock < 10) s -= 15;
  // 막타 보너스: 이 카드로 적을 끝낼 수 있으면 우선
  const one = d.effects.find(e => e.t === 'dmg' && !e.hitsFrom);
  if (one && al.length) { const low = Math.min(...al.map(x => x.hp + x.block)); if (atk(one.v, { strMult: one.strMult }) * (one.hits || 1) >= low) s += 60; }
  const cost = d.cost === -1 ? Math.max(1, c.energy) : d.cost;
  return s / Math.max(0.6, cost);
}
function smartTarget(run, cd) {
  const c = run.combat, d = E.cardDef(cd);
  const al = c.enemies.map((e, i) => ({ e, i })).filter(x => !x.e.dead);
  if (d.effects.some(e => e.t === 'multiplyPoison' || e.t === 'dmgPoison')) return al.sort((a, b) => (b.e.st.poison || 0) - (a.e.st.poison || 0))[0].i;
  return al.sort((a, b) => (a.e.hp + a.e.block) - (b.e.hp + b.e.block))[0].i;
}
const RANK = { legend: 4, rare: 3, uncommon: 2, common: 1, starter: 0 };
function rewardValue(run, id) {
  const d = D.CARDS[id], syn = E.synergy(run, id);
  return RANK[d.rarity] + (d.type === 'power' ? 0.5 : 0) + Math.min(2, syn.score * 0.25);
}
const BOSS_PREF = ['b_hourglass', 'b_giant', 'b_phoenix', 'b_crown', 'b_mask', 'b_ember'];
function smartStep(run, R) {
  switch (run.screen) {
    case 'map': {
      const a = E.availableNodes(run).map(id => run.map.nodes[id]);
      const hpr = run.hp / run.maxHp;
      const score = n => ({ monster: 5, elite: hpr > 0.7 ? 7 : -5, rest: hpr < 0.5 ? 9 : 2, shop: run.gold > 150 ? 8 : 1, event: 4, treasure: 9, boss: 0 }[n.type] + R());
      a.sort((x, y) => score(y) - score(x));
      return E.chooseNode(run, a[0].id);
    }
    case 'combat': {
      const c = run.combat;
      const kind = c.kind;
      const slot = run.potions.findIndex(p => p && !D.POTIONS[p].passive);
      if (slot >= 0 && c.turn === 1 && c.energy > 0 && (kind !== 'monster' || run.hp < run.maxHp * 0.3)) {
        const p = D.POTIONS[run.potions[slot]];
        const ti = E.aliveEnemies(run).length ? c.enemies.indexOf(E.aliveEnemies(run)[0]) : 0;
        if (!(p.effects[0] && p.effects[0].t === 'heal' && run.hp > run.maxHp - 15)) return E.usePotion(run, slot, ti);
      }
      const incoming = E.incomingDamage(run);
      if (c.cardsThisTurn >= 40) return E.endTurn(run); // 0코스트 드로우 순환 방지(봇 전용)
      let best = null, bs = 0;
      for (const cd of c.hand) { const s = cardScore(run, cd, incoming); if (s > bs) { bs = s; best = cd; } }
      if (!best) return E.endTurn(run);
      const res = E.playCard(run, best.uid, smartTarget(run, best));
      if (!res.ok) return E.endTurn(run);
      return res;
    }
    case 'reward': {
      const rw = run.rewards;
      if (rw.bossRelics && !rw.bossRelicTaken) { const order = rw.bossRelics.slice().sort((a, b) => BOSS_PREF.indexOf(a) - BOSS_PREF.indexOf(b)); return E.takeBossRelic(run, rw.bossRelics.indexOf(order[0])); }
      if (rw.potion && !rw.potionTaken && run.potions.includes(null)) E.takePotion(run);
      if (!rw.cardTaken) {
        const cs = rw.cards.map((c, i) => ({ i, v: rewardValue(run, c.id) })).sort((a, b) => b.v - a.v);
        if (run.deck.length < 24 || cs[0].v >= 2.5) E.takeCard(run, cs[0].i); else E.skipCard(run);
      }
      return E.leaveReward(run);
    }
    case 'rest': return run.hp < run.maxHp * 0.55 && !E.hasRelic(run, 'b_ember') ? E.restHeal(run) : (E.restSmith(run).ok ? { ok: true } : (E.restHeal(run).ok ? { ok: true } : (run.screen = 'map', { ok: true })));
    case 'select': {
      const s = E.selectableCards(run);
      if (!s.length) return E.cancelSelect(run);
      if (run.pending.mode === 'remove') {
        const bad = s.find(c => D.CARDS[c.id].cls === 'status') || s.find(c => /strike|bolt|slash/.test(c.id)) || s.find(c => /guard|ward|dodge/.test(c.id)) || s[0];
        return E.selectCard(run, bad.uid);
      }
      const good = s.slice().sort((a, b) => (RANK[D.CARDS[b.id].rarity] || 0) + (D.CARDS[b.id].cost >= 2 ? 1 : 0) - (RANK[D.CARDS[a.id].rarity] || 0) - (D.CARDS[a.id].cost >= 2 ? 1 : 0))[0];
      return E.selectCard(run, good.uid);
    }
    case 'shop': {
      const s = run.shop;
      for (let i = 0; i < s.relics.length; i++) if (!s.relics[i].sold && run.gold >= s.relics[i].price) return E.buy(run, 'relics', i);
      if (!s.removeUsed && run.gold >= E.removePrice(run)) return E.shopRemove(run);
      for (let i = 0; i < s.cards.length; i++) { const it = s.cards[i]; if (!it.sold && run.gold >= it.price && rewardValue(run, it.id) >= 2.5) return E.buy(run, 'cards', i); }
      return E.leaveShop(run);
    }
    case 'treasure': return E.leaveTreasure(run);
    case 'event': {
      if (run.event.done) return E.leaveEvent(run);
      const opts = D.EVENTS[run.event.id].options;
      let i = opts.findIndex(o => E.eventOptionOk(run, o) && !(o.fx && o.fx.hp && run.hp + o.fx.hp < 20) && !(o.chance && run.hp < 25) && !(o.fx && o.fx.fight && run.hp < run.maxHp * 0.7));
      if (i < 0) i = opts.length - 1;
      return E.chooseEvent(run, i);
    }
  }
  throw new Error('unknown screen ' + run.screen);
}

function mkR(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function playRun(starter, seed, stepFn) {
  // MASTERY=1: 히로인 레벨 10(카드 3장·패시브·물약) · MASTERY=relic|deck: 그 시작 옵션까지
  let opts = { asc: +(process.env.ASC || 0) };
  if (process.env.MASTERY) {
    const m = E.newMeta(); m.heroXp[starter] = 99999;
    const ch = { relic: /relic|all/.test(process.env.MASTERY) ? 'alt' : 'base', deck: /deck|all/.test(process.env.MASTERY) ? 'alt' : 'base' };
    opts = Object.assign(E.runOptions(m, starter, ch), opts);
    if (process.env.NOPASSIVE) opts.passive = false;
    if (process.env.NOPOTION) opts.potion = false;
  }
  const run = E.newRun(starter, seed, opts);
  const R = mkR(seed * 7 + 3);
  let steps = 0, fights = 0, maxTurns = 0, lastScreen = null;
  while (!run.over) {
    if (++steps > 60000) throw Object.assign(new Error('softlock: too many steps on ' + run.screen), { run });
    const before = run.screen;
    stepFn(run, R);
    run.fx.length = 0;
    if (before !== 'combat' && run.screen === 'combat') fights++;
    if (run.combat && run.combat.turn > 150) throw Object.assign(new Error('softlock: combat > 150 turns vs ' + run.combat.enemies.map(e => e.id)), { run });
    if (run.combat) maxTurns = Math.max(maxTurns, run.combat.turn);
    checkInvariants(run);
    // 저장→복원 왕복 후에도 계속 진행되는지 (가끔)
    if (steps % 97 === 0) { const copy = JSON.parse(JSON.stringify(run)); Object.keys(run).forEach(k => delete run[k]); Object.assign(run, copy); }
    lastScreen = run.screen;
  }
  return { won: run.won, floor: (run.act - 1) * 11 + run.floor, act: run.act, fights, hp: run.hp, deck: run.deck.length, steps, killer: run.combat && run.combat.enemies.filter(e => !e.dead).map(e => e.id).join('+') };
}

function batch(name, stepFn, n) {
  console.log(`\n== ${name}: ${n} runs per heroine ==`);
  const summary = {};
  let errors = 0;
  for (const s of Object.keys(D.STARTERS).filter(h => !process.env.HEROES || process.env.HEROES.split(',').includes(h))) {
    let wins = 0, floors = 0, deaths = {}, acts = [0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      try {
        const r = playRun(s, 1000 + i, stepFn);
        if (r.won) wins++;
        floors += r.floor; acts[r.act]++;
        if (!r.won) deaths[r.killer || 'event'] = (deaths[r.killer || 'event'] || 0) + 1;
      } catch (e) {
        errors++;
        if (errors <= 5) { console.error(`ERROR [${s} seed ${1000 + i}]`, e.message); console.error(e.stack.split('\n').slice(1, 4).join('\n')); }
      }
    }
    const topDeaths = Object.entries(deaths).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(', ');
    summary[s] = { winRate: (wins / n * 100).toFixed(1) + '%', avgFloor: (floors / n).toFixed(1) };
    console.log(`${s.padEnd(5)} win ${summary[s].winRate.padStart(6)}  avg prog ${summary[s].avgFloor}  ended in act1-4: ${acts.slice(1).join('/')}  deaths: ${topDeaths}`);
  }
  return errors;
}

let errs = 0;
if (!process.env.SMART_ONLY) errs += batch('random bot (crash/softlock hunt)', randomStep, N);
errs += batch('smart bot (balance)', smartStep, N);
console.log(errs ? `\nFAILED with ${errs} errors` : '\nALL OK: no crashes, softlocks, or invariant violations');
process.exit(errs ? 1 : 0);
