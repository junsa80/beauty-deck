/* 미녀 덱: 밤의 여왕 — 게임 엔진 (DOM 없음, 브라우저/Node 공용) v1.0
 * 모든 게임 상태는 run 객체 하나에 들어 있고, JSON으로 그대로 저장/복원됩니다.
 * UI는 run.screen 값을 보고 화면을 그리며, run.fx 배열(연출 이벤트)을 소비합니다.
 * 영구 기록(meta)은 newMeta/recordRun/checkAchievements로 관리합니다.
 */
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./data.js') : root.BD_DATA;

  const WIDTH = 5;
  const HAND_MAX = 10;
  const BASE_ENERGY = 3;
  const BASE_DRAW = 5;
  const LAST_ACT = 4;

  // ───────── 난수 (시드 고정, 저장 가능) ─────────
  function rnd(run) {
    run.rng = (run.rng + 0x6D2B79F5) | 0;
    let t = run.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ri = (run, a, b) => a + Math.floor(rnd(run) * (b - a + 1));
  const pick = (run, arr) => arr[Math.floor(rnd(run) * arr.length)];
  function shuffle(run, arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd(run) * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
  function weighted(run, w) {
    const keys = Object.keys(w).filter(k => w[k] > 0);
    let total = keys.reduce((s, k) => s + w[k], 0), r = rnd(run) * total;
    for (const k of keys) { r -= w[k]; if (r < 0) return k; }
    return keys[keys.length - 1];
  }

  // ───────── 카드 ─────────
  const defCache = {};
  function cardDef(card) {
    const id = typeof card === 'string' ? card : card.id;
    const up = typeof card === 'string' ? false : !!card.up;
    const key = id + (up ? '+' : '');
    if (defCache[key]) return defCache[key];
    const base = D.CARDS[id];
    if (!base) throw new Error('Unknown card ' + id);
    const d = up && base.up ? Object.assign({}, base, base.up, { name: base.name + '+', upgraded: true, id }) : Object.assign({}, base, { id, upgraded: false });
    defCache[key] = d;
    return d;
  }
  const canUpgrade = card => !card.up && !!(D.CARDS[card.id] && D.CARDS[card.id].up);
  function newCard(run, id, up) { return { uid: run.nextUid++, id, up: !!up }; }
  function needsTarget(def) { const T = ['dmg', 'apply', 'multiplyPoison', 'rawDmg', 'dmgBlock', 'dmgPoison', 'dmgPerDoll', 'dmgMoon']; return def.effects.concat(def.moon ? def.moon.effects : []).some(e => T.includes(e.t)); }
  const isCollectible = c => !['token', 'status'].includes(c.cls);

  // ───────── 런 생성 ─────────
  function newRun(starterId, seed, opts) {
    opts = opts || {};
    const s = D.STARTERS[starterId];
    if (!s) throw new Error('Unknown starter ' + starterId);
    seed = (seed == null ? Math.floor(Math.random() * 2 ** 31) : seed) | 0;
    const asc = Math.max(0, Math.min(10, opts.asc | 0));
    const run = {
      v: 2, seed, rng: seed, nextUid: 1, starter: starterId, cls: s.cls, asc,
      unlocked: (opts.unlocked || []).slice(), passive: opts.passive ? starterId : null, loadout: { relic: opts.relic || s.relic, deck: opts.deck ? 'alt' : 'base' },
      hp: s.hp, maxHp: s.hp, gold: s.gold, deck: [], relics: [], potions: [null, null, null],
      act: 1, floor: 0, totalFloor: 0, pos: null, visited: [], map: null, screen: 'map', over: false, won: false,
      combat: null, rewards: null, shop: null, event: null, treasure: null, pending: null,
      removeCost: 75, lastEnc: null, eventsSeen: [], cardsSeen: [], enemiesSeen: [], relicsSeen: [], phoenixUsed: false,
      stats: { kills: 0, elites: 0, cardsPlayed: 0, dmgDealt: 0, turns: 0, maxHit: 0, maxCardsTurn: 0, maxPoison: 0, maxBlock: 0,
               potionsUsed: 0, bosses: [], flawlessElite: false, goldEarned: 0, maxGold: 0, maxRelics: 0 },
      fx: []
    };
    if (asc >= 6) { run.maxHp -= 6; run.hp = run.maxHp; }
    (opts.deck || s.deck).forEach(id => run.deck.push(newCard(run, id)));
    if (asc >= 7) run.deck.push(newCard(run, 'wound'));
    run.map = genMap(run, 1);
    addRelic(run, opts.relic || s.relic);
    if (opts.potion) addPotion(run, randomPotion(run));
    return run;
  }

  // ───────── 지도 ─────────
  function genMap(run, act) {
    const FL = D.ACTS[act].floors;
    const nodes = {};
    const boss = { id: 'boss', floor: FL, col: 2, type: 'boss', next: [], prev: [] };
    if (FL === 1) { // 종막: 휴식 하나 → 최종 보스
      nodes['0-2'] = { id: '0-2', floor: 0, col: 2, type: 'rest', next: ['boss'], prev: [] };
      boss.prev.push('0-2'); nodes.boss = boss;
      return { nodes, floors: FL, width: WIDTH, act };
    }
    const edges = [];
    const get = (f, c) => nodes[f + '-' + c] || (nodes[f + '-' + c] = { id: f + '-' + c, floor: f, col: c, type: null, next: [], prev: [] });
    const starts = [];
    for (let p = 0; p < 5; p++) {
      let c = ri(run, 0, WIDTH - 1);
      if (p === 1) { let g = 0; while (c === starts[0] && g++ < 20) c = ri(run, 0, WIDTH - 1); }
      starts.push(c);
      for (let f = 0; f < FL; f++) {
        const n = get(f, c);
        if (f === FL - 1) break;
        const opts = shuffle(run, [-1, 0, 1].map(d => c + d).filter(x => x >= 0 && x < WIDTH));
        let nc = c;
        for (const o of opts) {
          const cross = edges.some(([ef, a, b]) => ef === f && (a - c) * (b - o) < 0);
          if (!cross) { nc = o; break; }
        }
        const nxt = get(f + 1, nc);
        if (!n.next.includes(nxt.id)) { n.next.push(nxt.id); nxt.prev.push(n.id); edges.push([f, c, nc]); }
        c = nc;
      }
    }
    nodes.boss = boss;
    const order = Object.values(nodes).filter(n => n.id !== 'boss').sort((a, b) => a.floor - b.floor);
    const treasureFloor = Math.floor(FL / 2);
    const eliteFrom = act === 1 ? 3 : 2;
    for (const n of order) {
      if (n.floor === 0) n.type = 'monster';
      else if (n.floor === treasureFloor) n.type = 'treasure';
      else if (n.floor === FL - 1) n.type = 'rest';
      else {
        const w = { monster: 45, event: 22, elite: n.floor >= eliteFrom ? (run.asc >= 1 ? 13 : 11) : 0, rest: n.floor >= 3 && n.floor !== FL - 2 ? 11 : 0, shop: n.floor >= 2 ? 9 : 0 };
        let t, tries = 0;
        do { t = weighted(run, w); tries++; }
        while (tries < 20 && ['elite', 'rest', 'shop'].includes(t) && n.prev.some(pid => nodes[pid].type === t));
        n.type = t;
      }
      if (n.floor === FL - 1) { n.next = ['boss']; boss.prev.push(n.id); }
    }
    return { nodes, floors: FL, width: WIDTH, act };
  }
  function availableNodes(run) {
    if (run.screen !== 'map') return [];
    if (!run.pos) return Object.values(run.map.nodes).filter(n => n.floor === 0).map(n => n.id);
    return run.map.nodes[run.pos].next.slice();
  }
  function chooseNode(run, id) {
    if (!availableNodes(run).includes(id)) return { ok: false, reason: '갈 수 없는 칸이야.' };
    const n = run.map.nodes[id];
    run.pos = id; run.visited.push(id); run.floor = n.floor + 1; run.totalFloor++;
    const enc = D.ENCOUNTERS[run.act];
    switch (n.type) {
      case 'monster': {
        const easyUntil = run.act === 1 ? 3 : 2;
        const pool = enc[n.floor < easyUntil ? 'easy' : 'normal'];
        let e, g = 0;
        do { e = pick(run, pool); } while (g++ < 10 && run.lastEnc && e.join() === run.lastEnc);
        run.lastEnc = e.join();
        startCombat(run, e, 'monster'); break;
      }
      case 'elite': {
        let e, g = 0;
        do { e = pick(run, enc.elite); } while (g++ < 10 && run.lastElite && e.join() === run.lastElite);
        run.lastElite = e.join();
        startCombat(run, e, 'elite'); break;
      }
      case 'boss': startCombat(run, pick(run, enc.boss), 'boss'); break;
      case 'rest': run.screen = 'rest'; break;
      case 'shop': run.shop = genShop(run); run.screen = 'shop'; break;
      case 'treasure': run.treasure = { relic: randomRelic(run), gold: ri(run, 30, 50), opened: false }; run.screen = 'treasure'; break;
      case 'event': {
        const all = Object.keys(D.EVENTS).filter(k => !D.EVENTS[k].acts || D.EVENTS[k].acts.includes(run.act));
        let pool = all.filter(k => !run.eventsSeen.includes(k));
        if (!pool.length) pool = all;
        const eid = pick(run, pool);
        run.eventsSeen.push(eid);
        run.event = { id: eid, done: false, text: null };
        run.screen = 'event'; break;
      }
    }
    return { ok: true };
  }

  // ───────── 유물 / 물약 ─────────
  const hasRelic = (run, id) => run.relics.includes(id);
  function addRelic(run, id) {
    if (!id || hasRelic(run, id)) return;
    run.relics.push(id);
    if (!run.relicsSeen.includes(id)) run.relicsSeen.push(id);
    run.stats.maxRelics = Math.max(run.stats.maxRelics, run.relics.length);
    if (id === 'blood_rose') { run.maxHp += 10; run.hp = Math.min(run.maxHp, run.hp + 10); }
    if (id === 'b_giant') { run.maxHp += 30; run.hp = run.maxHp; }
    if (id === 'potion_belt') run.potions.push(null, null);
    if (id === 'whetstone' || id === 'war_paint') {
      const type = id === 'whetstone' ? 'attack' : 'skill';
      const ups = shuffle(run, run.deck.filter(c => canUpgrade(c) && D.CARDS[c.id].type === type));
      ups.slice(0, 2).forEach(c => { c.up = true; });
    }
  }
  function randomRelic(run) {
    const pool = Object.keys(D.RELICS).filter(k => !D.RELICS[k].starter && !D.RELICS[k].boss && !hasRelic(run, k));
    return pool.length ? pick(run, pool) : null;
  }
  function bossRelicChoices(run) {
    const pool = shuffle(run, Object.keys(D.RELICS).filter(k => D.RELICS[k].boss && !hasRelic(run, k)));
    return pool.slice(0, 3);
  }
  function randomPotion(run) { return pick(run, Object.keys(D.POTIONS)); }
  function addPotion(run, id) {
    const i = run.potions.indexOf(null);
    if (i < 0) return false;
    run.potions[i] = id; return true;
  }

  // ───────── 카드 보상 ─────────
  function cardPool(run, rarity) {
    return Object.keys(D.CARDS).filter(k => {
      const c = D.CARDS[k];
      if (!(c.cls === run.cls || c.cls === 'neutral')) return false;
      if (c.rarity === 'legend') return rarity === 'rare' && run.unlocked.includes(k);
      if (c.mastery && !run.unlocked.includes(k)) return false;
      return c.rarity === rarity;
    });
  }
  function rollRarity(run, kind) {
    const w = kind === 'boss' ? { rare: 100 } : kind === 'elite' ? { common: 50, uncommon: 38, rare: 12 } : kind === 'shop' ? { common: 50, uncommon: 37, rare: 13 } : { common: 60, uncommon: 33, rare: 7 };
    return weighted(run, w);
  }
  function rewardCount(run) { return Math.max(1, 3 + (hasRelic(run, 'crystal_ball') ? 1 : 0) - (hasRelic(run, 'b_crown') ? 1 : 0)); }
  function genCardChoices(run, n, kind) {
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 100) {
      const id = pick(run, cardPool(run, rollRarity(run, kind)));
      if (id && !out.includes(id)) out.push(id);
    }
    out.forEach(id => seeCard(run, id));
    // 3막부터는 가끔 강화된 카드
    return out.map(id => ({ id, up: run.act >= 3 && rnd(run) < 0.25 }));
  }
  function seeCard(run, id) { if (!run.cardsSeen.includes(id)) run.cardsSeen.push(id); }
  // 조합 힌트: 덱과 겹치는 아키타입 수
  function synergy(run, id) {
    const c = D.CARDS[id]; if (!c || !c.tags || !c.tags.length) return { score: 0, tags: [] };
    const counts = {};
    for (const cd of run.deck) for (const t of (D.CARDS[cd.id].tags || [])) counts[t] = (counts[t] || 0) + 1;
    const tags = c.tags.map(t => ({ t, n: counts[t] || 0 })).sort((a, b) => b.n - a.n);
    return { score: tags.reduce((s, x) => s + x.n, 0), tags };
  }

  // ───────── 전투 ─────────
  const C = run => run.combat;
  function hpOf(run, x) { return x.isPlayer ? run.hp : x.hp; }
  function setHp(run, x, v) { if (x.isPlayer) run.hp = v; else x.hp = v; }
  function addSt(x, s, v) {
    const n = (x.st[s] || 0) + v;
    if (n === 0 || (n < 0 && s !== 'str' && s !== 'dex')) delete x.st[s]; else x.st[s] = n;
  }
  function fx(run, e) { run.fx.push(e); }
  const whoId = x => x.isPlayer ? 'p' : x.uid;

  function mkEnemy(run, id, minion) {
    const d = D.ENEMIES[id];
    let hp = ri(run, d.hp[0], d.hp[1]);
    const a = run.asc || 0;
    if (d.kind === 'elite' && a >= 1) hp = Math.round(hp * 1.15);
    if ((d.kind === 'monster' || d.kind === 'rival') && a >= 2) hp = Math.round(hp * 1.1);
    if (d.boss && a >= 3) hp = Math.round(hp * 1.1);
    const e = { uid: run.nextUid++, id, name: d.name, hp, maxHp: hp, block: 0, st: Object.assign({}, d.start || {}),
             phase: 0, firstDone: false, cyc: 0, hist: [], intent: null, dead: false, minion: !!minion,
             dmgMul: (a >= 4 ? 1.1 : 1) * (d.boss && a >= 10 ? 1 : 1) };
    if (d.boss && a >= 10) addSt(e, 'str', 2);
    if (!run.enemiesSeen.includes(id)) run.enemiesSeen.push(id);
    return e;
  }
  function startCombat(run, ids, kind, opts) {
    const c = run.combat = {
      kind, enemies: ids.map(id => mkEnemy(run, id)), draw: [], hand: [], disc: [], exh: [],
      energy: 0, p: { isPlayer: true, block: 0, st: {} }, turn: 0, atkThisTurn: 0, skillThisTurn: 0, cardsThisTurn: 0,
      cardsTotal: 0, dmgTaken: 0, over: false, fromEvent: !!(opts && opts.fromEvent),
      allies: [], broken: [], moon: 0, moonMoves: 0
    };
    const deck = shuffle(run, run.deck.map(cd => ({ uid: cd.uid, id: cd.id, up: cd.up })));
    const innate = deck.filter(cd => cardDef(cd).innate), rest = deck.filter(cd => !cardDef(cd).innate);
    c.draw = rest.concat(innate);
    run.screen = 'combat';
    run.rewards = null;
    for (const e of c.enemies) { const d = D.ENEMIES[e.id]; const text = (d.greet && d.greet[run.starter]) || d.intro; if (text) fx(run, { k: 'say', who: e.uid, text }); }
    const P = c.p;
    if (hasRelic(run, 'shadow_hood')) for (let i = 0; i < 3; i++) c.hand.push(newCard(run, 'shiv'));
    if (hasRelic(run, 'b_mask')) for (let i = 0; i < 2; i++) c.hand.push(newCard(run, 'daze'));
    if (hasRelic(run, 'guard_charm')) P.block += 10;
    if (hasRelic(run, 'holy_sigil')) { P.block += 4; addSt(P, 'thorns', 1); }
    if (hasRelic(run, 'crimson_sheath')) addSt(P, 'vigor', kind === 'monster' ? 6 : 10);
    if (hasRelic(run, 'viper_ring')) c.enemies.forEach(e => addSt(e, 'poison', 2));
    if (hasRelic(run, 'dawn_lamp')) addSt(P, 'sanctuary', 1);
    // 히로인 레벨 5 패시브
    if (run.passive === 'sera' && kind === 'boss') addSt(P, 'str', 1);
    if (run.passive === 'sera' && kind === 'elite') addSt(P, 'vigor', 4);
    if (run.passive === 'luna') addSt(P, 'arcane', 1);
    if (run.passive === 'yuki' && kind !== 'monster' && c.hand.length < HAND_MAX) c.hand.push(newCard(run, 'shiv'));
    if (run.passive === 'aria') addSt(P, 'retribution', 2);
    // v1.3 새 히로인
    if (hasRelic(run, 'silver_thimble')) summonDoll(run, 5, 2);
    if (hasRelic(run, 'sewing_box')) { summonDoll(run, 4, 2); summonDoll(run, 4, 2); }
    if (run.passive === 'mariel' && kind === 'boss') summonDoll(run, 6, 2, true);
    if (hasRelic(run, 'silver_ring')) c.moon = 2;
    if (hasRelic(run, 'brass_key')) c.hand.push(newCard(run, 'lo_mark'));
    if (run.passive === 'odette' && kind !== 'monster') { const nc = newCard(run, 'lo_read'); nc.fn = 2; c.hand.push(nc); }
    if (hasRelic(run, 'dragon_heart')) addSt(P, 'str', 1);
    if (hasRelic(run, 'silk_glove')) addSt(P, 'dex', 1);
    if (hasRelic(run, 'thorn_crown')) addSt(P, 'thorns', 3);
    if (hasRelic(run, 'holy_water')) addSt(P, 'regen', 4);
    if (hasRelic(run, 'venom_vial')) addSt(P, 'toxin', 1);
    if (hasRelic(run, 'glowstick')) addSt(P, 'vigor', 8);
    if (hasRelic(run, 'viper_fang')) c.enemies.forEach(e => addSt(e, 'vuln', 1));
    if (hasRelic(run, 'mirror_shard')) c.enemies.forEach(e => addSt(e, 'weak', 1));
    trackBlock(run);
    c.enemies.forEach(e => chooseIntent(run, e));
    startPlayerTurn(run);
  }

  function phaseOf(d, e) { return d.phases ? d.phases[e.phase] : d; }
  function chooseIntent(run, e) {
    const d = D.ENEMIES[e.id];
    const ai = phaseOf(d, e).ai;
    const c = C(run);
    const alive = c.enemies.filter(x => !x.dead).length;
    const ok = k => !(d.moves[k].summon && alive >= 3);
    let key;
    if (!e.firstDone && ai.first) { key = ai.first; e.firstDone = true; }
    else if (ai.type === 'cycle') {
      for (let g = 0; g < ai.order.length; g++) { key = ai.order[e.cyc % ai.order.length]; e.cyc++; if (ok(key)) break; }
    } else {
      const w = Object.assign({}, ai.w);
      for (const k of Object.keys(w)) {
        const max = (ai.maxRun && ai.maxRun[k]) || 2;
        let run_ = 0; for (let i = e.hist.length - 1; i >= 0 && e.hist[i] === k; i--) run_++;
        if (run_ >= max || !ok(k)) w[k] = 0;
      }
      key = Object.values(w).some(v => v > 0) ? weighted(run, w) : Object.keys(ai.w).find(ok) || Object.keys(ai.w)[0];
    }
    e.firstDone = true;
    e.intent = key;
  }

  // ───────── v1.3 인형 (마리엘) ─────────
  const DOLL_MAX = 3;
  function summonDoll(run, hp, atk, dodo) {
    const c = C(run); if (!c) return;
    if (c.allies.length >= DOLL_MAX) { const f = c.allies[0]; f.maxHp += hp; f.hp += hp; fx(run, { k: 'doll', v: hp }); return; }
    const bonus = (c.p.st.dollCraft || 0);
    c.allies.push({ uid: run.nextUid++, name: dodo ? '도도' : '인형', hp: hp + bonus, maxHp: hp + bonus, atk, dodo: !!dodo });
    fx(run, { k: 'doll', v: hp });
  }
  function breakDoll(run) {
    const c = C(run); if (!c || !c.allies.length) return null;
    const d = c.allies.pop(); c.broken.push({ maxHp: d.maxHp, atk: d.atk, dodo: d.dodo, name: d.name }); fx(run, { k: 'dollBreak' });
    return d;
  }
  function dollsAct(run, n) {
    const c = C(run), P = c.p;
    for (let k = 0; k < n; k++) for (const d of c.allies.slice()) {
      const al = aliveEnemies(run); if (!al.length || run.over || c.over) return;
      const t = pick(run, al); const v = calcAttack({ st: {} }, t, d.atk + (P.st.dollCraft || 0));
      applyDamage(run, t, v, P, false); fx(run, { k: 'dollHit', v });
    }
  }
  // 적의 공격 한 번: 방어도 → 맨 앞 인형 → 체력 순으로 받음
  function hitPlayer(run, e, amount) {
    const c = C(run), P = c.p;
    if (!c.allies.length) return applyDamage(run, P, amount, e, true);
    const blocked = Math.min(P.block, amount); P.block -= blocked;
    let rem = amount - blocked;
    if (blocked) fx(run, { k: 'dmg', who: 'p', v: 0, blocked });
    const d = c.allies[0];
    if (rem > 0 && d) {
      const take = Math.min(rem, d.hp); d.hp -= take; rem -= take; fx(run, { k: 'dollHurt', v: take });
      if (d.hp <= 0) { c.allies.shift(); c.broken.push({ maxHp: d.maxHp, atk: d.atk, dodo: d.dodo, name: d.name }); fx(run, { k: 'dollBreak' }); }
    }
    if (rem > 0) return applyDamage(run, P, rem, e, true);
    if (P.st.thorns && !e.dead) applyDamage(run, e, P.st.thorns, P, false);
    return 0;
  }
  // ───────── v1.3 달 위상 (세레나) ─────────
  const MOON = ['초승', '반달', '보름', '그믐'], MOON_ICON = ['🌒', '🌓', '🌕', '🌑'];
  function moonAdvance(run, n) {
    const c = C(run), P = c.p;
    if (P.st.moonHold) return;
    for (let i = 0; i < n; i++) {
      const was = c.moon; c.moon = (c.moon + 1) % 4; c.moonMoves++;
      if (c.moonMoves === 1 && run.passive === 'serena') gainBlock(run, P, 3);
      if (was === 3) {
        fx(run, { k: 'moonCycle' });
        if (hasRelic(run, 'crescent_pin')) gainBlock(run, P, 3);
        if (P.st.moonCycle) for (const t of aliveEnemies(run)) { if (run.over || c.over) break; applyDamage(run, t, P.st.moonCycle, P, false); }
      }
      if (run.over || c.over) return;
    }
  }

  // src: 공격자, tgt: 대상, base: 기본 피해, o: { vigor, strMult, bonusIfWeak, shiv }
  function calcAttack(src, tgt, base, o) {
    o = typeof o === 'number' ? { vigor: o } : (o || {});
    const str = (src.st.str || 0) * (o.strMult || 1);
    let d = base + str + (o.vigor || 0) + (o.shiv && src.st.bladeDance ? src.st.bladeDance : 0) + (o.bonusIfWeak && tgt && tgt.st.weak ? o.bonusIfWeak : 0);
    if (src.dmgMul) d *= src.dmgMul;
    if (src.st.weak) d *= 0.75;
    if (tgt && tgt.st.vuln) d *= 1.5;
    return Math.max(0, Math.floor(d));
  }
  function trackBlock(run) { const c = C(run); if (c) run.stats.maxBlock = Math.max(run.stats.maxBlock, c.p.block); }
  function gainBlock(run, x, v) { if (v <= 0) return; x.block += v; fx(run, { k: 'block', who: whoId(x), v }); if (x.isPlayer) trackBlock(run); }
  function playerBlock(run, v) { const c = C(run); gainBlock(run, c.p, Math.max(0, v + (c.p.st.dex || 0))); }

  function applyDamage(run, tgt, amount, src, isAttack) {
    if (!tgt || (!tgt.isPlayer && tgt.dead) || run.over) return 0;
    const blocked = Math.min(tgt.block, amount);
    tgt.block -= blocked;
    const lose = Math.min(amount - blocked, hpOf(run, tgt));
    setHp(run, tgt, hpOf(run, tgt) - lose);
    fx(run, { k: 'dmg', who: whoId(tgt), v: amount - blocked, blocked, big: amount >= 20 });
    if (src && src.isPlayer && !tgt.isPlayer) { run.stats.dmgDealt += lose; if (isAttack) run.stats.maxHit = Math.max(run.stats.maxHit, amount); }
    if (tgt.isPlayer && lose > 0) C(run).dmgTaken += lose;
    if (!tgt.isPlayer && tgt.st.curl && lose > 0 && !tgt.dead) { const v = tgt.st.curl; delete tgt.st.curl; tgt.block += v; fx(run, { k: 'block', who: tgt.uid, v }); }
    afterHpChange(run, tgt);
    if (run.over) return lose;
    if (isAttack && src && tgt.st.thorns && !src.dead) applyDamage(run, src, tgt.st.thorns, tgt, false);
    if (isAttack && tgt.isPlayer && src && !src.isPlayer && !src.dead && amount > 0 && amount === blocked && tgt.st.retribution) applyDamage(run, src, tgt.st.retribution, tgt, false);
    if (isAttack && src && src.isPlayer && lose > 0 && src.st.envenom && !tgt.dead) addPoison(run, tgt, src.st.envenom);
    return lose;
  }
  function addPoison(run, t, v) {
    const P = C(run).p;
    addSt(t, 'poison', v + (P.st.toxin || 0));
    run.stats.maxPoison = Math.max(run.stats.maxPoison, t.st.poison || 0);
  }
  function loseHp(run, tgt, v, fromCard) {
    if (run.over) return;
    const lose = Math.min(v, hpOf(run, tgt));
    setHp(run, tgt, hpOf(run, tgt) - lose);
    fx(run, { k: 'dmg', who: whoId(tgt), v: lose, blocked: 0, poison: !fromCard });
    if (tgt.isPlayer && C(run)) C(run).dmgTaken += lose;
    afterHpChange(run, tgt);
    if (fromCard && tgt.isPlayer && tgt.st.rupture && !run.over) { addSt(tgt, 'str', tgt.st.rupture); fx(run, { k: 'buff', who: 'p', s: 'str' }); }
  }
  function tryRevive(run) {
    const pi = run.potions.indexOf('fairy_p');
    if (pi >= 0) { run.potions[pi] = null; run.hp = Math.max(1, Math.floor(run.maxHp * 0.3)); fx(run, { k: 'revive', how: 'fairy' }); return true; }
    if (hasRelic(run, 'b_phoenix') && !run.phoenixUsed) { run.phoenixUsed = true; run.hp = Math.floor(run.maxHp * 0.5); fx(run, { k: 'revive', how: 'phoenix' }); return true; }
    return false;
  }
  function afterHpChange(run, x) {
    if (x.isPlayer) { if (run.hp <= 0 && !tryRevive(run)) endRun(run, false); return; }
    const d = D.ENEMIES[x.id];
    if (x.hp <= 0 && !x.dead) {
      x.dead = true; x.block = 0; run.stats.kills++;
      fx(run, { k: 'die', who: x.uid, boss: !!d.boss });
      if (d.death) fx(run, { k: 'say', who: x.uid, text: d.death });
      if (d.boss) {
        if (!run.stats.bosses.includes(x.id)) run.stats.bosses.push(x.id);
        C(run).enemies.forEach(e => { if (e.minion && !e.dead) { e.dead = true; e.hp = 0; fx(run, { k: 'die', who: e.uid }); } });
      }
      return;
    }
    if (d.phases && d.phases[x.phase + 1] && x.hp <= x.maxHp * d.phases[x.phase + 1].at) {
      x.phase++;
      const ph = d.phases[x.phase], en = ph.enter || {};
      if (en.say) fx(run, { k: 'say', who: x.uid, text: en.say });
      if (en.clearDebuffs) for (const s of Object.keys(x.st)) if (D.STATUS[s] && D.STATUS[s].type === 'debuff') delete x.st[s];
      if (en.st) for (const s in en.st) addSt(x, s, en.st[s]);
      if (en.block) x.block += en.block;
      x.firstDone = false; x.cyc = 0;
      chooseIntent(run, x);
      fx(run, { k: 'phase', who: x.uid, n: x.phase + 1 });
    }
  }

  function drawCards(run, n) {
    const c = C(run);
    for (let i = 0; i < n; i++) {
      if (c.hand.length >= HAND_MAX) break;
      if (!c.draw.length) {
        if (!c.disc.length) break;
        c.draw = shuffle(run, c.disc); c.disc = [];
        fx(run, { k: 'shuffle' });
      }
      const cd = c.draw.pop();
      c.hand.push(cd);
      if (cd.id === 'burn' && c.p.st.pyro) aliveEnemies(run).forEach(t => applyDamage(run, t, c.p.st.pyro, c.p, false));
      if (run.over || c.over) return;
    }
  }

  function startPlayerTurn(run) {
    const c = C(run);
    if (run.over || c.over) return;
    const P = c.p;
    c.turn++; run.stats.turns++;
    c.atkThisTurn = 0; c.skillThisTurn = 0; c.cardsThisTurn = 0;
    if (c.turn > 1 && !P.st.barricade) P.block = 0;
    c.moonMoves = 0; c.onceE = 0; if (P.st.moonHold) delete P.st.moonHold;
    if (P.st.poison) { const p = P.st.poison; addSt(P, 'poison', -1); loseHp(run, P, p); if (run.over) return; }
    if (P.st.ritual) addSt(P, 'str', P.st.ritual);
    if (P.st.sanctuary) gainBlock(run, P, P.st.sanctuary);
    if (P.st.blessing) healPlayer(run, P.st.blessing);
    if (P.st.permafrost) aliveEnemies(run).forEach(e => addSt(e, 'weak', P.st.permafrost));
    if (P.st.shivGen) for (let i = 0; i < P.st.shivGen && c.hand.length < HAND_MAX; i++) c.hand.push(newCard(run, 'shiv'));
    const bossE = ['b_crown', 'b_ember', 'b_mask'].filter(r => hasRelic(run, r)).length;
    c.energy = BASE_ENERGY + bossE + (P.st.energyUp || 0)
      + (c.turn === 1 && hasRelic(run, 'moon_pendant') ? 1 : 0) + (c.turn === 1 && hasRelic(run, 'silver_ring') ? 1 : 0)
      + (c.turn % 3 === 0 && hasRelic(run, 'sun_pin') ? 1 : 0);
    drawCards(run, BASE_DRAW + (P.st.drawUp || 0) + (hasRelic(run, 'b_hourglass') ? 1 : 0)
      + (c.turn === 1 && hasRelic(run, 'firefly') ? 2 : 0) + (c.turn === 1 && hasRelic(run, 'moon_pendant') ? 1 : 0) + (c.turn % 2 === 0 && hasRelic(run, 'star_chart') ? 1 : 0));
    fx(run, { k: 'turn', who: 'p', turn: c.turn });
    checkCombatEnd(run);
  }
  function maxEnergy(run) {
    const c = C(run); if (!c) return BASE_ENERGY;
    return BASE_ENERGY + ['b_crown', 'b_ember', 'b_mask'].filter(r => hasRelic(run, r)).length + (c.p.st.energyUp || 0);
  }

  function canPlay(run, card) {
    const c = C(run);
    if (!c || c.over || run.over) return false;
    const d = cardDef(card);
    if (d.unplayable) return false;
    if (d.cost === -1) return true;
    return c.energy >= d.cost;
  }

  function aliveEnemies(run) { return C(run).enemies.filter(e => !e.dead); }

  function runEffects(run, effects, target, ctx) {
    const c = C(run), P = c.p;
    const ao = e => ({ vigor: ctx.vigor, strMult: e.strMult, bonusIfWeak: e.bonusIfWeak, shiv: ctx.shiv });
    const fv = e => e.v + (e.fn ? e.fn * (ctx.fn || 0) : 0);
    for (const e of effects) {
      if (run.over || c.over) return;
      switch (e.t) {
        case 'dmg': {
          const hits = e.hitsFrom === 'atk' ? c.atkThisTurn : e.hitsFrom === 'skill' ? c.skillThisTurn : (e.hits || 1);
          for (let h = 0; h < hits; h++) { if (!target || target.dead || run.over) break; applyDamage(run, target, calcAttack(P, target, fv(e), ao(e)), P, true); }
          break;
        }
        case 'dmgAll': {
          const hits = e.hits === 'X' ? ctx.x : (e.hits || 1);
          for (let h = 0; h < hits; h++) for (const t of aliveEnemies(run)) { if (run.over) break; applyDamage(run, t, calcAttack(P, t, fv(e), ao(e)), P, true); }
          break;
        }
        case 'dmgRandom': {
          for (let h = 0; h < (e.hits || 1); h++) { const al = aliveEnemies(run); if (!al.length || run.over) break; const t = pick(run, al); applyDamage(run, t, calcAttack(P, t, e.v, ao(e)), P, true); }
          break;
        }
        case 'dmgBlock': if (target && !target.dead) applyDamage(run, target, calcAttack(P, target, P.block, ao(e)), P, true); break;
        case 'dmgBlockAll': { const b = P.block; for (const t of aliveEnemies(run)) { if (run.over) break; applyDamage(run, t, calcAttack(P, t, b, ao(e)), P, true); } break; }
        case 'dmgPoison': if (target && !target.dead) applyDamage(run, target, Math.floor((target.st.poison || 0) * (e.m || 1)), P, false); break;
        case 'dmgAllThorns': { const v = (P.st.thorns || 0) * (e.m || 1); for (const t of aliveEnemies(run)) { if (run.over) break; applyDamage(run, t, calcAttack(P, t, v, ao(e)), P, true); } break; }
        case 'rawDmg': if (target && !target.dead) applyDamage(run, target, e.v, P, false); break;
        case 'rawDmgAll': for (const t of aliveEnemies(run)) { if (run.over) break; applyDamage(run, t, e.v, P, false); } break;
        case 'block': playerBlock(run, fv(e)); break;
        case 'doll': summonDoll(run, e.hp, e.atk); break;
        case 'dollHp': c.allies.forEach(d => { d.hp += e.v; d.maxHp += e.v; }); if (c.allies.length) fx(run, { k: 'doll', v: e.v }); break;
        case 'dmgPerDoll': { const hits = c.allies.length + 1; for (let h = 0; h < hits; h++) { if (!target || target.dead || run.over) break; applyDamage(run, target, calcAttack(P, target, e.v, ao(e)), P, true); } break; }
        case 'blockPerDoll': playerBlock(run, (e.base || 0) + e.v * c.allies.length); break;
        case 'breakDoll': {
          const d = breakDoll(run); if (!d) break;
          if (e.draw) drawCards(run, e.draw);
          if (e.energy) c.energy += e.energy;
          if (e.boom) for (const t of aliveEnemies(run)) { if (run.over || c.over) break; applyDamage(run, t, calcAttack(P, t, d.maxHp * e.boom, ao(e)), P, true); }
          break;
        }
        case 'dollAct': dollsAct(run, e.n || 1); break;
        case 'reviveDolls': { const b = c.broken.splice(0); for (const d of b) { if (c.allies.length >= DOLL_MAX) break; c.allies.push({ uid: run.nextUid++, name: d.name, hp: Math.max(1, Math.ceil(d.maxHp / 2)), maxHp: d.maxHp, atk: d.atk, dodo: d.dodo }); } fx(run, { k: 'doll', v: 0 }); break; }
        case 'moonShift': moonAdvance(run, e.v); break;
        case 'moonSet': c.moon = e.v; fx(run, { k: 'moon' }); break;
        case 'dmgMoon': { const hits = c.moonMoves + 1; for (let h = 0; h < hits; h++) { if (!target || target.dead || run.over) break; applyDamage(run, target, calcAttack(P, target, e.v, ao(e)), P, true); } break; }
        case 'fnAll': c.hand.forEach(cd => { if (cardDef(cd).retain) cd.fn = (cd.fn || 0) + e.v; }); break;
        case 'blockFn': playerBlock(run, (e.base || 0) + e.m * c.hand.reduce((a, cd) => a + (cd.fn || 0), 0)); break;
        case 'recall': { if (c.disc.length && c.hand.length < HAND_MAX) { const cd = c.disc.pop(); c.hand.push(cd); } break; }
        case 'upgradeRetain': c.hand.forEach(cd => { if (cardDef(cd).retain && canUpgrade(cd)) cd.up = true; }); break;
        case 'blockDex': gainBlock(run, P, Math.max(0, (P.st.dex || 0) * e.m)); break;
        case 'rawBlock': gainBlock(run, P, e.v); break;
        case 'doubleBlock': gainBlock(run, P, P.block); break;
        case 'draw': drawCards(run, e.v); break;
        case 'energy': if (e.once) { if (c.onceE) break; c.onceE = 1; } c.energy += e.v; break;
        case 'energyIfAtk': if (c.atkThisTurn + 1 >= e.n) c.energy += e.v; break; // 이 카드 포함
        case 'apply': if (target && !target.dead) { if (e.s === 'poison') addPoison(run, target, e.v); else addSt(target, e.s, e.v); fx(run, { k: 'debuff', who: target.uid, s: e.s }); } break;
        case 'applyAll': aliveEnemies(run).forEach(t => { if (e.s === 'poison') addPoison(run, t, e.v); else addSt(t, e.s, e.v); fx(run, { k: 'debuff', who: t.uid, s: e.s }); }); break;
        case 'self': addSt(P, e.s, e.v); fx(run, { k: 'buff', who: 'p', s: e.s }); break;
        case 'doubleStr': if (P.st.str > 0) { addSt(P, 'str', P.st.str); fx(run, { k: 'buff', who: 'p', s: 'str' }); } break;
        case 'heal': healPlayer(run, e.v); break;
        case 'loseHp': loseHp(run, P, e.v, true); break;
        case 'cleanse': for (const s of Object.keys(P.st)) if (D.STATUS[s] && D.STATUS[s].type === 'debuff') delete P.st[s]; fx(run, { k: 'buff', who: 'p', s: 'regen' }); break;
        case 'add':
          for (let i = 0; i < e.n; i++) {
            const nc = newCard(run, e.id, e.up);
            if (e.to === 'hand' && c.hand.length < HAND_MAX) c.hand.push(nc);
            else if (e.to === 'draw') c.draw.splice(ri(run, 0, c.draw.length), 0, nc);
            else c.disc.push(nc);
          }
          break;
        case 'upgradeHand': {
          const ups = c.hand.filter(canUpgrade);
          if (e.v === 'all') ups.forEach(cd => { cd.up = true; });
          else if (ups.length) pick(run, ups).up = true;
          break;
        }
        case 'multiplyPoison': if (target && !target.dead && target.st.poison) { target.st.poison *= e.v; run.stats.maxPoison = Math.max(run.stats.maxPoison, target.st.poison); fx(run, { k: 'debuff', who: target.uid, s: 'poison' }); } break;
        case 'exhaustBurns': {
          const burns = c.hand.filter(cd => cd.id === 'burn');
          c.hand = c.hand.filter(cd => cd.id !== 'burn'); burns.forEach(b => c.exh.push(b));
          for (let i = 0; i < burns.length; i++) for (const t of aliveEnemies(run)) { if (run.over) break; applyDamage(run, t, calcAttack(P, t, e.v, ao(e)), P, true); }
          break;
        }
      }
    }
  }
  function healPlayer(run, v) {
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + v);
    if (run.hp > before) {
      fx(run, { k: 'heal', who: 'p', v: run.hp - before });
      const c = C(run);
      if (c && !c.over && c.p.st.grace && run.screen === 'combat') for (const t of aliveEnemies(run)) applyDamage(run, t, c.p.st.grace, c.p, false);
    }
  }

  function playCard(run, uid, targetIdx) {
    const c = C(run);
    if (run.screen !== 'combat' || !c || c.over || run.over) return { ok: false, reason: '지금은 카드를 낼 수 없어.' };
    const i = c.hand.findIndex(x => x.uid === uid);
    if (i < 0) return { ok: false, reason: '손에 없는 카드야.' };
    const card = c.hand[i], d = cardDef(card);
    if (d.unplayable) return { ok: false, reason: '사용할 수 없는 카드야.' };
    if (!canPlay(run, card)) return { ok: false, reason: '에너지가 부족해.' };
    let target = null;
    if (needsTarget(d)) {
      const al = aliveEnemies(run);
      target = targetIdx != null ? c.enemies[targetIdx] : null;
      if (!target || target.dead) { if (al.length === 1) target = al[0]; else return { ok: false, reason: '대상을 골라 줘.', needTarget: true }; }
    }
    let x = 0;
    if (d.cost === -1) { x = c.energy; c.energy = 0; } else c.energy -= d.cost;
    c.hand.splice(i, 1);
    c.cardsThisTurn++; c.cardsTotal++; run.stats.cardsPlayed++;
    run.stats.maxCardsTurn = Math.max(run.stats.maxCardsTurn, c.cardsThisTurn);
    fx(run, { k: 'play', card: { id: card.id, up: card.up }, target: target ? target.uid : null, type: d.type });
    const P = c.p;
    if (P.st.afterImage) gainBlock(run, P, P.st.afterImage);
    const vigor = d.type === 'attack' ? (P.st.vigor || 0) : 0;
    const fnv = card.fn || 0, moonAt = c.moon;
    runEffects(run, d.effects, target, { x, vigor, shiv: card.id === 'shiv', fn: fnv });
    if (d.moon && run.cls === 'moon' && moonAt === d.moon.p && !run.over && !c.over) { fx(run, { k: 'moonBonus', p: moonAt }); runEffects(run, d.moon.effects, target && !target.dead ? target : null, { x, vigor: 0, fn: fnv }); }
    if (fnv >= 3 && hasRelic(run, 'archive_lamp')) c.energy += 1;
    delete card.fn;
    if (run.cls === 'moon' && !run.over && !c.over) moonAdvance(run, 1);
    if (!run.over && !c.over) {
      if (d.type === 'attack') {
        if (vigor) delete P.st.vigor;
        c.atkThisTurn++;
        if (P.st.trance) gainBlock(run, P, P.st.trance);
        if (c.atkThisTurn % 3 === 0) {
          if (hasRelic(run, 'dancer_fan')) gainBlock(run, P, 4);
          if (hasRelic(run, 'shuriken_pouch')) { addSt(P, 'str', 1); fx(run, { k: 'buff', who: 'p', s: 'str' }); }
        }
      }
      if (d.type === 'skill') {
        c.skillThisTurn++;
        aliveEnemies(run).forEach(e => { if (e.st.enrage) { addSt(e, 'str', e.st.enrage); fx(run, { k: 'buff', who: e.uid, s: 'str' }); } });
        if (P.st.arcane) { const al = aliveEnemies(run); if (al.length) applyDamage(run, pick(run, al), P.st.arcane, P, false); }
        if (hasRelic(run, 'bookmark') && c.skillThisTurn % 3 === 0) drawCards(run, 1);
      }
      if (hasRelic(run, 'ink_quill') && c.cardsTotal % 10 === 0) c.energy += 1;
    }
    if (d.type !== 'power') { if (d.exhaust) c.exh.push(card); else c.disc.push(card); }
    checkCombatEnd(run);
    return { ok: true };
  }

  function checkCombatEnd(run) {
    const c = C(run);
    if (!c || c.over || run.over) return;
    if (c.enemies.every(e => e.dead)) winCombat(run);
  }

  function endTurn(run) {
    const c = C(run);
    if (run.screen !== 'combat' || !c || c.over || run.over) return { ok: false };
    const P = c.p;
    if (P.st.metal) gainBlock(run, P, P.st.metal);
    if (hasRelic(run, 'iron_brooch') && P.block === 0) gainBlock(run, P, 6);
    if (P.st.regen) { healPlayer(run, P.st.regen); addSt(P, 'regen', -1); }
    if (c.over) return { ok: true };
    for (const cd of c.hand) { const d = cardDef(cd); if (d.endTurnInHand) { loseHp(run, P, d.endTurnInHand); if (run.over) return { ok: true }; } }
    const keep = [];
    for (const cd of c.hand) { const dd = cardDef(cd); if (dd.retain) { cd.fn = (cd.fn || 0) + 1 + (P.st.annotate || 0); keep.push(cd); } else if (dd.ethereal) c.exh.push(cd); else c.disc.push(cd); }
    c.hand = keep;
    if (c.allies.length) { dollsAct(run, 1 + (P.st.puppetry || 0)); checkCombatEnd(run); if (c.over || run.over) return { ok: true }; }
    for (const s of ['weak', 'vuln']) if (P.st[s]) addSt(P, s, -1);
    fx(run, { k: 'turn', who: 'e' });
    for (const e of c.enemies.slice()) {
      if (e.dead || run.over) continue;
      if (!e.st.barricade) e.block = 0;
      if (e.st.poison) { const p = e.st.poison; addSt(e, 'poison', -1); loseHp(run, e, p); if (e.dead) continue; }
      if (e.st.ritual) addSt(e, 'str', e.st.ritual);
      enemyAct(run, e);
      if (run.over) return { ok: true };
      if (!e.dead) {
        if (e.st.metal) gainBlock(run, e, e.st.metal);
        if (e.st.regen) { const b = e.hp; e.hp = Math.min(e.maxHp, e.hp + e.st.regen); if (e.hp > b) fx(run, { k: 'heal', who: e.uid, v: e.hp - b }); addSt(e, 'regen', -1); }
      }
      for (const s of ['weak', 'vuln']) if (e.st[s]) addSt(e, s, -1);
    }
    checkCombatEnd(run);
    if (c.over || run.over) return { ok: true };
    c.enemies.forEach(e => { if (!e.dead && !e.justSpawned) chooseIntent(run, e); e.justSpawned = false; });
    startPlayerTurn(run);
    return { ok: true };
  }

  function enemyAct(run, e) {
    const c = C(run), d = D.ENEMIES[e.id], m = d.moves[e.intent];
    if (!m) return;
    if (m.say) fx(run, { k: 'say', who: e.uid, text: m.say });
    fx(run, { k: 'act', who: e.uid, name: m.name, atk: !!m.dmg });
    if (m.dmg) for (let h = 0; h < (m.hits || 1); h++) { if (e.dead || run.over) break; hitPlayer(run, e, calcAttack(e, c.p, m.dmg)); }
    if (run.over || e.dead) { e.hist.push(e.intent); return; }
    if (m.block) gainBlock(run, e, m.block);
    if (m.blockAll) aliveEnemies(run).forEach(x => gainBlock(run, x, m.blockAll));
    if (m.selfSt) for (const s in m.selfSt) { addSt(e, s, m.selfSt[s]); fx(run, { k: 'buff', who: e.uid, s }); }
    if (m.playerSt) for (const s in m.playerSt) { addSt(c.p, s, m.playerSt[s]); fx(run, { k: 'debuff', who: 'p', s }); }
    if (m.addCards) for (const a of m.addCards) for (let i = 0; i < a.n; i++) { const nc = newCard(run, a.id); if (a.to === 'draw') c.draw.splice(ri(run, 0, c.draw.length), 0, nc); else c.disc.push(nc); }
    if (m.heal) { const before = e.hp; e.hp = Math.min(e.maxHp, e.hp + m.heal); if (e.hp > before) fx(run, { k: 'heal', who: e.uid, v: e.hp - before }); }
    if (m.summon) for (const id of m.summon) {
      if (aliveEnemies(run).length >= 3) break;
      const ne = mkEnemy(run, id, true);
      ne.justSpawned = true;
      chooseIntent(run, ne);
      const slot = c.enemies.findIndex(x => x.dead && x.minion);
      if (slot >= 0) c.enemies[slot] = ne; else c.enemies.push(ne);
      fx(run, { k: 'spawn', who: ne.uid });
    }
    e.hist.push(e.intent);
  }

  function intentView(run, e) {
    const c = C(run), d = D.ENEMIES[e.id], m = d.moves[e.intent];
    if (!m) return { name: '?', parts: [] };
    const parts = [];
    if (m.dmg) { const v = calcAttack(e, c.p, m.dmg); parts.push({ k: 'atk', text: (m.hits || 1) > 1 ? v + '×' + m.hits : String(v), total: v * (m.hits || 1), v, hits: m.hits || 1 }); }
    if (m.block || m.blockAll) parts.push({ k: 'def' });
    if (m.selfSt || m.heal) parts.push({ k: 'buff' });
    if (m.playerSt || m.addCards) parts.push({ k: 'debuff' });
    if (m.summon) parts.push({ k: 'summon' });
    if (!parts.length) parts.push({ k: 'unknown' });
    return { name: m.name, parts };
  }
  function incomingDamage(run) {
    const c = C(run);
    if (!c) return 0;
    return aliveEnemies(run).reduce((s, e) => s + intentView(run, e).parts.filter(p => p.k === 'atk').reduce((a, p) => a + p.total, 0), 0);
  }

  // 예상 순손실(방어도 → 인형 → 체력 순)
  function incomingNet(run) {
    const c = C(run); if (!c) return 0;
    let blk = c.p.block, dolls = c.allies.map(d => d.hp), net = 0;
    for (const e of aliveEnemies(run)) for (const p of intentView(run, e).parts) if (p.k === 'atk') for (let h = 0; h < p.hits; h++) {
      let v = p.v; const b = Math.min(blk, v); blk -= b; v -= b;
      while (v > 0 && dolls.length) { const t = Math.min(v, dolls[0]); dolls[0] -= t; v -= t; if (dolls[0] <= 0) dolls.shift(); }
      net += v;
    }
    return net;
  }
  function usePotion(run, slot, targetIdx) {
    const id = run.potions[slot];
    if (!id) return { ok: false, reason: '빈 칸이야.' };
    const p = D.POTIONS[id];
    if (p.passive) return { ok: false, reason: '이 물약은 쓰러질 때 자동으로 발동해.' };
    const inCombat = run.screen === 'combat' && C(run) && !C(run).over;
    if (!inCombat) {
      if (!p.anywhere) return { ok: false, reason: '전투 중에만 쓸 수 있어.' };
      run.potions[slot] = null; run.stats.potionsUsed++;
      for (const e of p.effects) if (e.t === 'heal') healPlayer(run, e.v);
      return { ok: true };
    }
    let target = null;
    if (p.target) {
      const al = aliveEnemies(run);
      target = targetIdx != null ? C(run).enemies[targetIdx] : null;
      if (!target || target.dead) { if (al.length === 1) target = al[0]; else return { ok: false, reason: '대상을 골라 줘.', needTarget: true }; }
    }
    run.potions[slot] = null; run.stats.potionsUsed++;
    fx(run, { k: 'potion', id });
    runEffects(run, p.effects, target, { x: 0, vigor: 0 });
    checkCombatEnd(run);
    return { ok: true };
  }
  function discardPotion(run, slot) { run.potions[slot] = null; return { ok: true }; }

  function winCombat(run) {
    const c = C(run);
    c.over = true;
    if (c.kind === 'elite') { run.stats.elites++; if (c.dmgTaken === 0) run.stats.flawlessElite = true; }
    if (hasRelic(run, 'red_ribbon')) healPlayer(run, 8);
    if (hasRelic(run, 'skewer') && run.hp <= run.maxHp / 2) healPlayer(run, 12);
    const boss = c.kind === 'boss';
    const final = boss && run.act >= LAST_ACT;
    if (final) { endRun(run, true); return; }
    const goldMul = run.asc >= 9 ? 0.75 : 1;
    let gold = boss ? ri(run, 90, 110) : c.kind === 'elite' ? ri(run, 28, 38) : ri(run, 12, 20);
    gold = Math.round(gold * goldMul) + (hasRelic(run, 'gold_tooth') ? 10 : 0);
    run.rewards = {
      kind: c.kind, gold, goldTaken: false,
      cards: genCardChoices(run, rewardCount(run), c.kind), cardTaken: false,
      relic: c.kind === 'elite' ? randomRelic(run) : null, relicTaken: false,
      bossRelics: boss ? bossRelicChoices(run) : null, bossRelicTaken: false,
      potion: rnd(run) < (boss ? 1 : c.kind === 'elite' ? 0.6 : 0.4) ? randomPotion(run) : null, potionTaken: false
    };
    run.screen = 'reward';
    fx(run, { k: boss ? 'bosswin' : 'win' });
  }

  function endRun(run, won) {
    run.over = true; run.won = won;
    run.screen = won ? 'victory' : 'gameover';
    if (run.combat) run.combat.over = true;
    fx(run, { k: won ? 'victory' : 'defeat' });
  }

  // ───────── 보상 ─────────
  function takeGold(run) { const r = run.rewards; if (!r || r.goldTaken) return { ok: false }; run.gold += r.gold; run.stats.goldEarned += r.gold; r.goldTaken = true; trackGold(run); return { ok: true }; }
  function trackGold(run) { run.stats.maxGold = Math.max(run.stats.maxGold, run.gold); }
  function takeCard(run, i) {
    const r = run.rewards; if (!r || r.cardTaken || !r.cards[i]) return { ok: false };
    run.deck.push(newCard(run, r.cards[i].id, r.cards[i].up)); r.cardTaken = true; return { ok: true };
  }
  function skipCard(run) { const r = run.rewards; if (r) r.cardTaken = true; return { ok: true }; }
  function takeRelic(run) { const r = run.rewards; if (!r || !r.relic || r.relicTaken) return { ok: false }; addRelic(run, r.relic); r.relicTaken = true; return { ok: true }; }
  function takeBossRelic(run, i) {
    const r = run.rewards; if (!r || !r.bossRelics || r.bossRelicTaken || !r.bossRelics[i]) return { ok: false };
    addRelic(run, r.bossRelics[i]); r.bossRelicTaken = true; return { ok: true };
  }
  function takePotion(run) {
    const r = run.rewards; if (!r || !r.potion || r.potionTaken) return { ok: false };
    if (!addPotion(run, r.potion)) return { ok: false, reason: '물약 칸이 가득 찼어.' };
    r.potionTaken = true; return { ok: true };
  }
  function leaveReward(run) {
    if (run.screen !== 'reward') return { ok: false };
    const r = run.rewards;
    if (r && r.bossRelics && r.bossRelics.length && !r.bossRelicTaken) return { ok: false, reason: '보스 유물을 하나 골라 줘.' };
    if (r && !r.goldTaken) takeGold(run);
    if (r && r.relic && !r.relicTaken) takeRelic(run);
    const wasBoss = r && r.kind === 'boss';
    run.rewards = null; run.combat = null; run.screen = 'map';
    if (wasBoss) nextAct(run);
    return { ok: true };
  }
  function nextAct(run) {
    run.act++;
    run.map = genMap(run, run.act);
    run.pos = null; run.visited = []; run.floor = 0;
    const missing = run.maxHp - run.hp;
    run.hp = Math.min(run.maxHp, run.hp + (run.asc >= 5 ? Math.floor(missing * 0.75) : missing));
    if (hasRelic(run, 'ivy_crown')) { run.maxHp += 8; run.hp += 8; }
    fx(run, { k: 'act', act: run.act });
  }

  // ───────── 휴식 ─────────
  function restHealAmount(run) { return hasRelic(run, 'b_ember') ? 0 : Math.floor(run.maxHp * (run.asc >= 5 ? 0.27 : 0.3)) + (hasRelic(run, 'teacup') ? 15 : 0) + (hasRelic(run, 'dawn_lamp') ? 6 : 0); }
  function restHeal(run) {
    if (run.screen !== 'rest') return { ok: false };
    if (hasRelic(run, 'b_ember')) return { ok: false, reason: '영원의 불씨 때문에 쉴 수 없어.' };
    healPlayer(run, restHealAmount(run));
    run.screen = 'map'; return { ok: true };
  }
  function restSmith(run) {
    if (run.screen !== 'rest') return { ok: false };
    if (!run.deck.some(canUpgrade)) return { ok: false, reason: '강화할 카드가 없어.' };
    run.pending = { mode: 'upgrade', after: 'map', cancel: 'rest', rest: true }; run.screen = 'select'; return { ok: true };
  }

  // ───────── 카드 선택(강화/제거/복제) ─────────
  function selectableCards(run) {
    const p = run.pending; if (!p) return [];
    return run.deck.filter(cd => p.mode === 'upgrade' ? canUpgrade(cd) : p.mode === 'dup' ? D.CARDS[cd.id].cls !== 'status' : true);
  }
  function selectCard(run, uid) {
    const p = run.pending;
    if (run.screen !== 'select' || !p) return { ok: false };
    const cd = run.deck.find(x => x.uid === uid);
    if (!cd || !selectableCards(run).includes(cd)) return { ok: false };
    if (p.mode === 'upgrade') { cd.up = true; if (p.rest && hasRelic(run, 'oath_ring')) healPlayer(run, 8); }
    else if (p.mode === 'dup') run.deck.push(newCard(run, cd.id, cd.up));
    else {
      if (p.cost) { if (run.gold < p.cost) return { ok: false, reason: '골드가 부족해.' }; run.gold -= p.cost; run.removeCost += 25; if (run.shop) run.shop.removeUsed = true; }
      run.deck.splice(run.deck.indexOf(cd), 1);
    }
    run.screen = p.after; run.pending = null;
    return { ok: true };
  }
  function cancelSelect(run) {
    const p = run.pending; if (run.screen !== 'select' || !p) return { ok: false };
    run.screen = p.cancel || p.after; run.pending = null; return { ok: true };
  }

  // ───────── 상점 ─────────
  function price(run, base) { return Math.round(base * (0.9 + rnd(run) * 0.2) * (hasRelic(run, 'lucky_coin') ? 0.8 : 1) * (run.asc >= 8 ? 1.15 : 1)); }
  function removePrice(run) { return hasRelic(run, 'vip_card') ? 50 : run.removeCost; }
  function genShop(run) {
    const base = { common: 50, uncommon: 78, rare: 150 };
    const ids = [];
    for (const r of ['common', 'common', 'uncommon', 'uncommon', 'rare']) {
      let g = 0, id; do { id = pick(run, cardPool(run, r)); } while (g++ < 20 && ids.includes(id));
      if (id && !ids.includes(id)) ids.push(id);
    }
    const cards = ids.map(id => ({ id, up: false, price: price(run, base[D.CARDS[id].rarity === 'legend' ? 'rare' : D.CARDS[id].rarity]), sold: false }));
    if (cards.length) { const s = pick(run, cards); s.price = Math.round(s.price / 2); s.sale = true; }
    const relics = [];
    for (let i = 0; i < 3; i++) { const r = randomRelic(run); if (r && !relics.some(x => x.id === r)) relics.push({ id: r, price: price(run, 150), sold: false }); }
    const potions = [0, 1, 2].map(() => ({ id: randomPotion(run), price: price(run, 55), sold: false }));
    cards.forEach(c => seeCard(run, c.id));
    return { cards, relics, potions, removeUsed: false };
  }
  function buy(run, kind, i) {
    const s = run.shop; if (run.screen !== 'shop' || !s) return { ok: false };
    const item = s[kind] && s[kind][i];
    if (!item || item.sold) return { ok: false };
    if (run.gold < item.price) return { ok: false, reason: '골드가 부족해.' };
    if (kind === 'potions' && !run.potions.includes(null)) return { ok: false, reason: '물약 칸이 가득 찼어.' };
    run.gold -= item.price; item.sold = true;
    if (kind === 'cards') run.deck.push(newCard(run, item.id, item.up));
    if (kind === 'relics') addRelic(run, item.id);
    if (kind === 'potions') addPotion(run, item.id);
    return { ok: true };
  }
  function shopRemove(run) {
    const s = run.shop; if (run.screen !== 'shop' || !s || s.removeUsed) return { ok: false };
    const cost = removePrice(run);
    if (run.gold < cost) return { ok: false, reason: '골드가 부족해.' };
    if (run.deck.length <= 1) return { ok: false };
    run.pending = { mode: 'remove', after: 'shop', cancel: 'shop', cost }; run.screen = 'select'; return { ok: true };
  }
  function leaveShop(run) { if (run.screen !== 'shop') return { ok: false }; run.shop = null; run.screen = 'map'; return { ok: true }; }

  // ───────── 보물 ─────────
  function openChest(run) {
    const t = run.treasure; if (run.screen !== 'treasure' || !t || t.opened) return { ok: false };
    t.opened = true; run.gold += t.gold; run.stats.goldEarned += t.gold; trackGold(run);
    if (t.relic) addRelic(run, t.relic);
    return { ok: true };
  }
  function leaveTreasure(run) { if (run.screen !== 'treasure') return { ok: false }; if (!run.treasure.opened) openChest(run); run.treasure = null; run.screen = 'map'; return { ok: true }; }

  // ───────── 이벤트 ─────────
  function eventOptionOk(run, opt) {
    if (opt.need && opt.need.gold && run.gold < opt.need.gold) return false;
    if (opt.needPotion && !run.potions.some(p => p)) return false;
    if (opt.fx && opt.fx.upgrade && !run.deck.some(canUpgrade)) return false;
    return true;
  }
  function randomClassCard(run, rarity) {
    const r = rarity || weighted(run, { common: 55, uncommon: 35, rare: 10 });
    return pick(run, cardPool(run, r));
  }
  function applyEventFx(run, f) {
    const ev = run.event;
    if (f.gold) { run.gold = Math.max(0, run.gold + f.gold); if (f.gold > 0) { run.stats.goldEarned += f.gold; trackGold(run); } }
    if (f.maxHp) { run.maxHp += f.maxHp; if (f.maxHp > 0) run.hp += f.maxHp; run.hp = Math.min(run.hp, run.maxHp); }
    if (f.heal) run.hp = Math.min(run.maxHp, run.hp + f.heal);
    if (f.healPct) run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * f.healPct));
    if (f.hp) run.hp = Math.max(1, Math.min(run.maxHp, run.hp + f.hp)); // 이벤트로는 죽지 않음
    if (f.relic) { const r = randomRelic(run); if (r) addRelic(run, r); else run.gold += 50; ev.gotRelic = r; }
    if (f.card) {
      const id = f.card === 'rare' ? pick(run, cardPool(run, 'rare')) : f.card === 'random' ? randomClassCard(run) : f.card;
      run.deck.push(newCard(run, id)); ev.gotCard = id; seeCard(run, id);
    }
    if (f.potion) { const p = randomPotion(run); if (addPotion(run, p)) ev.gotPotion = p; }
    if (f.potion2) { const p = randomPotion(run); if (addPotion(run, p)) ev.gotPotion2 = p; }
    if (f.losePotion) { const i = run.potions.findIndex(p => p); if (i >= 0) run.potions[i] = null; }
    if (f.wound) { for (let i = 0; i < f.wound; i++) run.deck.push(newCard(run, 'wound')); ev.gotWound = f.wound; }
    if (f.upgradeRandom) { const ups = shuffle(run, run.deck.filter(canUpgrade)); ev.gotUpgrades = ups.slice(0, f.upgradeRandom).map(cd => { cd.up = true; return cd.id; }); }
    if (f.transform) {
      const cands = run.deck.filter(cd => isCollectible(D.CARDS[cd.id]) || cd.id === 'wound');
      if (cands.length) {
        const cd = pick(run, cands), nid = randomClassCard(run);
        ev.gotTransform = [cd.id, nid];
        cd.id = nid; cd.up = false; seeCard(run, nid);
      }
    }
    if (f.fight) { ev.fight = true; run.event = null; startCombat(run, f.fight, 'elite', { fromEvent: true }); return; }
    if (f.upgrade && run.deck.some(canUpgrade)) { run.pending = { mode: 'upgrade', after: 'event', cancel: 'event' }; run.screen = 'select'; }
    if (f.remove && run.deck.length > 1) { run.pending = { mode: 'remove', after: 'event', cancel: 'event' }; run.screen = 'select'; }
    if (f.dup) { run.pending = { mode: 'dup', after: 'event', cancel: 'event' }; run.screen = 'select'; }
  }
  function chooseEvent(run, i) {
    const ev = run.event; if (run.screen !== 'event' || !ev || ev.done) return { ok: false };
    const opt = D.EVENTS[ev.id].options[i];
    if (!opt || !eventOptionOk(run, opt)) return { ok: false, reason: '조건이 맞지 않아.' };
    ev.done = true;
    if (opt.chance) {
      const res = rnd(run) < opt.chance.p ? opt.chance.win : opt.chance.lose;
      ev.text = res.text; applyEventFx(run, res.fx || {});
    } else { ev.text = opt.text; applyEventFx(run, opt.fx || {}); }
    return { ok: true };
  }
  function leaveEvent(run) { if (run.screen !== 'event' || !run.event || !run.event.done) return { ok: false }; run.event = null; run.screen = 'map'; return { ok: true }; }

  // ───────── 영구 기록 / 해금 / 업적 ─────────
  function newMeta() {
    return { v: 2, runs: 0, wins: 0, bestFloor: 0, bestAct: 0, kills: 0, elites: 0, bosses: {}, heroWins: {}, heroRuns: {}, heroBestAsc: {},
             cardsSeen: [], relicsSeen: [], enemiesSeen: [], ach: {}, ascMax: 0, maxHit: 0, cardsPlayed: 0, dmgDealt: 0, potionsUsed: 0,
             goldEarned: 0, playMs: 0, tutorialDone: false, newGallery: [], heroXp: {}, storyRead: {}, ownedPacks: [], skins: {} };
  }
  function migrateMeta(m) {
    const n = newMeta();
    if (!m || typeof m !== 'object') return n;
    const hadPackField = Array.isArray(m.ownedPacks);
    for (const k of Object.keys(n)) if (m[k] !== undefined) n[k] = m[k];
    if (!Array.isArray(n.cardsSeen)) n.cardsSeen = [];
    if (m.updatedAt) n.updatedAt = m.updatedAt;
    if (m.xpMigratedFrom) n.xpMigratedFrom = m.xpMigratedFrom;
    if (!n.heroXp || typeof n.heroXp !== 'object') n.heroXp = {};
    if (!n.storyRead || typeof n.storyRead !== 'object') n.storyRead = {};
    // v1.1 이하 기록: 히로인 경험치가 없으면 남아 있는 기록(히로인별 원정·클리어 수)으로 보수적으로 계산
    if (m.heroXp === undefined && (m.runs || 0) > 0) {
      for (const h of Object.keys(D.MASTERY.heroes)) {
        const r = (n.heroRuns && n.heroRuns[h]) || 0, w = (n.heroWins && n.heroWins[h]) || 0;
        n.heroXp[h] = Math.min(D.MASTERY.curve[D.MASTERY.curve.length - 1], Math.max(0, r - w) * 40 + w * 300);
      }
      n.xpMigratedFrom = 'v1.1';
    }
    n.v = 3;
    if (!hadPackField) n.ownedPacks = ['dlc-night-trio'];
    else n.ownedPacks = n.ownedPacks.filter(id => D.SHOP.packs[id]);
    if (!n.skins || typeof n.skins !== 'object' || Array.isArray(n.skins)) n.skins = {};
    for (const h of Object.keys(n.skins)) if (!skinFor(n, h)) delete n.skins[h];
    return n;
  }
  const GALLERY_REQ = { g_sera: 'win_sera', g_luna: 'win_luna', g_yuki: 'win_yuki', g_aria: 'win_aria', g_morgana: 'boss_morgana', g_belita: 'boss_belita',
    g_celes: 'boss_celes', g_nyx: 'boss_nyx', g_asc5: 'asc5', g_asc10: 'asc10', g_elite: 'elite10' };
  function galleryUnlocked(meta, gid) {
    if (gid === 'g_party') return ['win_sera', 'win_luna', 'win_yuki', 'win_aria'].every(a => meta.ach[a]);
    return !!meta.ach[GALLERY_REQ[gid]];
  }
  function heroUnlocked(meta, id) {
    const s = D.STARTERS[id];
    if (!s) return false;
    if (s.locked && !(meta.ach && meta.ach.boss_belita)) return false;
    if (s.pack && !ownsPack(meta, s.pack)) return false;
    return true;
  }
  function offerOpen(now) {
    if (!D.SHOP.offerUntil) return true;
    const end = Date.parse(D.SHOP.offerUntil);
    const t = now == null ? Date.now() : +now;
    return !isNaN(end) && t <= end;
  }
  function ownsPack(meta, id) { return !!(meta && Array.isArray(meta.ownedPacks) && meta.ownedPacks.includes(id)); }
  function skinOffer(hero) {
    for (const pid of Object.keys(D.SHOP.packs)) {
      const p = D.SHOP.packs[pid];
      if (p.kind === 'skin' && p.skins && p.skins[hero]) return { pid, pack: p, skin: p.skins[hero] };
    }
    return null;
  }
  function skinFor(meta, hero) {
    const o = skinOffer(hero);
    if (!o || !ownsPack(meta, o.pid)) return null;
    if (!meta.skins || meta.skins[hero] !== o.skin.id) return null;
    return o.skin;
  }
  function claimPack(meta, id, now) {
    const p = D.SHOP.packs[id];
    if (!p) return { ok: false, reason: '없는 상품이야.' };
    if (!Array.isArray(meta.ownedPacks)) meta.ownedPacks = [];
    if (meta.ownedPacks.includes(id)) return { ok: false, reason: '이미 가지고 있어.' };
    if (!offerOpen(now)) return { ok: false, reason: '무료 기간이 끝났어. 이미 받은 것은 그대로야.' };
    // 보유만 기록한다. 경험치·스토리·업적·승수는 플레이로만 오른다.
    meta.ownedPacks.push(id);
    if (p.kind === 'skin') {
      if (!meta.skins || typeof meta.skins !== 'object') meta.skins = {};
      for (const h of Object.keys(p.skins)) meta.skins[h] = p.skins[h].id;
    }
    return { ok: true };
  }
  function toggleSkin(meta, hero) {
    const o = skinOffer(hero);
    if (!o) return { ok: false, reason: '장식이 없는 히로인이야.' };
    if (!ownsPack(meta, o.pid)) return { ok: false, reason: '상점에서 외형을 받아야 해.' };
    if (!meta.skins || typeof meta.skins !== 'object') meta.skins = {};
    if (meta.skins[hero] === o.skin.id) delete meta.skins[hero];
    else meta.skins[hero] = o.skin.id;
    return { ok: true, on: meta.skins[hero] === o.skin.id };
  }
  function unlockedCards(meta) { return Object.keys(D.ACHIEVEMENTS).filter(a => meta.ach[a] && D.ACHIEVEMENTS[a].card).map(a => D.ACHIEVEMENTS[a].card); }
  function liveCount(meta, run, k) { return (meta[k] || 0) + (run && !run.recorded ? run.stats[k] : 0); }
  function achDone(meta, run, id) {
    const s = run ? run.stats : null;
    const won = run && run.over && run.won;
    switch (id) {
      case 'first_win': return won || meta.wins > 0;
      case 'win_sera': case 'win_luna': case 'win_yuki': case 'win_aria': case 'win_mariel': case 'win_serena': case 'win_odette': return won && run.starter === id.slice(4);
      case 'boss_morgana': case 'boss_belita': case 'boss_celes': case 'boss_nyx': return !!s && s.bosses.includes(id.slice(5));
      case 'big_hit': return !!s && s.maxHit >= 40;
      case 'chain10': return !!s && s.maxCardsTurn >= 10;
      case 'poison30': return !!s && s.maxPoison >= 30;
      case 'block50': return !!s && s.maxBlock >= 50;
      case 'elite10': return liveCount(meta, run, 'elites') >= 10;
      case 'kills100': return liveCount(meta, run, 'kills') >= 100;
      case 'rich': return !!s && s.maxGold >= 400;
      case 'relics12': return !!run && run.relics.length >= 12;
      case 'thin_deck': return !!s && s.bosses.includes('celes') && run.deck.length <= 15;
      case 'no_dmg_elite': return !!s && s.flawlessElite;
      case 'asc1': return won && run.asc >= 1;
      case 'asc5': return won && run.asc >= 5;
      case 'asc10': return won && run.asc >= 10;
      case 'collector': { const set = new Set(meta.cardsSeen.concat(run ? run.cardsSeen.concat(run.deck.map(c => c.id)) : [])); return [...set].filter(x => D.CARDS[x] && isCollectible(D.CARDS[x])).length >= 80; }
    }
    return false;
  }
  // 새로 달성한 업적 id 목록을 돌려주고 meta에 기록
  function checkAchievements(meta, run) {
    const got = [];
    for (const id of Object.keys(D.ACHIEVEMENTS)) {
      if (meta.ach[id]) continue;
      if (achDone(meta, run, id)) {
        meta.ach[id] = Date.now(); got.push(id);
        for (const g of Object.keys(D.GALLERY)) if (galleryUnlocked(meta, g) && !meta.newGallery.includes(g)) meta.newGallery.push(g);
      }
    }
    if (run) for (const cid of unlockedCards(meta)) if (!run.unlocked.includes(cid)) run.unlocked.push(cid);
    return got;
  }
  // ───────── 히로인 레벨 ─────────
  function levelOf(xp) {
    const c = D.MASTERY.curve; let lv = 1;
    for (let i = 1; i < c.length; i++) if (xp >= c[i]) lv = i + 1;
    return lv;
  }
  function heroLevel(meta, h) {
    const xp = (meta.heroXp && meta.heroXp[h]) || 0, c = D.MASTERY.curve, lv = levelOf(xp);
    const cur = c[lv - 1], next = lv < c.length ? c[lv] : null;
    return { lv, xp, cur, next, max: next == null, pct: next == null ? 1 : (xp - cur) / (next - cur) };
  }
  function masteryHas(meta, h, kind, id) {
    if (!D.MASTERY.heroes[h]) return false;
    const lv = heroLevel(meta, h).lv;
    return D.MASTERY.track(h).some(t => t.kind === kind && (id === undefined || t.id === id || t.ch === id) && lv >= t.lv);
  }
  function masteryCards(meta) {
    const out = [];
    for (const h of Object.keys(D.MASTERY.heroes)) for (const t of D.MASTERY.track(h)) if (t.kind === 'card' && heroLevel(meta, h).lv >= t.lv) out.push(t.id);
    return out;
  }
  function heroTitle(meta, h) {
    const m = D.MASTERY.heroes[h]; if (!m) return null;
    const lv = heroLevel(meta, h).lv;
    return lv >= 10 ? m.titles[1] : lv >= 8 ? m.titles[0] : null;
  }
  // 원정 시작 옵션(레벨 보상 반영). choice = { relic: 'base'|'alt', deck: 'base'|'alt' }
  function runOptions(meta, h, choice) {
    choice = choice || {};
    const m = D.MASTERY.heroes[h], o = { unlocked: unlockedCards(meta).concat(masteryCards(meta)) };
    if (!m) return o;
    if (choice.relic === 'alt' && masteryHas(meta, h, 'relic')) o.relic = m.relic;
    if (choice.deck === 'alt' && masteryHas(meta, h, 'deck')) o.deck = m.deck.cards.slice();
    o.passive = masteryHas(meta, h, 'passive');
    o.potion = masteryHas(meta, h, 'potion');
    return o;
  }
  function runXp(run) {
    const X = D.MASTERY.xp, s = run.stats;
    const floors = Math.max(0, (run.act - 1) * 11 + run.floor - (run.won ? 0 : 1));
    const parts = [
      { k: '오른 층', n: floors, xp: floors * X.floor },
      { k: '엘리트', n: s.elites, xp: s.elites * X.elite },
      { k: '보스', n: s.bosses.length, xp: s.bosses.length * X.boss }
    ];
    if (run.won) parts.push({ k: '원정 성공', n: 1, xp: X.win });
    return { parts, total: parts.reduce((a, p) => a + p.xp, 0) };
  }
  function awardXp(meta, run) {
    const h = run.starter;
    if (!D.MASTERY.heroes[h]) return null;
    meta.heroXp = meta.heroXp || {};
    const before = heroLevel(meta, h), g = runXp(run);
    const cap = D.MASTERY.curve[D.MASTERY.curve.length - 1];
    meta.heroXp[h] = Math.min(cap, before.xp + g.total);
    const after = heroLevel(meta, h);
    const unlocks = D.MASTERY.track(h).filter(t => t.lv > before.lv && t.lv <= after.lv);
    return { hero: h, before, after, gain: after.xp - before.xp, parts: g.parts, unlocks };
  }

  function recordRun(meta, run) {
    run.xpResult = awardXp(meta, run);
    meta.runs++; meta.kills += run.stats.kills; meta.elites += run.stats.elites;
    meta.cardsPlayed += run.stats.cardsPlayed; meta.dmgDealt += run.stats.dmgDealt; meta.potionsUsed += run.stats.potionsUsed; meta.goldEarned += run.stats.goldEarned;
    meta.maxHit = Math.max(meta.maxHit, run.stats.maxHit);
    const prog = (run.act - 1) * 11 + run.floor;
    meta.bestFloor = Math.max(meta.bestFloor, prog); meta.bestAct = Math.max(meta.bestAct, run.act);
    meta.heroRuns[run.starter] = (meta.heroRuns[run.starter] || 0) + 1;
    for (const b of run.stats.bosses) meta.bosses[b] = (meta.bosses[b] || 0) + 1;
    if (run.won) {
      meta.wins++; meta.heroWins[run.starter] = (meta.heroWins[run.starter] || 0) + 1;
      meta.heroBestAsc[run.starter] = Math.max(meta.heroBestAsc[run.starter] || 0, run.asc);
      meta.ascMax = Math.max(meta.ascMax, Math.min(10, run.asc + 1));
    }
    const merge = (k, arr) => { const s = new Set(meta[k]); arr.forEach(x => s.add(x)); meta[k] = [...s]; };
    merge('cardsSeen', run.cardsSeen.concat(run.deck.map(c => c.id)));
    merge('relicsSeen', run.relicsSeen); merge('enemiesSeen', run.enemiesSeen);
    run.recorded = true;
    return meta;
  }

  // ───────── 카드 설명문 ─────────
  function josa(word, a, b) {
    const ch = word.charCodeAt(word.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return word + b;
    return word + ((ch - 0xAC00) % 28 ? a : b);
  }
  // ctx: { p: 플레이어 엔티티(st), target } 가 있으면 실제 수치로 보여줌
  function describe(def, ctx) {
    const out = [];
    const P = ctx && ctx.p;
    const num = (base, kind, e) => {
      if (!P) return String(base);
      let v = base;
      if (kind === 'atk') v = calcAttack(P, ctx.target || null, base, { vigor: def.type === 'attack' ? (P.st.vigor || 0) : 0, strMult: e && e.strMult, shiv: def.id === 'shiv' });
      if (kind === 'blk') v = Math.max(0, base + (P.st.dex || 0));
      const cls = v > base ? 'up' : v < base ? 'down' : '';
      return cls ? `<b class="${cls}">${v}</b>` : String(v);
    };
    const S = s => D.STATUS[s].name;
    const fnC = (ctx && ctx.fn) || 0;
    const effList = def.effects;
    for (const e of effList) {
      switch (e.t) {
        case 'dmg': {
          let s;
          if (e.hitsFrom === 'atk') s = `이번 턴에 낸 공격 카드 1장당 피해 ${num(e.v, 'atk', e)}.`;
          else if (e.hitsFrom === 'skill') s = `이번 턴에 낸 스킬 카드 1장당 피해 ${num(e.v, 'atk', e)}.`;
          else s = (e.hits || 1) > 1 ? `피해 ${num(e.v + (e.fn ? e.fn * fnC : 0), 'atk', e)}를 ${e.hits}번.` : `피해 ${num(e.v + (e.fn ? e.fn * fnC : 0), 'atk', e)}.`;
          if (e.fn) s += ` 각주당 +${e.fn}.`;
          if (e.strMult) s += ` 힘이 ${e.strMult}배로 적용.`;
          if (e.bonusIfWeak) s += ` 약화된 적에겐 +${e.bonusIfWeak}.`;
          out.push(s); break;
        }
        case 'dmgAll': if (e.fn) { out.push(`모든 적에게 피해 ${num(e.v + e.fn * fnC, 'atk')}. 각주당 +${e.fn}.`); break; }
          out.push(e.hits === 'X' ? `모든 적에게 피해 ${num(e.v, 'atk')}를 X번.` : (e.hits || 1) > 1 ? `모든 적에게 피해 ${num(e.v, 'atk')}를 ${e.hits}번.` : `모든 적에게 피해 ${num(e.v, 'atk')}.`); break;
        case 'dmgRandom': out.push(`무작위 적에게 피해 ${num(e.v, 'atk')}를 ${e.hits}번.`); break;
        case 'dmgBlock': out.push('현재 방어도만큼 피해.'); break;
        case 'dmgBlockAll': out.push('현재 방어도만큼 모든 적에게 피해.'); break;
        case 'dmgPoison': out.push(e.m > 1 ? `대상 중독 수치의 ${e.m}배만큼 피해.` : '대상 중독 수치만큼 피해.'); break;
        case 'dmgAllThorns': out.push(`가시 수치 ×${e.m}만큼 모든 적에게 피해.`); break;
        case 'block': out.push(`방어도 ${num(e.v + (e.fn ? e.fn * fnC : 0), 'blk')}.` + (e.fn ? ` 각주당 +${e.fn}.` : '')); break;
        case 'doll': out.push(`인형(체력 ${e.hp}·공격 ${e.atk}) 세우기.`); break;
        case 'dollHp': out.push(`모든 인형 체력 +${e.v}.`); break;
        case 'dmgPerDoll': out.push(`피해 ${num(e.v, 'atk')}를 (인형 수+1)번${P && ctx.allies != null ? ` (지금 ${ctx.allies + 1}번)` : ''}.`); break;
        case 'blockPerDoll': out.push(`방어도 ${e.base ? e.base + ' + ' : ''}인형 1체당 ${e.v}.`); break;
        case 'breakDoll': out.push('맨 뒤 인형 1체를 부숴서' + [e.draw ? ` 카드 ${e.draw}장 뽑기` : '', e.energy ? ` 에너지 +${e.energy}` : '', e.boom ? ` 모든 적에게 그 인형 최대 체력×${e.boom} 피해` : ''].filter(Boolean).join(',') + '. (인형이 없으면 효과 없음)'); break;
        case 'dollAct': out.push(e.n > 1 ? `인형 전원 즉시 ${e.n}번 행동.` : '인형 전원 즉시 행동.'); break;
        case 'reviveDolls': out.push('부서진 인형을 체력 절반으로 모두 복구(최대 3체).'); break;
        case 'moonShift': out.push(`달의 위상을 ${e.v}칸 더 넘김.`); break;
        case 'moonSet': out.push(`다음 카드를 ${['🌒초승', '🌓반달', '🌕보름', '🌑그믐'][(e.v + 1) % 4]} 위상에서 내도록 맞춤.`); break;
        case 'dmgMoon': out.push(`피해 ${num(e.v, 'atk')}를 (이번 턴 위상이 바뀐 수+1)번.`); break;
        case 'fnAll': out.push(`손의 보존 카드 각주 +${e.v}.`); break;
        case 'blockFn': out.push(`방어도 ${e.base || 0} + 손 카드 각주 합×${e.m}.`); break;
        case 'recall': out.push('버린 더미 맨 위 카드를 손으로.'); break;
        case 'upgradeRetain': out.push('손의 보존 카드 모두 강화.'); break;
        case 'blockDex': out.push(`민첩 ×${e.m}만큼 방어도.`); break;
        case 'doubleBlock': out.push('방어도를 2배로.'); break;
        case 'draw': out.push(`카드 ${e.v}장 뽑기.`); break;
        case 'energy': out.push(`에너지 +${e.v}${e.once ? ' (턴당 1번)' : ''}.`); break;
        case 'energyIfAtk': out.push(`이번 턴 공격 카드 ${e.n}장째면 에너지 +${e.v}.`); break;
        case 'apply': out.push(`${S(e.s)} ${e.v} 부여.`); break;
        case 'applyAll': out.push(`모든 적에게 ${S(e.s)} ${e.v}.`); break;
        case 'self': {
          const st = D.STATUS[e.s];
          out.push(st.power ? st.desc(e.v) : `${josa(st.name, '을', '를')} ${e.v} 얻음.`); break;
        }
        case 'doubleStr': out.push('힘을 2배로.'); break;
        case 'heal': out.push(`체력 ${e.v} 회복.`); break;
        case 'loseHp': out.push(`체력 ${e.v} 잃음.`); break;
        case 'cleanse': out.push('내 디버프 모두 제거.'); break;
        case 'add': out.push(`${josa(D.CARDS[e.id].name, '을', '를')} ${e.n}장 ${e.to === 'hand' ? '손에' : e.to === 'draw' ? '뽑을 카드에' : '버린 카드에'} 추가.`); break;
        case 'upgradeHand': out.push(e.v === 'all' ? '손의 모든 카드 강화.' : '손의 카드 1장 강화.'); break;
        case 'multiplyPoison': out.push(`대상의 중독을 ${e.v}배로.`); break;
        case 'exhaustBurns': out.push(`손의 「화상」을 모두 소멸시키고, 1장당 모든 적에게 피해 ${num(e.v, 'atk')}.`); break;
        case 'rawDmg': out.push(`피해 ${e.v}.`); break;
        case 'rawDmgAll': out.push(`모든 적에게 피해 ${e.v}.`); break;
        case 'rawBlock': out.push(`방어도 ${e.v}.`); break;
      }
    }
    if (def.moon) { const sub = describe({ effects: def.moon.effects, type: def.type, id: def.id }, ctx); out.push(`${['🌒초승', '🌓반달', '🌕보름', '🌑그믐'][def.moon.p]}이면: ${sub}`); }
    if (def.text) out.push(def.text);
    const kw = [];
    if (def.retain) kw.push('보존');
    if (def.innate) kw.push('선천성');
    if (def.ethereal) kw.push('휘발성');
    if (def.exhaust) kw.push('소멸');
    if (kw.length) out.push(kw.join(' · ') + '.');
    return out.join(' ');
  }
  // 강화 전후 차이: { cost:[a,b]|null, html } — 숫자가 바뀐 곳만 a→b로 강조
  function upgradeDiff(id) {
    const a = cardDef({ id, up: false }), b = cardDef({ id, up: true });
    if (!D.CARDS[id].up) return null;
    const ta = describe(a), tb = describe(b);
    const sa = ta.split(/(\d+)/), sb = tb.split(/(\d+)/);
    let html;
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    if (sa.length === sb.length && sa.every((x, i) => i % 2 === 1 || x === sb[i])) {
      html = sa.map((x, i) => i % 2 === 0 ? esc(x) : (x === sb[i] ? x : `<b class="diff">${x}→${sb[i]}</b>`)).join('');
    } else html = `<b class="diff">${esc(tb)}</b>`;
    const cost = a.cost !== b.cost ? [a.cost, b.cost] : null;
    const changes = [];
    if (cost) changes.push(`비용 ${cost[0] === -1 ? 'X' : cost[0]} → ${cost[1] === -1 ? 'X' : cost[1]}`);
    if (!!a.exhaust !== !!b.exhaust) changes.push(b.exhaust ? '소멸 추가' : '소멸 제거');
    const strip = t => t.replace(/ ?(보존|선천성|휘발성|소멸)( · (보존|선천성|휘발성|소멸))*\.$/, '');
    if (strip(ta) !== strip(tb)) changes.push('효과 강화');
    if (strip(ta) === strip(tb) && ta !== tb) html = strip(tb).replace(/[&<>]/g, '');
    return { cost, html, changes, before: ta, after: tb };
  }

  const E = {
    D, LAST_ACT, rnd, cardDef, canUpgrade, needsTarget, isCollectible, newRun, genMap, availableNodes, chooseNode,
    canPlay, playCard, endTurn, usePotion, discardPotion, intentView, incomingDamage, incomingNet, calcAttack, aliveEnemies, maxEnergy,
    takeGold, takeCard, skipCard, takeRelic, takeBossRelic, takePotion, leaveReward, synergy, rewardCount,
    restHeal, restHealAmount, restSmith, selectableCards, selectCard, cancelSelect,
    buy, shopRemove, removePrice, leaveShop, openChest, leaveTreasure, chooseEvent, eventOptionOk, leaveEvent,
    newMeta, migrateMeta, recordRun, heroLevel, masteryHas, masteryCards, heroTitle, runOptions, runXp, awardXp, levelOf, checkAchievements, heroUnlocked, unlockedCards, galleryUnlocked,
    offerOpen, ownsPack, claimPack, skinFor, skinOffer, toggleSkin,
    describe, upgradeDiff, josa, hasRelic, startCombat, summonDoll, moonAdvance, MOON, MOON_ICON, DOLL_MAX
  };
  root.BD_ENGINE = E;
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
