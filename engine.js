/* 미녀 덱: 밤의 여왕 — 게임 엔진 (DOM 없음, 브라우저/Node 공용)
 * 모든 게임 상태는 run 객체 하나에 들어 있고, JSON으로 그대로 저장/복원됩니다.
 * UI는 run.screen 값을 보고 화면을 그리며, run.fx 배열(연출 이벤트)을 소비합니다.
 */
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./data.js') : root.BD_DATA;

  const FLOORS = 12;       // 보스 전 층 수
  const WIDTH = 5;         // 지도 가로 칸 수
  const HAND_MAX = 10;
  const BASE_ENERGY = 3;
  const BASE_DRAW = 5;

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
  const canUpgrade = card => !card.up && !!D.CARDS[card.id].up;
  function newCard(run, id, up) { return { uid: run.nextUid++, id, up: !!up }; }
  function needsTarget(def) { return def.effects.some(e => ['dmg', 'apply', 'multiplyPoison', 'rawDmg'].includes(e.t)); }

  // ───────── 런 생성 ─────────
  function newRun(starterId, seed) {
    const s = D.STARTERS[starterId];
    if (!s) throw new Error('Unknown starter ' + starterId);
    seed = (seed == null ? Math.floor(Math.random() * 2 ** 31) : seed) | 0;
    const run = {
      v: 1, seed, rng: seed, nextUid: 1, starter: starterId, cls: s.cls,
      hp: s.hp, maxHp: s.hp, gold: s.gold, deck: [], relics: [], potions: [null, null, null],
      floor: 0, pos: null, visited: [], map: null, screen: 'map', over: false, won: false,
      combat: null, rewards: null, shop: null, event: null, treasure: null, pending: null,
      removeCost: 75, lastEnc: null, eventsSeen: [], cardsSeen: [],
      stats: { kills: 0, elites: 0, cardsPlayed: 0, dmgDealt: 0, turns: 0 },
      fx: []
    };
    s.deck.forEach(id => run.deck.push(newCard(run, id)));
    run.map = genMap(run);
    addRelic(run, s.relic);
    return run;
  }

  // ───────── 지도 ─────────
  function genMap(run) {
    const nodes = {};
    const edges = []; // [f, c, nc]
    const get = (f, c) => nodes[f + '-' + c] || (nodes[f + '-' + c] = { id: f + '-' + c, floor: f, col: c, type: null, next: [], prev: [] });
    const starts = [];
    for (let p = 0; p < 5; p++) {
      let c = ri(run, 0, WIDTH - 1);
      if (p === 1) { let g = 0; while (c === starts[0] && g++ < 20) c = ri(run, 0, WIDTH - 1); }
      starts.push(c);
      for (let f = 0; f < FLOORS; f++) {
        const n = get(f, c);
        if (f === FLOORS - 1) break;
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
    const boss = { id: 'boss', floor: FLOORS, col: 2, type: 'boss', next: [], prev: [] };
    nodes.boss = boss;
    // 칸 종류 배정
    const order = Object.values(nodes).filter(n => n.id !== 'boss').sort((a, b) => a.floor - b.floor);
    for (const n of order) {
      if (n.floor === 0) n.type = 'monster';
      else if (n.floor === 6) n.type = 'treasure';
      else if (n.floor === FLOORS - 1) n.type = 'rest';
      else {
        const w = { monster: 46, event: 22, elite: n.floor >= 4 ? 11 : 0, rest: n.floor >= 4 && n.floor !== FLOORS - 2 ? 11 : 0, shop: n.floor >= 2 ? 9 : 0 };
        let t, tries = 0;
        do {
          t = weighted(run, w); tries++;
        } while (tries < 20 && ['elite', 'rest', 'shop'].includes(t) && n.prev.some(pid => nodes[pid].type === t));
        n.type = t;
      }
      if (n.floor === FLOORS - 1) { n.next = ['boss']; boss.prev.push(n.id); }
    }
    return { nodes, floors: FLOORS, width: WIDTH };
  }
  function availableNodes(run) {
    if (run.screen !== 'map') return [];
    if (!run.pos) return Object.values(run.map.nodes).filter(n => n.floor === 0).map(n => n.id);
    return run.map.nodes[run.pos].next.slice();
  }
  function chooseNode(run, id) {
    if (!availableNodes(run).includes(id)) return { ok: false, reason: '갈 수 없는 칸이야.' };
    const n = run.map.nodes[id];
    run.pos = id; run.visited.push(id); run.floor = n.floor + 1;
    switch (n.type) {
      case 'monster': {
        const pool = D.ENCOUNTERS[n.floor < 3 ? 'easy' : 'normal'];
        let enc, g = 0;
        do { enc = pick(run, pool); } while (g++ < 10 && run.lastEnc && enc.join() === run.lastEnc);
        run.lastEnc = enc.join();
        startCombat(run, enc, 'monster'); break;
      }
      case 'elite': {
        const pool = D.ENCOUNTERS.elite;
        let enc, g = 0;
        do { enc = pick(run, pool); } while (g++ < 10 && run.lastElite && enc.join() === run.lastElite);
        run.lastElite = enc.join();
        startCombat(run, enc, 'elite'); break;
      }
      case 'boss': startCombat(run, pick(run, D.ENCOUNTERS.boss), 'boss'); break;
      case 'rest': run.screen = 'rest'; break;
      case 'shop': run.shop = genShop(run); run.screen = 'shop'; break;
      case 'treasure': run.treasure = { relic: randomRelic(run), gold: ri(run, 25, 45), opened: false }; run.screen = 'treasure'; break;
      case 'event': {
        const all = Object.keys(D.EVENTS);
        let pool = all.filter(k => !run.eventsSeen.includes(k));
        if (!pool.length) pool = all;
        const id = pick(run, pool);
        run.eventsSeen.push(id);
        run.event = { id, done: false, text: null };
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
    if (id === 'blood_rose') { run.maxHp += 10; run.hp = Math.min(run.maxHp, run.hp + 10); }
  }
  function randomRelic(run) {
    const pool = Object.keys(D.RELICS).filter(k => !D.RELICS[k].starter && !hasRelic(run, k));
    return pool.length ? pick(run, pool) : null;
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
      return c.rarity === rarity && (c.cls === run.cls || c.cls === 'neutral');
    });
  }
  function rollRarity(run, kind) {
    const w = kind === 'elite' ? { common: 50, uncommon: 38, rare: 12 } : kind === 'shop' ? { common: 50, uncommon: 37, rare: 13 } : { common: 62, uncommon: 32, rare: 6 };
    return weighted(run, w);
  }
  function genCardChoices(run, n, kind) {
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 100) {
      const id = pick(run, cardPool(run, rollRarity(run, kind)));
      if (id && !out.includes(id)) out.push(id);
    }
    out.forEach(id => { if (!run.cardsSeen.includes(id)) run.cardsSeen.push(id); });
    return out.map(id => ({ id, up: false }));
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
    const hp = ri(run, d.hp[0], d.hp[1]);
    return { uid: run.nextUid++, id, name: d.name, hp, maxHp: hp, block: 0, st: Object.assign({}, d.start || {}),
             phase: 0, firstDone: false, cyc: 0, hist: [], intent: null, dead: false, minion: !!minion };
  }
  function startCombat(run, ids, kind) {
    const c = run.combat = {
      kind, enemies: ids.map(id => mkEnemy(run, id)), draw: [], hand: [], disc: [], exh: [],
      energy: 0, p: { isPlayer: true, block: 0, st: {} }, turn: 0, atkThisTurn: 0, cardsThisTurn: 0, over: false
    };
    const deck = shuffle(run, run.deck.map(cd => ({ uid: cd.uid, id: cd.id, up: cd.up })));
    const innate = deck.filter(cd => cardDef(cd).innate), rest = deck.filter(cd => !cardDef(cd).innate);
    c.draw = rest.concat(innate); // 배열 끝에서 뽑음
    run.screen = 'combat';
    run.rewards = null;
    for (const e of c.enemies) { const d = D.ENEMIES[e.id]; if (d.intro) fx(run, { k: 'say', who: e.uid, text: d.intro }); }
    // 전투 시작 유물
    if (hasRelic(run, 'shadow_hood')) for (let i = 0; i < 2; i++) c.hand.push(newCard(run, 'shiv'));
    if (hasRelic(run, 'guard_charm')) c.p.block += 10;
    if (hasRelic(run, 'dragon_heart')) addSt(c.p, 'str', 1);
    if (hasRelic(run, 'glowstick')) addSt(c.p, 'vigor', 8);
    if (hasRelic(run, 'viper_fang')) c.enemies.forEach(e => addSt(e, 'vuln', 1));
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
      key = Object.values(w).some(v => v > 0) ? weighted(run, w) : Object.keys(ai.w)[0];
    }
    e.firstDone = true;
    e.intent = key;
  }

  function calcAttack(src, tgt, base, extra) {
    let d = base + (src.st.str || 0) + (extra || 0);
    if (src.st.weak) d *= 0.75;
    if (tgt && tgt.st.vuln) d *= 1.5;
    return Math.max(0, Math.floor(d));
  }
  function gainBlock(run, x, v) { if (v <= 0) return; x.block += v; fx(run, { k: 'block', who: whoId(x), v }); }
  function playerBlock(run, v) { const c = C(run); gainBlock(run, c.p, Math.max(0, v + (c.p.st.dex || 0))); }

  function applyDamage(run, tgt, amount, src, isAttack) {
    if (!tgt || (!tgt.isPlayer && tgt.dead) || run.over) return 0;
    const blocked = Math.min(tgt.block, amount);
    tgt.block -= blocked;
    const lose = Math.min(amount - blocked, hpOf(run, tgt));
    setHp(run, tgt, hpOf(run, tgt) - lose);
    fx(run, { k: 'dmg', who: whoId(tgt), v: amount - blocked, blocked });
    if (src && src.isPlayer && !tgt.isPlayer) run.stats.dmgDealt += lose;
    afterHpChange(run, tgt);
    if (run.over) return lose;
    if (isAttack && src && tgt.st.thorns && !(src.dead)) applyDamage(run, src, tgt.st.thorns, tgt, false);
    if (isAttack && src && src.isPlayer && lose > 0 && src.st.envenom && !tgt.dead) addSt(tgt, 'poison', src.st.envenom);
    return lose;
  }
  function loseHp(run, tgt, v) {
    if (run.over) return;
    const lose = Math.min(v, hpOf(run, tgt));
    setHp(run, tgt, hpOf(run, tgt) - lose);
    fx(run, { k: 'dmg', who: whoId(tgt), v: lose, blocked: 0, poison: true });
    afterHpChange(run, tgt);
  }
  function afterHpChange(run, x) {
    if (x.isPlayer) { if (run.hp <= 0) endRun(run, false); return; }
    const d = D.ENEMIES[x.id];
    if (x.hp <= 0 && !x.dead) {
      x.dead = true; x.block = 0; run.stats.kills++;
      fx(run, { k: 'die', who: x.uid });
      if (d.death) fx(run, { k: 'say', who: x.uid, text: d.death });
      if (d.boss) C(run).enemies.forEach(e => { if (e.minion && !e.dead) { e.dead = true; e.hp = 0; fx(run, { k: 'die', who: e.uid }); } });
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
      fx(run, { k: 'phase', who: x.uid });
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
      c.hand.push(c.draw.pop());
    }
  }

  function startPlayerTurn(run) {
    const c = C(run);
    if (run.over || c.over) return;
    c.turn++; run.stats.turns++;
    c.atkThisTurn = 0; c.cardsThisTurn = 0;
    if (c.turn > 1 && !c.p.st.barricade) c.p.block = 0;
    if (c.p.st.poison) { const p = c.p.st.poison; addSt(c.p, 'poison', -1); loseHp(run, c.p, p); if (run.over) return; }
    if (c.p.st.ritual) addSt(c.p, 'str', c.p.st.ritual);
    c.energy = BASE_ENERGY + (c.p.st.energyUp || 0)
      + (c.turn === 1 && hasRelic(run, 'moon_pendant') ? 1 : 0)
      + (c.turn % 3 === 0 && hasRelic(run, 'sun_pin') ? 1 : 0);
    drawCards(run, BASE_DRAW + (c.p.st.drawUp || 0) + (c.turn === 1 && hasRelic(run, 'firefly') ? 2 : 0));
    fx(run, { k: 'turn', who: 'p', turn: c.turn });
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
    for (const e of effects) {
      if (run.over || c.over) return;
      switch (e.t) {
        case 'dmg': {
          const hits = e.hitsFrom === 'atk' ? c.atkThisTurn : (e.hits || 1);
          for (let h = 0; h < hits; h++) { if (!target || target.dead || run.over) break; applyDamage(run, target, calcAttack(P, target, e.v, ctx.vigor), P, true); }
          break;
        }
        case 'dmgAll': {
          const hits = e.hits === 'X' ? ctx.x : (e.hits || 1);
          for (let h = 0; h < hits; h++) for (const t of aliveEnemies(run)) { if (run.over) break; applyDamage(run, t, calcAttack(P, t, e.v, ctx.vigor), P, true); }
          break;
        }
        case 'dmgRandom': {
          for (let h = 0; h < (e.hits || 1); h++) { const al = aliveEnemies(run); if (!al.length || run.over) break; const t = pick(run, al); applyDamage(run, t, calcAttack(P, t, e.v, ctx.vigor), P, true); }
          break;
        }
        case 'dmgBlock': if (target && !target.dead) applyDamage(run, target, calcAttack(P, target, P.block, ctx.vigor), P, true); break;
        case 'rawDmg': if (target && !target.dead) applyDamage(run, target, e.v, P, false); break;
        case 'block': playerBlock(run, e.v); break;
        case 'rawBlock': gainBlock(run, P, e.v); break;
        case 'doubleBlock': gainBlock(run, P, P.block); break;
        case 'draw': drawCards(run, e.v); break;
        case 'energy': c.energy += e.v; break;
        case 'apply': if (target && !target.dead) { addSt(target, e.s, e.v); fx(run, { k: 'debuff', who: target.uid, s: e.s }); } break;
        case 'applyAll': aliveEnemies(run).forEach(t => { addSt(t, e.s, e.v); fx(run, { k: 'debuff', who: t.uid, s: e.s }); }); break;
        case 'self': addSt(P, e.s, e.v); fx(run, { k: 'buff', who: 'p', s: e.s }); break;
        case 'heal': healPlayer(run, e.v); break;
        case 'loseHp': loseHp(run, P, e.v); break;
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
        case 'multiplyPoison': if (target && !target.dead && target.st.poison) { target.st.poison *= e.v; fx(run, { k: 'debuff', who: target.uid, s: 'poison' }); } break;
      }
    }
  }
  function healPlayer(run, v) {
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + v);
    if (run.hp > before) fx(run, { k: 'heal', who: 'p', v: run.hp - before });
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
    c.cardsThisTurn++; run.stats.cardsPlayed++;
    fx(run, { k: 'play', card: { id: card.id, up: card.up }, target: target ? target.uid : null });
    if (c.p.st.afterImage) gainBlock(run, c.p, c.p.st.afterImage);
    const vigor = d.type === 'attack' ? (c.p.st.vigor || 0) : 0;
    runEffects(run, d.effects, target, { x, vigor });
    if (d.type === 'attack') {
      if (vigor) delete c.p.st.vigor;
      c.atkThisTurn++;
      if (hasRelic(run, 'dancer_fan') && c.atkThisTurn % 3 === 0) gainBlock(run, c.p, 4);
    }
    if (d.type === 'skill') aliveEnemies(run).forEach(e => { if (e.st.enrage) { addSt(e, 'str', e.st.enrage); fx(run, { k: 'buff', who: e.uid, s: 'str' }); } });
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
    // 플레이어 턴 종료
    if (P.st.metal) gainBlock(run, P, P.st.metal);
    if (hasRelic(run, 'iron_brooch') && P.block === 0) gainBlock(run, P, 6);
    for (const cd of c.hand) { const d = cardDef(cd); if (d.endTurnInHand) { loseHp(run, P, d.endTurnInHand); if (run.over) return { ok: true }; } }
    for (const cd of c.hand) { if (cardDef(cd).ethereal) c.exh.push(cd); else c.disc.push(cd); }
    c.hand = [];
    for (const s of ['weak', 'vuln']) if (P.st[s]) addSt(P, s, -1);
    fx(run, { k: 'turn', who: 'e' });
    // 적 턴
    for (const e of c.enemies.slice()) {
      if (e.dead || run.over) continue;
      if (!e.st.barricade) e.block = 0;
      if (e.st.poison) { const p = e.st.poison; addSt(e, 'poison', -1); loseHp(run, e, p); if (e.dead) continue; }
      if (e.st.ritual) addSt(e, 'str', e.st.ritual);
      enemyAct(run, e);
      if (run.over) return { ok: true };
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
    fx(run, { k: 'act', who: e.uid, name: m.name });
    if (m.dmg) for (let h = 0; h < (m.hits || 1); h++) { if (e.dead || run.over) break; applyDamage(run, c.p, calcAttack(e, c.p, m.dmg), e, true); }
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
      // 죽은 자리 재사용
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
    if (m.dmg) { const v = calcAttack(e, c.p, m.dmg); parts.push({ k: 'atk', text: (m.hits || 1) > 1 ? v + '×' + m.hits : String(v), total: v * (m.hits || 1) }); }
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

  function usePotion(run, slot, targetIdx) {
    const id = run.potions[slot];
    if (!id) return { ok: false, reason: '빈 칸이야.' };
    const p = D.POTIONS[id];
    const inCombat = run.screen === 'combat' && C(run) && !C(run).over;
    if (!inCombat) {
      if (!p.anywhere) return { ok: false, reason: '전투 중에만 쓸 수 있어.' };
      run.potions[slot] = null;
      for (const e of p.effects) if (e.t === 'heal') healPlayer(run, e.v);
      return { ok: true };
    }
    let target = null;
    if (p.target) {
      const al = aliveEnemies(run);
      target = targetIdx != null ? C(run).enemies[targetIdx] : null;
      if (!target || target.dead) { if (al.length === 1) target = al[0]; else return { ok: false, reason: '대상을 골라 줘.', needTarget: true }; }
    }
    run.potions[slot] = null;
    fx(run, { k: 'potion', id });
    runEffects(run, p.effects, target, { x: 0, vigor: 0 });
    checkCombatEnd(run);
    return { ok: true };
  }
  function discardPotion(run, slot) { run.potions[slot] = null; return { ok: true }; }

  function winCombat(run) {
    const c = C(run);
    c.over = true;
    if (c.kind === 'elite') run.stats.elites++;
    if (hasRelic(run, 'red_ribbon')) healPlayer(run, 5);
    if (c.kind === 'boss') { endRun(run, true); return; }
    run.rewards = {
      gold: c.kind === 'elite' ? ri(run, 25, 35) : ri(run, 10, 20), goldTaken: false,
      cards: genCardChoices(run, 3, c.kind), cardTaken: false,
      relic: c.kind === 'elite' ? randomRelic(run) : null, relicTaken: false,
      potion: rnd(run) < (c.kind === 'elite' ? 0.6 : 0.4) ? randomPotion(run) : null, potionTaken: false
    };
    run.screen = 'reward';
    fx(run, { k: 'win' });
  }

  function endRun(run, won) {
    run.over = true; run.won = won;
    run.screen = won ? 'victory' : 'gameover';
    if (run.combat) run.combat.over = true;
    fx(run, { k: won ? 'victory' : 'defeat' });
  }

  // ───────── 보상 ─────────
  function takeGold(run) { const r = run.rewards; if (!r || r.goldTaken) return { ok: false }; run.gold += r.gold; r.goldTaken = true; return { ok: true }; }
  function takeCard(run, i) {
    const r = run.rewards; if (!r || r.cardTaken || !r.cards[i]) return { ok: false };
    run.deck.push(newCard(run, r.cards[i].id, r.cards[i].up)); r.cardTaken = true; return { ok: true };
  }
  function skipCard(run) { const r = run.rewards; if (r) r.cardTaken = true; return { ok: true }; }
  function takeRelic(run) { const r = run.rewards; if (!r || !r.relic || r.relicTaken) return { ok: false }; addRelic(run, r.relic); r.relicTaken = true; return { ok: true }; }
  function takePotion(run) {
    const r = run.rewards; if (!r || !r.potion || r.potionTaken) return { ok: false };
    if (!addPotion(run, r.potion)) return { ok: false, reason: '물약 칸이 가득 찼어.' };
    r.potionTaken = true; return { ok: true };
  }
  function leaveReward(run) {
    if (run.screen !== 'reward') return { ok: false };
    const r = run.rewards;
    if (r && !r.goldTaken) takeGold(run); // 골드는 자동 수령
    if (r && r.relic && !r.relicTaken) takeRelic(run); // 유물도 자동 수령(놓치는 일 방지)
    run.rewards = null; run.combat = null; run.screen = 'map';
    return { ok: true };
  }

  // ───────── 휴식 ─────────
  function restHeal(run) {
    if (run.screen !== 'rest') return { ok: false };
    healPlayer(run, Math.floor(run.maxHp * 0.3) + (hasRelic(run, 'teacup') ? 15 : 0));
    run.screen = 'map'; return { ok: true };
  }
  function restSmith(run) {
    if (run.screen !== 'rest') return { ok: false };
    if (!run.deck.some(canUpgrade)) return { ok: false, reason: '강화할 카드가 없어.' };
    run.pending = { mode: 'upgrade', after: 'map', cancel: 'rest' }; run.screen = 'select'; return { ok: true };
  }

  // ───────── 카드 선택(강화/제거) ─────────
  function selectableCards(run) {
    const p = run.pending; if (!p) return [];
    return run.deck.filter(cd => p.mode === 'upgrade' ? canUpgrade(cd) : true);
  }
  function selectCard(run, uid) {
    const p = run.pending;
    if (run.screen !== 'select' || !p) return { ok: false };
    const cd = run.deck.find(x => x.uid === uid);
    if (!cd || !selectableCards(run).includes(cd)) return { ok: false };
    if (p.mode === 'upgrade') cd.up = true;
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
  function price(run, base) { return Math.round(base * (0.9 + rnd(run) * 0.2) * (hasRelic(run, 'lucky_coin') ? 0.8 : 1)); }
  function genShop(run) {
    const base = { common: 50, uncommon: 78, rare: 150 };
    const ids = [];
    for (const r of ['common', 'common', 'uncommon', 'uncommon', 'rare']) {
      let g = 0, id; do { id = pick(run, cardPool(run, r)); } while (g++ < 20 && ids.includes(id));
      if (id && !ids.includes(id)) ids.push(id);
    }
    const cards = ids.map(id => ({ id, up: false, price: price(run, base[D.CARDS[id].rarity]), sold: false }));
    if (cards.length) { const s = pick(run, cards); s.price = Math.round(s.price / 2); s.sale = true; }
    const relics = [];
    for (let i = 0; i < 2; i++) { const r = randomRelic(run); if (r && !relics.some(x => x.id === r)) relics.push({ id: r, price: price(run, 160), sold: false }); }
    const potions = [0, 1].map(() => ({ id: randomPotion(run), price: price(run, 55), sold: false }));
    cards.forEach(c => { if (!run.cardsSeen.includes(c.id)) run.cardsSeen.push(c.id); });
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
    if (run.gold < run.removeCost) return { ok: false, reason: '골드가 부족해.' };
    if (run.deck.length <= 1) return { ok: false };
    run.pending = { mode: 'remove', after: 'shop', cancel: 'shop', cost: run.removeCost }; run.screen = 'select'; return { ok: true };
  }
  function leaveShop(run) { if (run.screen !== 'shop') return { ok: false }; run.shop = null; run.screen = 'map'; return { ok: true }; }

  // ───────── 보물 ─────────
  function openChest(run) {
    const t = run.treasure; if (run.screen !== 'treasure' || !t || t.opened) return { ok: false };
    t.opened = true; run.gold += t.gold;
    if (t.relic) addRelic(run, t.relic);
    return { ok: true };
  }
  function leaveTreasure(run) { if (run.screen !== 'treasure') return { ok: false }; if (!run.treasure.opened) openChest(run); run.treasure = null; run.screen = 'map'; return { ok: true }; }

  // ───────── 이벤트 ─────────
  function eventOptionOk(run, opt) {
    if (opt.need && opt.need.gold && run.gold < opt.need.gold) return false;
    if (opt.fx && opt.fx.upgrade && !run.deck.some(canUpgrade)) return false;
    return true;
  }
  function applyEventFx(run, f) {
    if (f.gold) run.gold = Math.max(0, run.gold + f.gold);
    if (f.maxHp) { run.maxHp += f.maxHp; if (f.maxHp > 0) run.hp += f.maxHp; run.hp = Math.min(run.hp, run.maxHp); }
    if (f.heal) run.hp = Math.min(run.maxHp, run.hp + f.heal);
    if (f.hp) run.hp = Math.max(1, Math.min(run.maxHp, run.hp + f.hp)); // 이벤트로는 죽지 않음
    if (f.relic) { const r = randomRelic(run); if (r) addRelic(run, r); else run.gold += 50; run.event.gotRelic = r; }
    if (f.card) {
      const id = f.card === 'rare' ? pick(run, cardPool(run, 'rare')) : f.card;
      run.deck.push(newCard(run, id)); run.event.gotCard = id;
    }
    if (f.potion) { const p = randomPotion(run); if (addPotion(run, p)) run.event.gotPotion = p; }
    if (f.upgradeRandom) { const ups = run.deck.filter(canUpgrade); if (ups.length) { const cd = pick(run, ups); cd.up = true; run.event.gotUpgrade = cd.id; } }
    if (f.upgrade && run.deck.some(canUpgrade)) { run.pending = { mode: 'upgrade', after: 'event', cancel: 'event' }; run.screen = 'select'; }
    if (f.remove && run.deck.length > 1) { run.pending = { mode: 'remove', after: 'event', cancel: 'event' }; run.screen = 'select'; }
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

  // ───────── 영구 기록 ─────────
  function newMeta() { return { runs: 0, wins: 0, bestFloor: 0, kills: 0, heroWins: {}, heroRuns: {}, cardsSeen: [], bossKills: 0 }; }
  function recordRun(meta, run) {
    meta.runs++; meta.kills += run.stats.kills;
    meta.bestFloor = Math.max(meta.bestFloor, run.floor);
    meta.heroRuns[run.starter] = (meta.heroRuns[run.starter] || 0) + 1;
    if (run.won) { meta.wins++; meta.bossKills++; meta.heroWins[run.starter] = (meta.heroWins[run.starter] || 0) + 1; }
    const seen = new Set(meta.cardsSeen); run.deck.forEach(c => seen.add(c.id)); run.cardsSeen.forEach(id => seen.add(id));
    meta.cardsSeen = [...seen];
    return meta;
  }

  // ───────── 카드 설명문 ─────────
  function josa(word, a, b) { // a: 받침 있을 때(을/이), b: 없을 때(를/가)
    const ch = word.charCodeAt(word.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return word + b;
    return word + ((ch - 0xAC00) % 28 ? a : b);
  }
  // ctx: { p: 플레이어 엔티티(st), target } 가 있으면 실제 수치로 보여줌
  function describe(def, ctx) {
    const out = [];
    const P = ctx && ctx.p;
    const num = (base, kind) => {
      if (!P) return String(base);
      let v = base;
      if (kind === 'atk') v = calcAttack(P, ctx.target || null, base, def.type === 'attack' ? (P.st.vigor || 0) : 0);
      if (kind === 'blk') v = Math.max(0, base + (P.st.dex || 0));
      const cls = v > base ? 'up' : v < base ? 'down' : '';
      return cls ? `<b class="${cls}">${v}</b>` : String(v);
    };
    const S = s => D.STATUS[s].name;
    for (const e of def.effects) {
      switch (e.t) {
        case 'dmg':
          if (e.hitsFrom === 'atk') out.push(`이번 턴에 낸 공격 카드 1장당 피해 ${num(e.v, 'atk')}.`);
          else out.push((e.hits || 1) > 1 ? `피해 ${num(e.v, 'atk')}를 ${e.hits}번.` : `피해 ${num(e.v, 'atk')}.`); break;
        case 'dmgAll': out.push(e.hits === 'X' ? `모든 적에게 피해 ${num(e.v, 'atk')}를 X번.` : (e.hits || 1) > 1 ? `모든 적에게 피해 ${num(e.v, 'atk')}를 ${e.hits}번.` : `모든 적에게 피해 ${num(e.v, 'atk')}.`); break;
        case 'dmgRandom': out.push(`무작위 적에게 피해 ${num(e.v, 'atk')}를 ${e.hits}번.`); break;
        case 'dmgBlock': out.push('현재 방어도만큼 피해.'); break;
        case 'block': out.push(`방어도 ${num(e.v, 'blk')}.`); break;
        case 'doubleBlock': out.push('방어도를 2배로.'); break;
        case 'draw': out.push(`카드 ${e.v}장 뽑기.`); break;
        case 'energy': out.push(`에너지 +${e.v}.`); break;
        case 'apply': out.push(`${S(e.s)} ${e.v} 부여.`); break;
        case 'applyAll': out.push(`모든 적에게 ${S(e.s)} ${e.v}.`); break;
        case 'self': {
          const st = D.STATUS[e.s];
          out.push(st.power ? (st.flag ? st.desc(e.v) : st.desc(e.v)) : `${josa(st.name, '을', '를')} ${e.v} 얻음.`); break;
        }
        case 'heal': out.push(`체력 ${e.v} 회복.`); break;
        case 'loseHp': out.push(`체력 ${e.v} 잃음.`); break;
        case 'add': out.push(`${josa(D.CARDS[e.id].name, '을', '를')} ${e.n}장 ${e.to === 'hand' ? '손에' : e.to === 'draw' ? '뽑을 카드에' : '버린 카드에'} 추가.`); break;
        case 'upgradeHand': out.push(e.v === 'all' ? '손의 모든 카드 강화.' : '손의 카드 1장 강화.'); break;
        case 'multiplyPoison': out.push(`대상의 중독을 ${e.v}배로.`); break;
        case 'rawDmg': out.push(`피해 ${e.v}.`); break;
        case 'rawBlock': out.push(`방어도 ${e.v}.`); break;
      }
    }
    if (def.text) out.push(def.text);
    const kw = [];
    if (def.innate) kw.push('선천성');
    if (def.ethereal) kw.push('휘발성');
    if (def.exhaust) kw.push('소멸');
    if (kw.length) out.push(kw.join(' · ') + '.');
    return out.join(' ');
  }

  const E = {
    D, FLOORS, rnd, cardDef, canUpgrade, needsTarget, newRun, availableNodes, chooseNode,
    canPlay, playCard, endTurn, usePotion, discardPotion, intentView, incomingDamage, calcAttack, aliveEnemies,
    takeGold, takeCard, skipCard, takeRelic, takePotion, leaveReward,
    restHeal, restSmith, selectableCards, selectCard, cancelSelect,
    buy, shopRemove, leaveShop, openChest, leaveTreasure, chooseEvent, eventOptionOk, leaveEvent,
    newMeta, recordRun, describe, josa, hasRelic, startCombat
  };
  root.BD_ENGINE = E;
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
