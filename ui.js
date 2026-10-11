/* 미녀 덱: 밤의 여왕 — 화면(UI)
 * engine.js의 run 상태를 보고 화면을 그립니다. 게임 규칙은 여기 없고 전부 engine.js에 있습니다.
 */
(function () {
  'use strict';
  const E = window.BD_ENGINE, D = window.BD_DATA;
  const SAVE_KEY = 'beautydeck.run.v1', META_KEY = 'beautydeck.meta.v1';
  const app = document.getElementById('app');
  const fxLayer = document.getElementById('fxlayer');

  let run = null;
  let meta = loadJSON(META_KEY) || E.newMeta();
  const ui = { view: 'title', sel: null, potionSel: null, busy: false, modal: null, hold: false, deadShown: new Set() };

  // ───────── 저장 ─────────
  function loadJSON(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function saveRun() {
    try {
      if (!run) return;
      if (run.over) {
        if (!run.recorded) { run.recorded = true; E.recordRun(meta, run); localStorage.setItem(META_KEY, JSON.stringify(meta)); }
        localStorage.removeItem(SAVE_KEY);
      } else localStorage.setItem(SAVE_KEY, JSON.stringify(run, (k, v) => (k === 'fx' ? undefined : v)));
    } catch (e) { /* 저장 공간 문제는 무시 */ }
  }

  // ───────── 유틸 ─────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg;
    const box = document.getElementById('toast'); box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => t.remove(), 2700);
  }
  function artImg(key) { const src = D.ART[key]; return src ? `<img src="${esc(src)}" alt="" draggable="false" onerror="this.remove()">` : ''; }
  function heroPortrait(heroId, cls, extra) {
    const h = D.HEROINES[heroId];
    if (!h) return `<div class="portrait ${cls || ''}" style="background:linear-gradient(160deg,#555,#222)"><span class="glyph">?</span></div>`;
    return `<div class="portrait ${cls || ''}" style="background:linear-gradient(160deg,${h.colors[0]},${h.colors[1]})">${artImg(extra || heroId)}<span class="glyph">${esc(h.name[0])}</span>${extra && D.ART[extra] ? '' : ''}</div>`;
  }
  function enemyPortrait(id, cls) {
    const d = D.ENEMIES[id];
    return `<div class="portrait ${cls || ''}" style="background:linear-gradient(160deg,${d.colors[0]},${d.colors[1]})">${artImg(id)}<span class="glyph">${esc(d.glyph)}</span></div>`;
  }
  const TYPE_KO = { attack: '공격', skill: '스킬', power: '파워', status: '상태' };
  function cardHTML(card, o) {
    o = o || {};
    const d = E.cardDef(card);
    const h = d.hero && D.HEROINES[d.hero];
    const art = h ? `<div class="portrait art" style="background:linear-gradient(160deg,${h.colors[0]},${h.colors[1]})">${artImg('card:' + d.id) || artImg(d.hero)}<span class="glyph">${esc(h.name[0])}</span></div>`
                  : `<div class="portrait art" style="background:linear-gradient(160deg,#666,#222)">${artImg('card:' + d.id)}<span class="glyph">✖</span></div>`;
    const cost = d.unplayable ? '' : `<div class="cost">${d.cost === -1 ? 'X' : d.cost}</div>`;
    const desc = E.describe(d, o.ctx);
    const cls = ['card', 't-' + d.type, 'r-' + d.rarity, card.up ? 'up' : '', o.big ? 'big' : '', o.cls || ''].join(' ');
    const attrs = o.act ? `data-act="${o.act}" ${Object.entries(o.data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}` : '';
    return `<div class="${cls}" ${attrs}>${cost}${art}<div class="cname">${esc(d.name)}</div><div class="chero">${h ? esc(h.name + ' · ' + h.job) : '&nbsp;'}</div><div class="cdesc"><span>${desc}</span></div>${o.big && d.quote ? `<div class="cquote">“${esc(d.quote)}”</div>` : ''}<div class="ctype">${TYPE_KO[d.type]}</div></div>`;
  }
  function chipsHTML(st, act) {
    return `<div class="chips">${Object.keys(st).filter(k => D.STATUS[k] && st[k]).map(k => {
      const s = D.STATUS[k];
      return `<span class="chip ${s.type}" ${act ? `data-act="status" data-s="${k}" data-v="${st[k]}"` : ''}>${s.icon}${s.flag ? '' : st[k]}</span>`;
    }).join('')}</div>`;
  }
  function hpBarHTML(hp, max, block) {
    return `<div class="hpwrap">${block ? `<div class="blockbadge">${block}</div>` : ''}<div class="hpbar ${block ? 'blocked' : ''}"><div class="fill" style="width:${Math.max(0, hp / max * 100)}%"></div><div class="txt">${hp} / ${max}</div></div></div>`;
  }

  // ───────── 상단 바 ─────────
  function topBar() {
    const node = run.pos && run.map.nodes[run.pos];
    const floorTxt = node ? (node.type === 'boss' ? '보스' : `${node.floor + 1}층`) : '출발';
    return `<div class="topbar">
      <button class="tb" data-act="menu" aria-label="메뉴">☰</button>
      <span class="tb">❤️ ${run.hp}/${run.maxHp}</span>
      <span class="tb">💰 ${run.gold}</span>
      <span class="tb">🗺️ ${floorTxt}</span>
      <span class="sp"></span>
      ${run.potions.map((p, i) => `<button class="tb potion-slot ${p ? 'full' : ''}" data-act="potion" data-slot="${i}" aria-label="물약">${p ? D.POTIONS[p].icon : ''}</button>`).join('')}
      <button class="tb" data-act="deck">🃏${run.deck.length}</button>
    </div>
    <div class="relicbar">${run.relics.map(r => `<button class="relic" data-act="relic" data-id="${r}">${D.RELICS[r].icon}</button>`).join('') || '<span class="dim small">유물 없음</span>'}</div>`;
  }

  // ───────── 렌더 ─────────
  function render() {
    let html;
    if (!run) html = ui.view === 'pick' ? renderPick() : renderTitle();
    else {
      const scr = (ui.hold && run.combat) ? 'combat' : run.screen;
      html = ({ map: renderMap, combat: renderCombat, reward: renderReward, rest: renderRest, shop: renderShop, event: renderEvent,
                treasure: renderTreasure, select: renderSelect, victory: renderEnd, gameover: renderEnd })[scr]();
    }
    if (ui.modal) html += `<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop">${ui.modal}</div></div>`;
    app.innerHTML = html;
    if (run && run.screen === 'map' && !ui.hold) scrollMap();
    if (run && (run.screen === 'combat' || ui.hold)) layoutHand();
  }

  function renderTitle() {
    const saved = loadJSON(SAVE_KEY);
    return `<div class="title-screen">
      <div class="logo">미녀 덱<small>밤의 여왕</small></div>
      <div class="title-heroes">${['sera', 'luna', 'yuki'].map(h => heroPortrait(h)).join('')}</div>
      <div class="dim small">덱빌딩 로그라이트 · 히로인 카드로 밤의 성을 올라가자</div>
      <div class="col" style="width:100%;max-width:300px">
        ${saved && !saved.over ? `<button class="btn primary block" data-act="continue">▶ 이어하기 <span class="small">(${esc(D.STARTERS[saved.starter].title)}, ${saved.floor}층)</span></button>` : ''}
        <button class="btn ${saved && !saved.over ? '' : 'primary'} block" data-act="newGame">새 원정 시작</button>
        <div class="row"><button class="btn block" data-act="help">도움말</button><button class="btn block" data-act="records">기록</button></div>
      </div>
      <div class="dim small">원정 ${meta.runs}회 · 클리어 ${meta.wins}회 · 최고 ${meta.bestFloor}층</div>
      <div class="dim" style="font-size:11px">v${D.VERSION} · 모든 등장인물은 성인입니다</div>
    </div>`;
  }

  function renderPick() {
    return `<div class="topbar"><button class="tb" data-act="toTitle">←</button><span>히로인 선택</span></div>
    <div class="scroll"><div class="col pad">
      ${Object.entries(D.STARTERS).map(([id, s]) => {
        const h = D.HEROINES[s.hero], r = D.RELICS[s.relic], wins = meta.heroWins[id] || 0;
        return `<div class="panel col">
          <div class="hero-pick">${heroPortrait(s.hero)}
            <div class="col" style="gap:4px">
              <h3>${esc(s.title)} ${wins ? '<span title="클리어">⭐</span>' : ''}</h3>
              <div><span class="tag">${esc(h.job)}</span><span class="tag">${h.age}세</span><span class="tag">❤️ ${s.hp}</span></div>
              <div class="small">${esc(s.pitch)}</div>
              <div class="quote">“${esc(s.line)}”</div>
            </div></div>
          <div class="small"><b>${r.icon} ${esc(r.name)}</b> — ${esc(r.desc)}</div>
          <div class="small dim">${esc(h.bio)}</div>
          <div class="row"><button class="btn" data-act="previewDeck" data-id="${id}">시작 덱 보기</button>
          <button class="btn primary" style="flex:1" data-act="pick" data-id="${id}">이 히로인으로 출발</button></div>
        </div>`;
      }).join('')}
    </div></div>`;
  }

  const NODE_ICON = { monster: '⚔️', elite: '😈', rest: '🔥', shop: '🛍️', event: '❓', treasure: '🎁', boss: '👑' };
  const NODE_NAME = { monster: '전투', elite: '엘리트', rest: '휴식', shop: '상점', event: '이벤트', treasure: '보물', boss: '보스' };
  const FH = 74;
  function renderMap() {
    const m = run.map, W = Math.min(window.innerWidth, 480) - 24, H = (m.floors + 1) * FH + 60;
    const avail = new Set(E.availableNodes(run));
    const pos = id => {
      const n = m.nodes[id];
      if (id === 'boss') return { x: W / 2, y: 50 };
      const jitter = ((n.floor * 7 + n.col * 13) % 5 - 2) * 4;
      return { x: 24 + (n.col + 0.5) * (W - 48) / m.width + jitter, y: H - 40 - n.floor * FH };
    };
    let lines = '';
    for (const n of Object.values(m.nodes)) for (const nx of n.next) {
      const a = pos(n.id), b = pos(nx);
      const walked = run.visited.includes(n.id) && run.visited.includes(nx);
      lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${walked ? '#ff6fa8' : '#5b3f7a'}" stroke-width="${walked ? 4 : 2}" stroke-dasharray="${walked ? '' : '5 5'}"/>`;
    }
    let nodes = '';
    for (const n of Object.values(m.nodes)) {
      const p = pos(n.id);
      const cls = ['node', n.type === 'boss' ? 'boss' : '', run.visited.includes(n.id) ? 'visited' : '', run.pos === n.id ? 'current' : '', avail.has(n.id) ? 'avail' : 'locked'].join(' ');
      nodes += `<button class="${cls}" style="left:${p.x}px;top:${p.y}px" data-act="node" data-id="${n.id}" aria-label="${NODE_NAME[n.type]}">${NODE_ICON[n.type]}</button>`;
    }
    let labels = '';
    for (let f = 0; f < m.floors; f++) labels += `<div class="floorlbl" style="top:${H - 46 - f * FH}px">${f + 1}</div>`;
    return `${topBar()}
      <div class="scroll" id="mapscroll"><div class="map" style="width:${W}px;height:${H}px">${labels}<svg width="${W}" height="${H}">${lines}</svg>${nodes}</div></div>
      <div class="legend">${Object.keys(NODE_ICON).map(k => `<span>${NODE_ICON[k]} ${NODE_NAME[k]}</span>`).join('')}</div>`;
  }
  function scrollMap() {
    const sc = document.getElementById('mapscroll'); if (!sc) return;
    const a = sc.querySelector('.node.avail');
    if (a) sc.scrollTop = a.offsetTop - sc.clientHeight * 0.6;
    else sc.scrollTop = sc.scrollHeight;
  }

  // ───────── 전투 화면 ─────────
  function renderCombat() {
    const c = run.combat, P = c.p;
    const sel = ui.sel != null ? c.hand.find(x => x.uid === ui.sel) : null;
    const selDef = sel && E.cardDef(sel);
    const alive = E.aliveEnemies(run);
    const targeting = (selDef && E.needsTarget(selDef) && alive.length > 1) || (ui.potionSel != null && D.POTIONS[run.potions[ui.potionSel]] && D.POTIONS[run.potions[ui.potionSel]].target && alive.length > 1);
    const enemies = c.enemies.map((e, i) => {
      if (e.dead) {
        if (ui.deadShown.has(e.uid)) return `<div class="enemy dead"></div>`;
        ui.deadShown.add(e.uid);
      }
      const d = D.ENEMIES[e.id];
      const iv = e.dead ? null : E.intentView(run, e);
      const intent = iv ? iv.parts.map(p => p.k === 'atk' ? `<span class="atk">⚔️${p.text}</span>` : p.k === 'def' ? '<span class="def">🛡️</span>' : p.k === 'buff' ? '<span class="buff">✨</span>' : p.k === 'debuff' ? '<span class="debuff">🌀</span>' : p.k === 'summon' ? '<span>🦇</span>' : '❔').join('') : '';
      return `<div class="enemy ${d.boss ? 'boss' : ''} ${e.dead ? 'dying' : ''} ${targeting && !e.dead ? 'targetable' : ''}" data-act="enemy" data-i="${i}" data-who="${e.uid}">
        <div class="intent">${intent}</div>
        ${enemyPortrait(e.id)}
        <div class="ename">${esc(e.name)}</div>
        ${hpBarHTML(e.hp, e.maxHp, e.block)}
        ${chipsHTML(e.st)}
      </div>`;
    }).join('');
    const h = D.HEROINES[D.STARTERS[run.starter].hero];
    let hint = '';
    if (sel) hint = targeting ? '공격할 적을 터치해!' : '한 번 더 터치하면 사용';
    else if (ui.potionSel != null) hint = '물약을 쓸 적을 터치해!';
    else if (!c.hand.some(cd => E.canPlay(run, cd))) hint = '낼 수 있는 카드가 없어';
    const incoming = E.incomingDamage(run);
    const noMore = !c.hand.some(cd => E.canPlay(run, cd));
    return `${topBar()}
    <div class="battle" data-act="bg">
      <div class="enemies n${c.enemies.length}">${enemies}</div>
      <div class="player" data-who="p">
        ${heroPortrait(h ? D.STARTERS[run.starter].hero : null)}
        <div class="pinfo"><div class="row" style="justify-content:space-between"><b>${esc(h.name)}</b>${incoming ? `<span class="small" style="color:#ff8b8b">들어올 피해 ${incoming}${P.block ? ` (방어 ${P.block})` : ''}</span>` : '<span class="small dim">공격 예고 없음</span>'}</div>
        ${hpBarHTML(run.hp, run.maxHp, P.block)}${chipsHTML(P.st, true)}</div>
      </div>
      <div class="controls">
        <div class="energy ${c.energy ? '' : 'zero'}">${c.energy}/${3 + (P.st.energyUp || 0)}</div>
        <button class="pilebtn" data-act="pile" data-w="draw">📚${c.draw.length}</button>
        <div class="hint">${hint}</div>
        <button class="pilebtn" data-act="pile" data-w="disc">🗑️${c.disc.length}</button>
        ${c.exh.length ? `<button class="pilebtn" data-act="pile" data-w="exh" style="min-width:40px">🔥${c.exh.length}</button>` : ''}
        <button class="endturn ${noMore ? 'glow' : ''}" data-act="endTurn">턴 종료</button>
      </div>
    </div>
    <div class="hand" id="hand">${c.hand.map(cd => cardHTML(cd, { act: 'card', data: { uid: cd.uid }, ctx: { p: P }, cls: (cd.uid === ui.sel ? 'sel ' : '') + (E.canPlay(run, cd) ? 'playable' : 'unplayable') })).join('')}</div>
`;
  }
  function layoutHand() {
    const hand = document.getElementById('hand'); if (!hand) return;
    const n = hand.children.length; if (!n) return;
    const cw = 100, avail = hand.clientWidth - 12;
    const ov = n * cw > avail ? -((n * cw - avail) / (n - 1)) : 2;
    hand.style.setProperty('--ov', ov + 'px');
  }

  // ───────── 보상 ─────────
  function renderReward() {
    const r = run.rewards;
    const items = [];
    items.push(`<button class="list-btn ${r.goldTaken ? 'done' : ''}" data-act="rwGold"><span class="ic">💰</span>${r.gold} 골드</button>`);
    if (r.relic) { const rl = D.RELICS[r.relic]; items.push(`<button class="list-btn ${r.relicTaken ? 'done' : ''}" data-act="rwRelic"><span class="ic">${rl.icon}</span><span>${esc(rl.name)}<br><span class="small dim">${esc(rl.desc)}</span></span></button>`); }
    if (r.potion) { const p = D.POTIONS[r.potion]; items.push(`<button class="list-btn ${r.potionTaken ? 'done' : ''}" data-act="rwPotion"><span class="ic">${p.icon}</span><span>${esc(p.name)}<br><span class="small dim">${esc(p.desc)}</span></span></button>`); }
    return `${topBar()}<div class="scroll"><div class="col pad">
      <h2 class="center">전투 승리! 🎉</h2>
      ${items.join('')}
      <div class="section-title" style="padding-left:0">${r.cardTaken ? '카드 보상 완료' : '카드 1장을 골라 덱에 넣어 (터치해서 자세히)'}</div>
      ${r.cardTaken ? '' : `<div class="grid" style="padding:4px 0">${r.cards.map((cd, i) => cardHTML(cd, { act: 'rwCardView', data: { i } })).join('')}</div>
      <button class="btn ghost" data-act="rwSkip">카드 안 받기</button>`}
      <button class="btn primary block" data-act="rwLeave">계속 ▶</button>
    </div></div>`;
  }

  // ───────── 휴식 ─────────
  function renderRest() {
    const s = D.STARTERS[run.starter];
    const heal = Math.floor(run.maxHp * 0.3) + (E.hasRelic(run, 'teacup') ? 15 : 0);
    const lines = ['모닥불 따뜻하다… 잠깐만 눈 붙이고 갈까?', '칼날 좀 손볼 시간이야.', '여기서 숨 좀 돌리자. 다음은 더 셀 거야.'];
    return `${topBar()}<div class="scroll"><div class="col pad">
      <div class="bubble-hero">${heroPortrait(s.hero)}<div class="bubble">${esc(lines[run.floor % lines.length])}</div></div>
      <div class="center bigicon">🔥</div>
      <button class="list-btn" data-act="restHeal"><span class="ic">😴</span><span>휴식<br><span class="small dim">체력 ${heal} 회복 (${run.hp}/${run.maxHp})</span></span></button>
      <button class="list-btn ${run.deck.some(E.canUpgrade) ? '' : 'done'}" data-act="restSmith"><span class="ic">⚒️</span><span>단련<br><span class="small dim">카드 1장 강화(+)</span></span></button>
    </div></div>`;
  }

  // ───────── 상점 ─────────
  function renderShop() {
    const s = run.shop;
    const pr = (p) => `<div class="price ${run.gold < p ? 'no' : ''}">💰 ${p}</div>`;
    return `${topBar()}<div class="scroll">
      <div class="pad" style="padding-bottom:0"><div class="bubble-hero">${heroPortrait('pio')}<div class="bubble">어서 와~ 피오 상점이야! 폭발은 안 해. …거의 안 해.</div></div></div>
      <div class="section-title">카드</div>
      <div class="grid">${s.cards.map((it, i) => `<div class="shopitem ${it.sold ? 'sold' : ''}" style="position:relative">${it.sale ? '<span class="sale">세일</span>' : ''}${cardHTML(it, { act: 'shopCardView', data: { i } })}${pr(it.price)}</div>`).join('')}</div>
      <div class="section-title">유물 · 물약</div>
      <div class="col pad" style="padding-top:8px">
        ${s.relics.map((it, i) => { const r = D.RELICS[it.id]; return `<button class="list-btn ${it.sold ? 'done' : ''}" data-act="buy" data-k="relics" data-i="${i}"><span class="ic">${r.icon}</span><span style="flex:1">${esc(r.name)}<br><span class="small dim">${esc(r.desc)}</span></span>${pr(it.price)}</button>`; }).join('')}
        ${s.potions.map((it, i) => { const p = D.POTIONS[it.id]; return `<button class="list-btn ${it.sold ? 'done' : ''}" data-act="buy" data-k="potions" data-i="${i}"><span class="ic">${p.icon}</span><span style="flex:1">${esc(p.name)}<br><span class="small dim">${esc(p.desc)}</span></span>${pr(it.price)}</button>`; }).join('')}
        <button class="list-btn ${s.removeUsed ? 'done' : ''}" data-act="shopRemove"><span class="ic">✂️</span><span style="flex:1">카드 제거 서비스<br><span class="small dim">덱에서 카드 1장을 뺀다 (상점당 1회)</span></span>${pr(run.removeCost)}</button>
        <button class="btn primary block" data-act="leaveShop">상점 나가기</button>
      </div></div>`;
  }

  // ───────── 이벤트 ─────────
  function renderEvent() {
    const ev = run.event, d = D.EVENTS[ev.id];
    let body;
    if (!ev.done) {
      body = d.options.map((o, i) => `<button class="list-btn ${E.eventOptionOk(run, o) ? '' : 'done'}" data-act="evOpt" data-i="${i}"><span style="flex:1">${esc(o.label)}<br><span class="small dim">${esc(o.hint)}</span></span></button>`).join('');
    } else {
      const got = [];
      if (ev.gotRelic) got.push(`${D.RELICS[ev.gotRelic].icon} ${esc(D.RELICS[ev.gotRelic].name)} 획득`);
      if (ev.gotCard) got.push(`🃏 「${esc(D.CARDS[ev.gotCard].name)}」 획득`);
      if (ev.gotPotion) got.push(`${D.POTIONS[ev.gotPotion].icon} ${esc(D.POTIONS[ev.gotPotion].name)} 획득`);
      if (ev.gotUpgrade) got.push(`⚒️ 「${esc(D.CARDS[ev.gotUpgrade].name)}」 강화됨`);
      body = `<div class="panel">${esc(ev.text)}${got.length ? `<div class="small" style="margin-top:8px;color:var(--gold)">${got.join('<br>')}</div>` : ''}</div>
        <button class="btn primary block" data-act="evLeave">계속 ▶</button>`;
    }
    return `${topBar()}<div class="scroll"><div class="col pad">
      <h2>${esc(d.title)}</h2>
      <div class="bubble-hero">${heroPortrait(d.hero)}<div class="bubble">${esc(d.text)}</div></div>
      ${body}</div></div>`;
  }

  // ───────── 보물 ─────────
  function renderTreasure() {
    const t = run.treasure;
    return `${topBar()}<div class="scroll"><div class="col pad center" style="align-items:center">
      <h2>보물 상자</h2>
      ${t.opened ? `<div class="bigicon">✨</div><div class="panel">💰 ${t.gold} 골드${t.relic ? `<br>${D.RELICS[t.relic].icon} <b>${esc(D.RELICS[t.relic].name)}</b><br><span class="small dim">${esc(D.RELICS[t.relic].desc)}</span>` : ''}</div>
        <button class="btn primary block" data-act="leaveTreasure">계속 ▶</button>`
      : `<button class="btn ghost" style="font-size:90px;min-height:140px" data-act="openChest">🎁</button><div class="dim">터치해서 열기</div>`}
    </div></div>`;
  }

  // ───────── 카드 선택(강화/제거) ─────────
  function renderSelect() {
    const p = run.pending;
    const list = E.selectableCards(run);
    const title = p.mode === 'upgrade' ? '강화할 카드를 골라 줘' : `덱에서 뺄 카드를 골라 줘${p.cost ? ` (💰 ${p.cost})` : ''}`;
    return `${topBar()}<div class="scroll">
      <div class="pad" style="padding-bottom:0"><h2>${title}</h2></div>
      <div class="grid">${list.map(cd => cardHTML(cd, { act: 'selView', data: { uid: cd.uid } })).join('')}</div>
      <div class="pad"><button class="btn block" data-act="selCancel">취소</button></div></div>`;
  }

  // ───────── 종료 ─────────
  function renderEnd() {
    const won = run.won, s = D.STARTERS[run.starter];
    const st = run.stats;
    return `<div class="scroll"><div class="title-screen">
      <div class="logo" style="font-size:34px">${won ? '원정 성공!' : '원정 실패…'}</div>
      ${heroPortrait(s.hero, 'p-xl')}
      <div class="bubble">${won ? esc('밤이 끝났어. …다음엔 더 높은 데까지 가 보자.') : esc('조금만… 더 갈 수 있었는데. 다음엔 꼭.')}</div>
      <div class="panel statgrid" style="width:100%;max-width:340px">
        <span>도달</span><b>${run.floor > E.FLOORS ? '보스' : run.floor + '층'}</b>
        <span>처치한 적</span><b>${st.kills}</b>
        <span>엘리트</span><b>${st.elites}</b>
        <span>낸 카드</span><b>${st.cardsPlayed}</b>
        <span>준 피해</span><b>${st.dmgDealt}</b>
        <span>최종 덱</span><b>${run.deck.length}장</b>
      </div>
      <div class="dim small">누적: 원정 ${meta.runs}회 · 클리어 ${meta.wins}회 · 최고 ${meta.bestFloor}층</div>
      <div class="col" style="width:100%;max-width:300px">
        <button class="btn primary block" data-act="again">다시 도전</button>
        <button class="btn block" data-act="viewDeckEnd">최종 덱 보기</button>
        <button class="btn block" data-act="toTitle">타이틀로</button>
      </div></div></div>`;
  }

  // ───────── 모달 ─────────
  function openModal(html) { ui.modal = html; render(); }
  function closeModal() { ui.modal = null; render(); }
  function deckModal(cards, title, sortIt) {
    const list = sortIt === false ? cards : cards.slice().sort((a, b) => (a.id > b.id ? 1 : -1));
    return `<h2>${esc(title)} (${cards.length})</h2><div class="grid" style="padding:4px 0">${list.map(cd => cardHTML(cd, { act: 'cardInfo', data: { id: cd.id, up: cd.up ? 1 : 0 } })).join('') || '<div class="dim">비어 있어</div>'}</div><button class="btn block" data-act="closeModal">닫기</button>`;
  }
  function helpHTML() {
    return `<h2>어떻게 해?</h2>
    <div class="small" style="line-height:1.6">
    • 히로인을 골라 <b>12층 + 보스</b>까지 올라가는 원정이야. 체력은 전투가 끝나도 이어져.<br>
    • 매 턴 <b>에너지 3</b>, 카드 <b>5장</b>을 뽑아. 카드를 <b>터치해서 고르고</b>, 적을 터치(또는 카드 한 번 더 터치)하면 사용!<br>
    • 적 머리 위 아이콘은 <b>다음 행동 예고</b>야. ⚔️공격(숫자=피해) 🛡️방어 ✨강화 🌀방해. 적을 터치하면 자세히 볼 수 있어.<br>
    • <b>방어도</b>는 내 턴이 시작되면 사라져. 공격이 올 때만 막자.<br>
    • 💔취약: 받는 피해 +50% · 🥀약화: 주는 피해 −25% · ☠️중독: 턴마다 체력 감소 · 💪힘: 공격 피해 +1씩<br>
    • 이기면 카드 3장 중 1장을 덱에 넣어. <b>덱이 너무 두꺼우면</b> 좋은 카드가 덜 나와!<br>
    • 🔥휴식에서는 회복 또는 카드 강화(+), 🛍️상점에선 카드 제거도 돼.<br>
    • 진행은 자동 저장돼. 창을 닫아도 이어할 수 있어.</div>
    <button class="btn block" data-act="closeModal">알겠어!</button>`;
  }
  function recordsHTML() {
    const rows = Object.entries(D.STARTERS).map(([id, s]) => `<span>${esc(s.title)}</span><b>${meta.heroWins[id] || 0}승 / ${meta.heroRuns[id] || 0}회</b>`).join('');
    const total = Object.values(D.CARDS).filter(c => !['special'].includes(c.rarity)).length;
    return `<h2>기록</h2><div class="statgrid">
      <span>원정</span><b>${meta.runs}회</b><span>클리어</span><b>${meta.wins}회</b><span>최고 층</span><b>${meta.bestFloor}</b>
      <span>처치한 적</span><b>${meta.kills}</b><span>만난 카드</span><b>${meta.cardsSeen.filter(id => D.CARDS[id] && D.CARDS[id].rarity !== 'special').length} / ${total}</b>${rows}</div>
      <button class="btn block" data-act="closeModal">닫기</button>`;
  }

  // ───────── 행동 처리 ─────────
  function doAct(fn) {
    if (!run) return;
    const before = run.screen;
    const res = fn() || { ok: true };
    if (res && res.ok === false && res.reason) toast(esc(res.reason));
    const fxs = run.fx.slice(); run.fx = [];
    const leftCombat = before === 'combat' && run.screen !== 'combat';
    if (leftCombat) { ui.hold = true; ui.sel = null; ui.potionSel = null; }
    if (before !== 'combat' && run.screen === 'combat') ui.deadShown = new Set();
    saveRun();
    render();
    const dur = playFx(fxs);
    if (leftCombat) {
      ui.busy = true;
      const boss = fxs.some(f => f.k === 'victory' || f.k === 'defeat');
      setTimeout(() => { ui.hold = false; ui.busy = false; ui.deadShown = new Set(); fxLayer.innerHTML = ''; render(); }, Math.max(900, Math.min(dur, 1800)) + (boss ? 1200 : 0));
    }
    return res;
  }

  function whoEl(who) { return app.querySelector(`[data-who="${who}"]`); }
  function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top }; }
  function floatText(who, text, cls, delay) {
    setTimeout(() => {
      const el = whoEl(who); if (!el) return;
      const c = center(el);
      const f = document.createElement('div'); f.className = 'float ' + cls; f.textContent = text;
      f.style.left = (c.x + (Math.random() * 30 - 15)) + 'px'; f.style.top = (c.y - 10) + 'px';
      fxLayer.appendChild(f); setTimeout(() => f.remove(), 950);
    }, delay);
  }
  function sayBubble(who, text, delay) {
    setTimeout(() => {
      const el = whoEl(who); if (!el) return;
      const r = el.getBoundingClientRect();
      const b = document.createElement('div'); b.className = 'saybubble'; b.textContent = text;
      b.style.left = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130) + 'px'; b.style.top = Math.max(r.top + 10, 70) + 'px';
      fxLayer.appendChild(b); setTimeout(() => b.remove(), 3300);
    }, delay);
  }
  function shake(who, delay) {
    setTimeout(() => { const el = whoEl(who); if (!el) return; el.classList.remove('shake', 'flashred'); void el.offsetWidth; el.classList.add('shake', 'flashred'); }, delay);
  }
  function banner(text, delay) {
    setTimeout(() => { const b = document.createElement('div'); b.className = 'banner'; b.textContent = text; fxLayer.appendChild(b); setTimeout(() => b.remove(), 1150); }, delay);
  }
  function playFx(list) {
    let t = 0, enemyPhase = false;
    for (const f of list) {
      switch (f.k) {
        case 'turn':
          if (f.who === 'e') { enemyPhase = true; banner('적의 턴', t); t += 450; }
          else { if (enemyPhase || f.turn === 1) banner(f.turn === 1 ? '전투 시작!' : '내 턴', t + 100); enemyPhase = false; }
          break;
        case 'act': floatText(f.who, f.name, 'act', t); t += 120; break;
        case 'dmg':
          if (f.v > 0) { floatText(f.who, (f.poison ? '☠️' : '') + '-' + f.v, 'dmg' + (f.v >= 15 ? ' big' : ''), t); shake(f.who, t); }
          else if (f.blocked) floatText(f.who, '막음!', 'blk', t);
          t += enemyPhase ? 260 : 110; break;
        case 'block': floatText(f.who, '+' + f.v + '🛡️', 'blk', t); t += 60; break;
        case 'heal': floatText(f.who, '+' + f.v, 'heal', t); t += 60; break;
        case 'buff': case 'debuff': if (D.STATUS[f.s]) floatText(f.who, D.STATUS[f.s].icon + D.STATUS[f.s].name, 'st', t + 150); break;
        case 'say': sayBubble(f.who, f.text, t); break;
        case 'phase': setTimeout(() => { const s = document.createElement('div'); s.className = 'screenflash'; fxLayer.appendChild(s); setTimeout(() => s.remove(), 650); }, t); banner('2막: 진정한 밤', t + 200); t += 600; break;
        case 'win': banner('승리!', t + 200); break;
        case 'victory': banner('밤의 여왕 격파!', t + 300); break;
        case 'defeat': banner('쓰러졌다…', t + 200); break;
        case 'potion': banner(D.POTIONS[f.id].icon + ' ' + D.POTIONS[f.id].name, t); break;
      }
    }
    return t;
  }

  function flyCard(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const g = el.cloneNode(true); g.classList.remove('sel'); g.classList.add('ghostcard');
    g.style.left = r.left + 'px'; g.style.top = r.top + 'px'; g.style.margin = '0'; g.style.transform = 'scale(1.2)';
    document.body.appendChild(g);
    requestAnimationFrame(() => requestAnimationFrame(() => { g.style.transform = `translate(${window.innerWidth / 2 - r.left - 50}px, ${-r.top * 0.55}px) scale(.6) rotate(-6deg)`; g.style.opacity = '0'; }));
    setTimeout(() => g.remove(), 420);
  }

  function playSelected(targetIdx) {
    const uid = ui.sel;
    const el = app.querySelector(`.card[data-uid="${uid}"]`);
    const res = E.playCard(run, uid, targetIdx);
    if (res.needTarget) { toast('공격할 적을 터치해 줘'); return; }
    if (!res.ok) { toast(esc(res.reason)); ui.sel = null; render(); return; }
    // 이미 실행됨 → fx만 처리
    flyCard(el);
    ui.sel = null;
    doAct(() => res);
  }

  // ───────── 입력 ─────────
  const H = {
    noop() {},
    closeModal() { closeModal(); },
    newGame() { ui.view = 'pick'; render(); },
    toTitle() { fxLayer.innerHTML = ''; run = null; ui.view = 'title'; ui.modal = null; render(); },
    help() { openModal(helpHTML()); },
    records() { openModal(recordsHTML()); },
    continue() { const s = loadJSON(SAVE_KEY); if (s) { run = s; run.fx = []; ui.modal = null; ui.deadShown = new Set(); render(); } },
    previewDeck(d) { const s = D.STARTERS[d.id]; openModal(deckModal(s.deck.map(id => ({ id, up: false })), s.title + ' 시작 덱')); },
    pick(d) {
      run = E.newRun(d.id); ui.sel = null; ui.modal = null; ui.deadShown = new Set();
      saveRun(); render();
      if (!meta.runs) setTimeout(() => toast('지도에서 빛나는 칸을 골라 출발해!'), 300);
    },
    again() { const id = run.starter; run = null; H.pick({ id }); },
    viewDeckEnd() { openModal(deckModal(run.deck, '최종 덱')); },
    menu() {
      openModal(`<h2>메뉴</h2>
        <button class="btn block" data-act="deck">🃏 덱 보기</button>
        <button class="btn block" data-act="help">❔ 도움말</button>
        <button class="btn block" data-act="toTitle">🏠 타이틀로 (자동 저장됨)</button>
        <button class="btn block" style="color:var(--red)" data-act="abandon">🏳️ 원정 포기</button>
        <button class="btn block" data-act="closeModal">닫기</button>`);
    },
    abandon() { openModal(`<h2>정말 포기할까?</h2><div class="small dim">이번 원정 기록은 실패로 남아.</div><div class="row"><button class="btn block" data-act="closeModal">아니</button><button class="btn block primary" data-act="abandonYes">포기</button></div>`); },
    abandonYes() { ui.modal = null; run.over = true; run.won = false; run.screen = 'gameover'; saveRun(); render(); },
    deck() { openModal(deckModal(run.deck, '내 덱')); },
    relic(d) { const r = D.RELICS[d.id]; toast(`${r.icon} <b>${esc(r.name)}</b><br>${esc(r.desc)}`); },
    status(d) { const s = D.STATUS[d.s]; toast(`${s.icon} <b>${esc(s.name)}</b> ${s.flag ? '' : d.v}<br>${esc(s.desc(d.v))}`); },
    cardInfo(d) { const card = { id: d.id, up: d.up === '1' }; const inner = `<div class="center" style="display:flex;justify-content:center;padding-top:10px">${cardHTML(card, { big: true })}</div>${E.canUpgrade(card) ? `<div class="small dim center">강화하면 → ${esc(E.describe(E.cardDef({ id: d.id, up: true })).replace(/<[^>]+>/g, ''))}</div>` : ''}<button class="btn block" data-act="${ui.modal && ui.modal.includes('data-act="cardInfo"') ? 'backModal' : 'closeModal'}">닫기</button>`;
      ui.prevModal = ui.modal; openModal(inner); },
    backModal() { ui.modal = ui.prevModal || null; ui.prevModal = null; render(); },
    node(d) { doAct(() => E.chooseNode(run, d.id)); },
    potion(d) {
      const id = run.potions[+d.slot]; if (!id) { toast('빈 물약 칸이야.'); return; }
      const p = D.POTIONS[id];
      const can = (run.screen === 'combat' && run.combat && !run.combat.over) || p.anywhere;
      openModal(`<h2>${p.icon} ${esc(p.name)}</h2><div>${esc(p.desc)}</div>
        <div class="row"><button class="btn block primary ${can ? '' : 'disabled'}" data-act="usePotion" data-slot="${d.slot}">사용</button><button class="btn block" data-act="dropPotion" data-slot="${d.slot}">버리기</button></div>
        <button class="btn block" data-act="closeModal">닫기</button>`);
    },
    usePotion(d) {
      const slot = +d.slot, p = D.POTIONS[run.potions[slot]];
      ui.modal = null;
      if (p.target && run.screen === 'combat' && E.aliveEnemies(run).length > 1) { ui.potionSel = slot; ui.sel = null; render(); return; }
      doAct(() => E.usePotion(run, slot, null));
    },
    dropPotion(d) { ui.modal = null; E.discardPotion(run, +d.slot); saveRun(); render(); },
    pile(d) {
      const c = run.combat;
      const map = { draw: ['뽑을 카드 (순서 무작위)', c.draw, true], disc: ['버린 카드', c.disc, false], exh: ['소멸한 카드', c.exh, false] };
      const [t, cards, sortIt] = map[d.w]; openModal(deckModal(cards, t, sortIt));
    },
    card(d) {
      const uid = +d.uid, c = run.combat;
      const cd = c.hand.find(x => x.uid === uid); if (!cd) return;
      ui.potionSel = null;
      if (ui.sel === uid) {
        const def = E.cardDef(cd);
        if (E.needsTarget(def) && E.aliveEnemies(run).length > 1) { toast('공격할 적을 터치해 줘'); return; }
        playSelected(null); return;
      }
      if (!E.canPlay(run, cd)) {
        const def = E.cardDef(cd);
        toast(def.unplayable ? '이 카드는 낼 수 없어.' : '에너지가 부족해.');
        const el = app.querySelector(`.card[data-uid="${uid}"]`); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
        return;
      }
      ui.sel = uid; render();
    },
    enemy(d) {
      const i = +d.i, e = run.combat.enemies[i];
      if (!e || e.dead) return;
      if (ui.sel != null) { playSelected(i); return; }
      if (ui.potionSel != null) { const slot = ui.potionSel; ui.potionSel = null; doAct(() => E.usePotion(run, slot, i)); return; }
      const def = D.ENEMIES[e.id], iv = E.intentView(run, e), m = def.moves[e.intent];
      const detail = [];
      if (m.dmg) detail.push(`피해 ${iv.parts[0].text}`);
      if (m.block) detail.push(`방어도 ${m.block}`);
      if (m.blockAll) detail.push(`모두 방어도 ${m.blockAll}`);
      if (m.selfSt) detail.push(Object.entries(m.selfSt).map(([s, v]) => `${D.STATUS[s].name} +${v}`).join(', '));
      if (m.playerSt) detail.push('나에게 ' + Object.entries(m.playerSt).map(([s, v]) => `${D.STATUS[s].name} ${v}`).join(', '));
      if (m.addCards) detail.push(m.addCards.map(a => `「${D.CARDS[a.id].name}」 ${a.n}장 섞기`).join(', '));
      if (m.heal) detail.push(`체력 ${m.heal} 회복`);
      if (m.summon) detail.push('부하 소환');
      openModal(`<div class="row" style="align-items:flex-start;gap:12px">${enemyPortrait(e.id, 'p-lg')}
        <div class="col" style="gap:4px"><h2>${esc(e.name)}</h2>${def.age ? `<span class="small dim">${def.age}세</span>` : ''}<div class="small">${esc(def.desc)}</div></div></div>
        <div class="panel small"><b>다음 행동: ${esc(m.name)}</b><br>${esc(detail.join(' · ') || '알 수 없음')}</div>
        ${Object.keys(e.st).length ? `<div class="panel small">${Object.entries(e.st).map(([s, v]) => `${D.STATUS[s].icon} <b>${D.STATUS[s].name}</b> ${D.STATUS[s].flag ? '' : v} — ${esc(D.STATUS[s].desc(v))}`).join('<br>')}</div>` : ''}
        <button class="btn block" data-act="closeModal">닫기</button>`);
    },
    bg() { if (ui.sel != null || ui.potionSel != null) { ui.sel = null; ui.potionSel = null; render(); } },
    endTurn() {
      if (!run.combat) return;
      ui.sel = null; ui.potionSel = null; ui.busy = true;
      doAct(() => E.endTurn(run));
      setTimeout(() => { if (!ui.hold) ui.busy = false; }, 500);
    },
    rwGold() { doAct(() => E.takeGold(run)); },
    rwRelic() { doAct(() => E.takeRelic(run)); },
    rwPotion() { doAct(() => E.takePotion(run)); },
    rwCardView(d) {
      const cd = run.rewards.cards[+d.i];
      openModal(`<div style="display:flex;justify-content:center;padding-top:10px">${cardHTML(cd, { big: true })}</div>
        <div class="small dim center">강화하면 → ${esc(E.describe(E.cardDef({ id: cd.id, up: true })).replace(/<[^>]+>/g, ''))}</div>
        <button class="btn primary block" data-act="rwCard" data-i="${d.i}">덱에 넣기</button><button class="btn block" data-act="closeModal">다시 고를래</button>`);
    },
    rwCard(d) { ui.modal = null; doAct(() => E.takeCard(run, +d.i)); },
    rwSkip() { doAct(() => E.skipCard(run)); },
    rwLeave() {
      const r = run.rewards;
      if (r && !r.cardTaken && !ui.confirmSkip) { ui.confirmSkip = true; toast('카드 보상을 아직 안 골랐어. 한 번 더 누르면 그냥 넘어가.'); setTimeout(() => { ui.confirmSkip = false; }, 3000); return; }
      ui.confirmSkip = false;
      if (r && r.potion && !r.potionTaken && !run.potions.includes(null)) toast('물약 칸이 가득 차서 물약은 두고 왔어.');
      doAct(() => E.leaveReward(run));
    },
    restHeal() { doAct(() => E.restHeal(run)); },
    restSmith() { doAct(() => E.restSmith(run)); },
    selView(d) {
      const uid = +d.uid, cd = run.deck.find(x => x.uid === uid), p = run.pending;
      const body = p.mode === 'upgrade'
        ? `<div class="row" style="justify-content:center;gap:6px">${cardHTML(cd)}<span style="font-size:24px">➜</span>${cardHTML({ id: cd.id, up: true })}</div>`
        : `<div style="display:flex;justify-content:center">${cardHTML(cd, { big: true })}</div>`;
      openModal(`<h2>${p.mode === 'upgrade' ? '이 카드를 강화할까?' : '이 카드를 뺄까?'}</h2>${body}
        <button class="btn primary block" data-act="selOk" data-uid="${uid}">${p.mode === 'upgrade' ? '강화!' : '제거'}</button><button class="btn block" data-act="closeModal">다른 카드</button>`);
    },
    selOk(d) { ui.modal = null; const mode = run.pending && run.pending.mode; const r = doAct(() => E.selectCard(run, +d.uid)); if (r && r.ok) toast(mode === 'upgrade' ? '⚒️ 강화 완료!' : '✂️ 카드를 뺐어.'); },
    selCancel() { doAct(() => E.cancelSelect(run)); },
    shopCardView(d) {
      const it = run.shop.cards[+d.i];
      openModal(`<div style="display:flex;justify-content:center;padding-top:10px">${cardHTML(it, { big: true })}</div>
        <button class="btn gold block ${run.gold < it.price ? 'disabled' : ''}" data-act="buy" data-k="cards" data-i="${d.i}">💰 ${it.price}에 구매</button><button class="btn block" data-act="closeModal">닫기</button>`);
    },
    buy(d) { ui.modal = null; const r = doAct(() => E.buy(run, d.k, +d.i)); if (r && r.ok) toast('구매 완료!'); },
    shopRemove() { doAct(() => E.shopRemove(run)); },
    leaveShop() { doAct(() => E.leaveShop(run)); },
    openChest() { doAct(() => E.openChest(run)); },
    leaveTreasure() { doAct(() => E.leaveTreasure(run)); },
    evOpt(d) { doAct(() => E.chooseEvent(run, +d.i)); },
    evLeave() { doAct(() => E.leaveEvent(run)); }
  };

  app.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || !app.contains(el)) return;
    const act = el.dataset.act;
    if (act === 'noop') { ev.stopPropagation(); return; }
    if (ui.busy && act !== 'closeModal') return;
    // 모달 배경 클릭만 닫기(모달 안쪽 클릭은 noop 상위로 안 올라감)
    if (act === 'closeModal' && el.classList.contains('modal-bg') && ev.target !== el) return;
    ev.stopPropagation();
    const h = H[act];
    if (h) {
      try { h(el.dataset, el); } catch (e) { console.error(e); toast('앗, 오류가 났어: ' + esc(e.message)); }
    }
  });
  window.addEventListener('resize', () => { if (run && run.screen === 'combat') layoutHand(); });

  // 테스트/디버그용
  window.BD_UI = { get run() { return run; }, set run(v) { run = v; }, render, ui, H };
  render();
})();
