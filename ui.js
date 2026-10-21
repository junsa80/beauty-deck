/* 미녀 덱: 밤의 여왕 — 화면(UI)
 * engine.js의 run 상태를 보고 화면을 그립니다. 게임 규칙은 전부 engine.js에 있습니다.
 */
(function () {
  'use strict';
  const E = window.BD_ENGINE, D = window.BD_DATA, A = window.BD_ART;
  const SAVE_KEY = 'beautydeck.run.v2', META_KEY = 'beautydeck.meta.v2', OLD_META = 'beautydeck.meta.v1', SET_KEY = 'beautydeck.settings.v1';
  const app = document.getElementById('app');
  const fxLayer = document.getElementById('fxlayer');

  let run = null;
  let meta = loadMeta();
  const settings = Object.assign({ sound: false, vibe: true, reduce: false, fast: false, asc: 0, talk: true, loadout: {} }, loadJSON(SET_KEY) || {});
  if (!settings.loadout || typeof settings.loadout !== 'object') settings.loadout = {};
  const ui = { story: null, view: 'title', sel: null, potionSel: null, busy: false, modal: null, hold: false, deadShown: new Set(), runAch: [], tut: 0, lastScreen: null, codexTab: 'cards', codexCls: 'all', modalStack: [], pendingBackup: null };

  // ───────── 저장 ─────────
  function loadJSON(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 공간 문제는 무시 */ } }
  function loadMeta() {
    const m2 = loadJSON(META_KEY); if (m2) return E.migrateMeta(m2);
    const m1 = loadJSON(OLD_META); // v0.1 기록 이어받기
    const m = E.migrateMeta(m1);
    if (m1) { m.runs = m1.runs || 0; m.wins = m1.wins || 0; m.kills = m1.kills || 0; m.bestFloor = m1.bestFloor || 0; saveJSON(META_KEY, m); }
    return m;
  }
  function saveMeta() { meta.updatedAt = new Date().toISOString(); saveJSON(META_KEY, meta); }
  function saveSettings() { saveJSON(SET_KEY, settings); applySettings(); }
  function saveRun() {
    if (!run) return;
    if (run.over) {
      if (!run.recorded) { E.recordRun(meta, run); grantAch(); saveMeta(); }
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
    } else saveJSON(SAVE_KEY, JSON.parse(JSON.stringify(run, (k, v) => (k === 'fx' ? undefined : v))));
    stampSave();
  }
  function stampSave() {
    meta.updatedAt = new Date().toISOString();
    saveJSON(META_KEY, meta);
  }
  function saveStatusLine() {
    const t = meta.updatedAt ? new Date(meta.updatedAt) : null;
    const when = t && !isNaN(t) ? t.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '아직 없음';
    return `이 기기에서 자동 저장 · 다른 기기는 설정의 백업 · 마지막 저장 ${when}`;
  }
  function buildBackup() {
    const cur = run && !run.over ? JSON.parse(JSON.stringify(run, (k, v) => (k === 'fx' ? undefined : v))) : loadJSON(SAVE_KEY);
    return {
      v: 1,
      game: 'beauty-deck',
      exportedAt: new Date().toISOString(),
      run: cur && !cur.over ? cur : null,
      meta: JSON.parse(JSON.stringify(meta)),
      settings: JSON.parse(JSON.stringify(settings))
    };
  }
  function summarizeBackup(b) {
    const m = b.meta || {};
    const r = b.run;
    const runTxt = r && r.starter && D.STARTERS[r.starter]
      ? `${D.STARTERS[r.starter].title} · ${r.act < 4 ? r.act + '막' : '종막'}`
      : '진행 중 원정 없음';
    const lv = Object.keys(D.MASTERY.heroes).map(h => `${D.HEROINES[h].name} Lv${E.heroLevel(E.migrateMeta(m), h).lv}`).join(' ');
    return `원정 ${m.runs || 0}회 · 클리어 ${m.wins || 0}회 · 승천 ${m.ascMax || 0} · ${lv} · ${runTxt}`;
  }
  function backupIsOlderThanLocal(b) {
    const localTs = meta.updatedAt ? Date.parse(meta.updatedAt) : 0;
    const fileTs = b.exportedAt ? Date.parse(b.exportedAt) : 0;
    if (localTs && fileTs && localTs > fileTs) return true;
    const lr = meta.runs || 0, lw = meta.wins || 0;
    const fr = (b.meta && b.meta.runs) || 0, fw = (b.meta && b.meta.wins) || 0;
    if (lr > fr || lw > fw) return true;
    return false;
  }
  function applyBackup(b) {
    if (!b || b.game !== 'beauty-deck' || b.v !== 1 || !b.meta) throw new Error('형식이 맞지 않는 백업이야');
    meta = E.migrateMeta(b.meta);
    meta.updatedAt = new Date().toISOString();
    saveJSON(META_KEY, meta);
    if (b.settings && typeof b.settings === 'object') {
      Object.assign(settings, { sound: false, vibe: true, reduce: false, fast: false, asc: 0, talk: true, loadout: {} }, b.settings);
      if (!settings.loadout || typeof settings.loadout !== 'object') settings.loadout = {};
      saveSettings();
    }
    if (b.run && b.run.v === 2 && !b.run.over && D.STARTERS[b.run.starter]) {
      saveJSON(SAVE_KEY, b.run);
      run = null;
    } else {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
      run = null;
    }
    ui.view = 'title'; ui.modal = null; ui.modalStack = []; ui.pendingBackup = null;
    applySettings();
    render();
    toast('백업을 불러왔어.');
  }
  function grantAch() {
    const got = E.checkAchievements(meta, run);
    for (const id of got) {
      const a = D.ACHIEVEMENTS[id]; ui.runAch.push(id);
      toast(`🏆 업적 달성! <b>${esc(a.icon + ' ' + a.name)}</b>${a.card ? `<br><span class="small">전용 카드 「${esc(D.CARDS[a.card].name)}」 해금</span>` : ''}${id === 'boss_belita' ? '<br><span class="small">새 히로인 <b>아리아</b> 합류!</span>' : ''}`, 3600);
      sfx('ach'); buzz([30, 40, 60]);
    }
    if (got.length) saveMeta();
    return got;
  }
  function applySettings() {
    document.body.classList.toggle('reduce', !!settings.reduce);
    document.body.classList.toggle('fast', !!settings.fast);
  }

  // ───────── 소리 / 진동 ─────────
  let actx = null;
  function sfx(kind) {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime;
      const tone = (f, d, type, vol, slide, at) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t + (at || 0));
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + (at || 0) + d);
        g.gain.setValueAtTime(vol || 0.12, t + (at || 0)); g.gain.exponentialRampToValueAtTime(0.0001, t + (at || 0) + d);
        o.connect(g).connect(actx.destination); o.start(t + (at || 0)); o.stop(t + (at || 0) + d + 0.02);
      };
      const noise = (d, vol, at) => {
        const b = actx.createBuffer(1, Math.floor(actx.sampleRate * d), actx.sampleRate), ch = b.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
        const s = actx.createBufferSource(), g = actx.createGain(); s.buffer = b; g.gain.value = vol || 0.15;
        s.connect(g).connect(actx.destination); s.start(t + (at || 0));
      };
      ({
        tap: () => tone(660, 0.05, 'triangle', 0.06),
        card: () => tone(520, 0.08, 'triangle', 0.08, 880),
        hit: () => { noise(0.12, 0.18); tone(180, 0.12, 'square', 0.06, 90); },
        big: () => { noise(0.25, 0.25); tone(120, 0.3, 'sawtooth', 0.08, 50); },
        hurt: () => { noise(0.15, 0.2); tone(140, 0.2, 'square', 0.07, 70); },
        block: () => tone(300, 0.1, 'triangle', 0.1, 420),
        heal: () => { tone(523, 0.12, 'sine', 0.08); tone(784, 0.18, 'sine', 0.08, null, 0.08); },
        buff: () => tone(440, 0.15, 'sine', 0.07, 660),
        win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, null, i * 0.09)),
        lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sine', 0.09, null, i * 0.14)),
        ach: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, null, i * 0.07)),
        coin: () => { tone(988, 0.06, 'square', 0.05); tone(1319, 0.12, 'square', 0.05, null, 0.06); },
        turn: () => tone(330, 0.12, 'sine', 0.05, 440)
      })[kind]();
    } catch (e) { /* 오디오 미지원 */ }
  }
  function buzz(p) { if (settings.vibe && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* 무시 */ } }
  const reduced = () => settings.reduce || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ───────── 유틸 ─────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function toast(msg, ms) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg;
    if (ms) t.style.animationDuration = ms + 'ms';
    const box = document.getElementById('toast'); box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => t.remove(), (ms || 2600) + 100);
  }
  const HAIR = { sera: 1, luna: 0, yuki: 2, aria: 3, mariel: 3, serena: 0, odette: 2 };
  function heroInfo(hid, kind, extra) {
    const h = D.HEROINES[hid];
    return Object.assign({ kind, woman: true, c1: h ? h.colors[0] : '#888', c2: h ? h.colors[1] : '#222', hair: HAIR[hid] != null ? HAIR[hid] : (A.hash(hid) % 4) }, extra || {});
  }
  function enemyInfo(eid, extra) {
    const d = D.ENEMIES[eid];
    return Object.assign({ kind: 'enemy', woman: !!d.age, c1: d.colors[0], c2: d.colors[1], glyph: d.glyph, crown: !!d.boss && !!d.age, hair: A.hash(eid) % 4 }, extra || {});
  }
  function cardInfo(d) {
    const h = d.hero && D.HEROINES[d.hero];
    const col = h ? h.colors : (A.CLS_COL[d.cls] || A.CLS_COL.neutral);
    return { kind: 'card', type: d.type, c1: col[0], c2: d.rarity === 'legend' ? '#2a0a00' : col[1], woman: !!h, hair: h ? (HAIR[d.hero] != null ? HAIR[d.hero] : A.hash(d.hero) % 4) : 0, glyph: d.icon || '✦', fallback: null };
  }
  function galleryInfo(gid, extra) {
    const g = D.GALLERY[gid];
    if (g.hero) return heroInfo(g.hero, 'gallery', extra);
    if (g.enemy) return enemyInfo(g.enemy, Object.assign({ kind: 'gallery' }, extra));
    return Object.assign({ kind: 'gallery', party: gid === 'g_party', c1: '#ff9ec7', c2: '#1a0b2a', glyph: '✨' }, extra || {});
  }
  // 그림 박스: data-art 를 달아 두면 터치 시 크게 보기
  function artBox(key, info, cls, o) {
    o = o || {};
    const view = o.act ? `data-act="${esc(o.act)}"` : o.noView ? '' : `data-act="viewArt" data-key="${esc(key)}" data-info="${esc(JSON.stringify(info))}" data-cap="${esc(o.cap || '')}"`;
    return `<div class="artbox ${cls || ''}" ${view}>${A.html(key, info, { eager: o.eager })}</div>`;
  }
  function heroArt(hid, cls, o) {
    const skin = E.skinFor(meta, hid);
    const box = artBox('hero:' + hid, heroInfo(hid, 'hero'), (cls || '') + (skin ? ' ' + skin.cls : ''), Object.assign({ cap: D.HEROINES[hid] ? D.HEROINES[hid].name : '' }, o));
    return skin ? box.replace(/<\/div>$/, `<span class="skinmark">${esc(skin.name)}</span></div>`) : box;
  }
  function enemyArt(eid, cls, o) { return artBox('enemy:' + eid, enemyInfo(eid), cls, Object.assign({ cap: D.ENEMIES[eid].name }, o)); }

  const TYPE_KO = { attack: '공격', skill: '스킬', power: '파워', status: '상태', curse: '저주' };
  const RAR_KO = { starter: '기본', common: '일반', uncommon: '고급', rare: '희귀', legend: '전설', special: '특수', token: '토큰' };
  function cardHTML(card, o) {
    o = o || {};
    const d = E.cardDef(card);
    const h = d.hero && D.HEROINES[d.hero];
    const info = cardInfo(d); if (d.hero) info.fallback = 'hero:' + d.hero;
    const art = `<div class="art">${A.html('card:' + d.id, info)}</div>`;
    const cost = d.unplayable ? '' : `<div class="cost">${d.cost === -1 ? 'X' : d.cost}</div>`;
    const desc = E.describe(d, o.ctx ? Object.assign({ fn: card.fn || 0, allies: run && run.combat ? run.combat.allies.length : null }, o.ctx) : o.ctx);
    const cls = ['card', 't-' + d.type, 'r-' + d.rarity, card.up ? 'up' : '', o.big ? 'big' : '', o.cls || ''].join(' ');
    const attrs = o.act ? `data-act="${o.act}" ${Object.entries(o.data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}` : '';
    const syn = o.syn ? synBadge(d.id) : '';
    const fnb = card.fn ? `<div class="fnbadge">📝${card.fn}</div>` : (d.retain ? '<div class="fnbadge ret">보존</div>' : '');
    const moonb = d.moon ? `<div class="moonbadge ${run && run.combat && run.combat.moon === d.moon.p ? 'on' : ''}">${E.MOON_ICON[d.moon.p]}</div>` : '';
    return `<div class="${cls}" ${attrs}>${cost}${art}${fnb}${moonb}<div class="cname">${esc(d.name)}</div><div class="chero">${h ? esc(h.name) : esc(RAR_KO[d.rarity] || '')}</div><div class="cdesc"><span>${desc}</span></div><div class="ctype">${TYPE_KO[d.type] || ''}</div>${syn}</div>`;
  }
  function synBadge(id) {
    if (!run) return '';
    const s = E.synergy(run, id);
    const best = s.tags.filter(x => x.n > 0);
    if (!best.length) return '';
    return `<div class="synbadge" title="덱 조합">🔗${best.map(x => (D.ARCH[x.t] ? D.ARCH[x.t].icon : '') + x.n).join(' ')}</div>`;
  }
  function chipsHTML(st, act) {
    return `<div class="chips">${Object.keys(st).filter(k => D.STATUS[k] && st[k]).map(k => {
      const s = D.STATUS[k];
      return `<span class="chip ${s.type}" data-act="status" data-s="${k}" data-v="${st[k]}">${s.icon}${s.flag ? '' : st[k]}</span>`;
    }).join('')}</div>`;
  }
  function hpBarHTML(hp, max, block) {
    return `<div class="hpwrap">${block ? `<div class="blockbadge">${block}</div>` : ''}<div class="hpbar ${block ? 'blocked' : ''}"><div class="fill" style="width:${Math.max(0, hp / max * 100)}%"></div><div class="txt">${hp} / ${max}</div></div></div>`;
  }

  // ───────── 상단 바 ─────────
  function topBar() {
    const node = run.pos && run.map.nodes[run.pos];
    const act = D.ACTS[run.act];
    const floorTxt = node ? (node.type === 'boss' ? '보스' : `${node.floor + 1}층`) : '출발';
    return `<div class="topbar">
      <button class="tb" data-act="menu" aria-label="메뉴">☰</button>
      <span class="tb hpt">❤️ ${run.hp}/${run.maxHp}</span>
      <span class="tb">💰 ${run.gold}</span>
      <span class="tb actt" title="${esc(act.name)}">${run.act < 4 ? run.act + '막' : '종막'}·${floorTxt}</span>
      ${run.asc ? `<span class="tb asct">🔥${run.asc}</span>` : ''}
      <span class="sp"></span>
      ${run.potions.map((p, i) => `<button class="tb potion-slot ${p ? 'full' : ''}" data-act="potion" data-slot="${i}" aria-label="물약">${p ? D.POTIONS[p].icon : ''}</button>`).join('')}
      <button class="tb" data-act="deck" aria-label="덱">🃏${run.deck.length}</button>
    </div>
    <div class="relicbar">${run.relics.map(r => `<button class="relic ${D.RELICS[r].boss ? 'bossr' : ''}" data-act="relic" data-id="${r}">${D.RELICS[r].icon}</button>`).join('') || '<span class="dim small">유물 없음</span>'}</div>`;
  }

  // ───────── 렌더 ─────────
  function render() {
    let html, scr;
    if (!run) { scr = ui.view; const pages = { pick: renderPick, title: renderTitle, store: renderStore }; html = (pages[scr] || renderTitle)(); }
    else {
      scr = (ui.hold && run.combat) ? 'combat' : run.screen;
      html = ({ map: renderMap, combat: renderCombat, reward: renderReward, rest: renderRest, shop: renderShop, event: renderEvent,
                treasure: renderTreasure, select: renderSelect, victory: renderEnd, gameover: renderEnd })[scr]();
    }
    const changed = scr !== ui.lastScreen; ui.lastScreen = scr;
    if (ui.modal) html += `<div class="modal-bg" data-act="closeModal"><div class="modal" data-act="noop">${ui.modal}</div></div>`;
    if (ui.story) html += storyHTML();
    app.innerHTML = `<div class="screen ${changed && !reduced() ? 'enter' : ''} scr-${scr}" ${run && run.screen !== 'combat' ? `style="--actbg:${D.ACTS[run.act].bg[0]}"` : ''}>${html}</div>`;
    if (run && run.screen === 'map' && !ui.hold) scrollMap();
    if (run && (run.screen === 'combat' || ui.hold)) layoutHand();
  }

  function renderTitle() {
    const saved = loadJSON(SAVE_KEY);
    const ok = saved && !saved.over && saved.v === 2 && D.STARTERS[saved.starter];
    const achN = Object.keys(meta.ach).length, achT = Object.keys(D.ACHIEVEMENTS).length;
    const newG = meta.newGallery && meta.newGallery.length;
    const freeLeft = E.offerOpen() && Object.keys(D.SHOP.packs).some(id => !E.ownsPack(meta, id));
    return `<div class="scroll"><div class="title-screen">
      <div class="logo">미녀 덱<small>밤의 여왕</small></div>
      <div class="title-heroes">${Object.keys(D.STARTERS).map(id => {
        const s = D.STARTERS[id];
        if (s.pack && !E.ownsPack(meta, s.pack)) return artBox('hero:' + id, heroInfo(id, 'hero'), 'th shopwait', { eager: true, act: 'store' });
        return E.heroUnlocked(meta, id)
          ? heroArt(id, 'th', { eager: true })
          : `<div class="artbox th locked" data-act="lockedHero">${A.html('hero:' + id, heroInfo(id, 'hero', { silhouette: true }))}<span class="lockq">?</span></div>`;
      }).join('')}</div>
      <div class="dim small">덱빌딩 로그라이트 · 숲과 밤의 성, 별의 첨탑을 지나 황혼의 여신에게</div>
      <div class="col" style="width:100%;max-width:320px">
        ${ok ? `<button class="btn primary block" data-act="continue">▶ 이어하기 <span class="small">(${esc(D.STARTERS[saved.starter].title)} · ${saved.act < 4 ? saved.act + '막' : '종막'})</span></button>` : ''}
        <button class="btn ${ok ? '' : 'primary'} block" data-act="newGame">⚔️ 새 원정 시작</button>
        <div class="row"><button class="btn block" data-act="codex">📖 도감${newG ? ' <span class="dot"></span>' : ''}</button><button class="btn block" data-act="achv">🏆 업적 ${achN}/${achT}</button></div>
        <button class="btn block" data-act="store">🛍️ 상점${freeLeft ? ' · 무료 공개' : ''}</button>
        <button class="btn block" data-act="heroes">💞 히로인 · 레벨 · 스토리${storyNewCount() ? ` <span class="dot"></span>` : ''}</button>
        <div class="row"><button class="btn block" data-act="help">❔ 도움말</button><button class="btn block" data-act="settings">⚙️ 설정</button></div>
      </div>
      <div class="dim small">원정 ${meta.runs}회 · 클리어 ${meta.wins}회 · 최고 승천 ${Math.max(0, meta.ascMax - (meta.wins ? 1 : 0))}${meta.ascMax ? ` · 승천 ${meta.ascMax}까지 열림` : ''}</div>
      <div class="dim" style="font-size:11px">${esc(saveStatusLine())}</div>
      <div class="dim" style="font-size:11px">v${D.VERSION} · 모든 등장인물은 20대 이상의 성인입니다</div>
    </div></div>`;
  }

  function renderPick() {
    const asc = Math.min(settings.asc, meta.ascMax);
    const ascRow = meta.ascMax > 0 ? `<div class="panel col asc-panel">
        <div class="row" style="justify-content:space-between"><b>🔥 승천 ${asc}</b><span class="small dim">최대 ${meta.ascMax}</span></div>
        <div class="row"><button class="btn" data-act="asc" data-d="-1" ${asc <= 0 ? 'disabled' : ''}>−</button>
        <input type="range" min="0" max="${meta.ascMax}" value="${asc}" data-act="noop" id="ascr" aria-label="승천 단계">
        <button class="btn" data-act="asc" data-d="1" ${asc >= meta.ascMax ? 'disabled' : ''}>+</button></div>
        <div class="small asc-desc">${D.ASCENSION.slice(1, asc + 1).map((t, i) => `<div>${i + 1}. ${esc(t)}</div>`).join('') || '기본 난이도'}</div></div>`
      : `<div class="small dim center">한 번 클리어하면 🔥승천(난이도 1~10)이 열려.</div>`;
    return `<div class="topbar"><button class="tb" data-act="toTitle" aria-label="뒤로">←</button><span>히로인 선택</span></div>
    <div class="scroll"><div class="col pad">
      ${ascRow}
      ${Object.entries(D.STARTERS).map(([id, s]) => {
        const h = D.HEROINES[s.hero], r = D.RELICS[s.relic], wins = meta.heroWins[id] || 0;
        const storyLocked = s.locked && !(meta.ach && meta.ach.boss_belita);
        if (storyLocked) return `<div class="panel col lockedpanel"><div class="hero-pick">
            <div class="artbox hp locked">${A.html('hero:' + id, heroInfo(id, 'hero', { silhouette: true }))}<span class="lockq">🔒</span></div>
            <div class="col" style="gap:6px"><h3>??? · ${esc(h.job)}</h3><div class="small">${esc(s.unlockText || '조건을 달성하면 합류해.')}</div></div></div></div>`;
        if (s.pack && !E.ownsPack(meta, s.pack)) return `<div class="panel col">
          <div class="hero-pick">${heroArt(s.hero, 'hp')}
            <div class="col" style="gap:4px">
              <h3>${esc(s.title)}</h3>
              <div><span class="tag">${esc(h.job)}</span><span class="tag">${h.age}세</span></div>
              <div class="small">${esc(s.pitch)}</div>
              <div class="small dim">추가 히로인. 성능은 받고 난 뒤의 원정에서만 써.</div>
            </div></div>
          <button class="btn gold block" data-act="store">🛍️ 상점에서 무료로 받기</button>
        </div>`;
        const arch = D.CLASS_ARCH[s.cls].map(t => `<span class="tag">${D.ARCH[t].icon} ${esc(D.ARCH[t].name)}</span>`).join('');
        return `<div class="panel col">
          <div class="hero-pick">${heroArt(s.hero, 'hp')}
            <div class="col" style="gap:4px">
              <h3>${esc(s.title)} ${wins ? `<span title="클리어">⭐${wins > 1 ? wins : ''}</span>` : ''}</h3>
              ${lvMini(id)}
              <div><span class="tag">${esc(h.job)}</span><span class="tag">${h.age}세</span><span class="tag">❤️ ${s.hp - (asc >= 6 ? 6 : 0)}</span>${meta.heroBestAsc[id] != null && wins ? `<span class="tag">🔥${meta.heroBestAsc[id]}</span>` : ''}</div>
              <div class="small">${esc(s.pitch)}</div>
              ${mechListHTML(s)}
              <div class="quote">“${esc(s.line)}”</div>
            </div></div>
          <div class="small"><b>${r.icon} ${esc(r.name)}</b> — ${esc(r.desc)}${E.masteryHas(meta, id, 'relic') ? ' <span class="dim">(기본)</span>' : ''}</div>
          <div class="archrow">${arch}</div>
          ${loadoutHTML(id)}
          <div class="row"><button class="btn" data-act="profile" data-id="${id}">💞 프로필</button><button class="btn" data-act="previewDeck" data-id="${id}">시작 덱</button>
          <button class="btn primary" style="flex:1" data-act="pick" data-id="${id}">이 히로인으로 출발</button></div>
        </div>`;
      }).join('')}
    </div></div>`;
  }
  function renderStore() {
    const open = E.offerOpen();
    const cards = Object.entries(D.SHOP.packs).map(([id, p]) => {
      const owned = E.ownsPack(meta, id);
      const faces = (p.heroes || Object.keys(p.skins || {})).map(h => {
        const sk = p.skins && p.skins[h];
        return artBox('hero:' + h, heroInfo(h, 'hero'), 'hl' + (sk ? ' ' + sk.cls : ''), { act: 'noop' });
      }).join('');
      const split = (title, arr) => arr && arr.length ? `<div class="small"><b>${title}</b></div><ul class="store-split">${arr.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
      let btn = '<div class="small dim">보유 중. 플레이 보상은 이 버튼과 별개야.</div>';
      if (!owned && open) btn = `<button class="btn gold block" data-act="claimPack" data-id="${esc(id)}">무료로 받기</button>`;
      else if (!owned) btn = '<div class="small">이 공개 버전에서는 받을 수 없어. 이미 받은 것은 그대로야.</div>';
      return `<div class="panel col store-card">
        <div class="row" style="justify-content:space-between"><b>${esc(p.name)}</b><span class="tag">${p.kind === 'character' ? '캐릭터 추가' : '외형'}</span></div>
        <div class="store-faces">${faces}</div>
        <div class="small">${esc(p.blurb)}</div>
        ${split('받으면', p.own)}
        ${split('플레이해야', p.play)}
        <div class="free-badge">공개 버전 · 무료</div>
        ${btn}
      </div>`;
    }).join('');
    return `<div class="topbar"><button class="tb" data-act="toTitle" aria-label="뒤로">←</button><span>상점</span></div>
      <div class="scroll"><div class="col pad">
        <div class="small dim">${esc(D.SHOP.note)}</div>
        ${cards}
      </div></div>`;
  }

  const NODE_ICON = { monster: '⚔️', elite: '😈', rest: '🔥', shop: '🛍️', event: '❓', treasure: '🎁', boss: '👑' };
  const NODE_NAME = { monster: '전투', elite: '엘리트', rest: '휴식', shop: '상점', event: '이벤트', treasure: '보물', boss: '보스' };
  const FH = 74;
  function renderMap() {
    const m = run.map, W = Math.min(window.innerWidth, 480) - 24, H = (m.floors + 1) * FH + 70;
    const avail = new Set(E.availableNodes(run));
    const pos = id => {
      const n = m.nodes[id];
      if (id === 'boss') return { x: W / 2, y: 56 };
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
    const bossId = (D.ENCOUNTERS[run.act].boss[0] || [])[0];
    for (const n of Object.values(m.nodes)) {
      const p = pos(n.id);
      const cls = ['node', 'n-' + n.type, n.type === 'boss' ? 'boss' : '', run.visited.includes(n.id) ? 'visited' : '', run.pos === n.id ? 'current' : '', avail.has(n.id) ? 'avail' : 'locked'].join(' ');
      const inner = n.type === 'boss' && bossId ? `<span class="bossart">${A.html('enemy:' + bossId, enemyInfo(bossId))}</span>` : NODE_ICON[n.type];
      nodes += `<button class="${cls}" style="left:${p.x}px;top:${p.y}px" data-act="node" data-id="${n.id}" aria-label="${NODE_NAME[n.type]}">${inner}</button>`;
    }
    let labels = '';
    for (let f = 0; f < m.floors; f++) labels += `<div class="floorlbl" style="top:${H - 46 - f * FH}px">${f + 1}</div>`;
    const act = D.ACTS[run.act];
    return `${topBar()}
      <div class="actbar" style="background:linear-gradient(90deg,${act.bg[0]},${act.bg[1]})"><b>${esc(act.name)}</b><span class="small dim">보스: ${bossId ? esc(D.ENEMIES[bossId].name) : '?'}</span></div>
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
  const TUT = [
    { t: '👋 첫 전투야! 적 머리 위 아이콘은 <b>다음 행동 예고</b>야. ⚔️숫자만큼 때리려는 거야.', at: 'intent' },
    { t: '카드를 <b>터치해서 고르고</b>, 공격 카드는 <b>적을 터치</b>하면 써. (적이 하나면 카드를 한 번 더 터치)', at: 'hand' },
    { t: '왼쪽 아래 🟠는 <b>에너지</b>. 카드 왼쪽 위 숫자만큼 써. 매 턴 다시 차.', at: 'energy' },
    { t: '🛡️<b>방어도</b>는 들어오는 피해를 막아 줘. 다 썼으면 <b>턴 종료</b>! 카드를 길게 보고 싶으면 덱(🃏)에서 터치.', at: 'end' }
  ];
  function renderCombat() {
    const c = run.combat, P = c.p;
    const sel = ui.sel != null ? c.hand.find(x => x.uid === ui.sel) : null;
    const selDef = sel && E.cardDef(sel);
    const alive = E.aliveEnemies(run);
    const pot = ui.potionSel != null && D.POTIONS[run.potions[ui.potionSel]];
    const targeting = (selDef && E.needsTarget(selDef) && alive.length > 1) || (pot && pot.target && alive.length > 1);
    const enemies = c.enemies.map((e, i) => {
      if (e.dead) {
        if (ui.deadShown.has(e.uid)) return `<div class="enemy dead"></div>`;
        ui.deadShown.add(e.uid);
      }
      const d = D.ENEMIES[e.id];
      const iv = e.dead ? null : E.intentView(run, e);
      const intent = iv ? iv.parts.map(p => p.k === 'atk' ? `<span class="atk ${p.total >= 20 ? 'heavy' : ''}">🗡️${p.text}</span>` : p.k === 'def' ? '<span class="def">🛡️</span>' : p.k === 'buff' ? '<span class="buff">✨</span>' : p.k === 'debuff' ? '<span class="debuff">🌀</span>' : p.k === 'summon' ? '<span>📯</span>' : '❔').join('') : '';
      return `<div class="enemy ${d.boss ? 'boss' : ''} ${d.kind === 'elite' ? 'elite' : ''} ${e.dead ? 'dying' : ''} ${targeting && !e.dead ? 'targetable' : ''}" data-act="enemy" data-i="${i}" data-who="${e.uid}">
        <div class="intent" title="${iv ? esc(iv.name) : ''}">${intent}</div>
        <div class="eportrait">${A.html('enemy:' + e.id, enemyInfo(e.id))}</div>
        <div class="ename">${esc(e.name)}</div>
        ${hpBarHTML(e.hp, e.maxHp, e.block)}
        ${chipsHTML(e.st)}
      </div>`;
    }).join('');
    const sid = D.STARTERS[run.starter].hero, h = D.HEROINES[sid], pskin = E.skinFor(meta, sid);
    let hint = '';
    if (sel) hint = targeting ? '공격할 적을 터치해!' : '한 번 더 터치하면 사용';
    else if (ui.potionSel != null) hint = '물약을 쓸 적을 터치해!';
    else if (!c.hand.some(cd => E.canPlay(run, cd))) hint = '낼 카드가 없어 → 턴 종료';
    const incoming = E.incomingDamage(run);
    const noMore = !c.hand.some(cd => E.canPlay(run, cd));
    const net = E.incomingNet(run);
    const tut = !meta.tutorialDone && ui.tut < TUT.length ? `<div class="tutbox tut-${TUT[ui.tut].at}"><div>${TUT[ui.tut].t}</div><div class="row" style="justify-content:flex-end;margin-top:6px"><button class="btn sm ghost" data-act="tutSkip">건너뛰기</button><button class="btn sm primary" data-act="tutNext">${ui.tut === TUT.length - 1 ? '알겠어!' : '다음 ▶'} <span class="small">${ui.tut + 1}/${TUT.length}</span></button></div></div>` : '';
    return `${topBar()}
    <div class="battle" data-act="bg" style="--actbg:${D.ACTS[run.act].bg[0]}">
      <div class="enemies n${c.enemies.length}">${enemies}</div>
      <div class="player" data-who="p">
        <div class="pportrait ${pskin ? pskin.cls : ''}" data-act="viewArt" data-key="hero:${sid}" data-info="${esc(JSON.stringify(heroInfo(sid, 'hero')))}" data-cap="${esc(h.name)}">${A.html('hero:' + sid, heroInfo(sid, 'hero'))}</div>
        <div class="pinfo"><div class="row" style="justify-content:space-between"><b>${esc(h.name)}</b>${pskin ? `<span class="skinmark-inline">${esc(pskin.name)}</span>` : ''}${incoming ? `<span class="small incoming ${net ? '' : 'safe'}">🗡️${incoming}${P.block ? ` − 🛡️${P.block}` : ''}${c.allies.length ? ` − 🪆` : ''} → <b>${net ? '−' + net : '안전'}</b></span>` : '<span class="small dim">공격 예고 없음</span>'}</div>
        ${hpBarHTML(run.hp, run.maxHp, P.block)}${chipsHTML(P.st, true)}${mechHTML(c)}</div>
      </div>
      <div class="controls">
        <div class="energy ${c.energy ? '' : 'zero'}">${c.energy}/${E.maxEnergy(run)}</div>
        <button class="pilebtn" data-act="pile" data-w="draw" aria-label="뽑을 더미">📚${c.draw.length}</button>
        <div class="hint">${hint}</div>
        <button class="pilebtn" data-act="pile" data-w="disc" aria-label="버린 더미">🗑️${c.disc.length}</button>
        ${c.exh.length ? `<button class="pilebtn" data-act="pile" data-w="exh" style="min-width:40px" aria-label="소멸">🔥${c.exh.length}</button>` : ''}
        <button class="endturn ${noMore ? 'glow' : ''}" data-act="endTurn">턴 종료</button>
      </div>
      ${tut}
    </div>
    <div class="hand ${ui.deal ? 'deal' : ''}" id="hand">${c.hand.map((cd, i) => cardHTML(cd, { act: 'card', data: { uid: cd.uid }, ctx: { p: P }, cls: (cd.uid === ui.sel ? 'sel ' : '') + (E.canPlay(run, cd) ? 'playable' : 'unplayable') }).replace('<div class="card', `<div style="--i:${i}" class="card`)).join('')}</div>
`;
  }
  // v1.3: 인형(마리엘) · 달 위상(세레나) 표시 — 한 줄짜리라 화면 높이를 거의 안 늘림
  function mechHTML(c) {
    let h = '';
    if (run.cls === 'moon') {
      const nx = (c.moon + 1) % 4;
      h += `<div class="mech moonrow" data-act="mechInfo" data-k="moon">${[0, 1, 2, 3].map(i => `<span class="mph ${i === c.moon ? 'on' : ''}">${E.MOON_ICON[i]}</span>`).join('')}<span class="small">지금 <b>${E.MOON[c.moon]}</b> → 다음 ${E.MOON[nx]}</span></div>`;
    }
    if (c.allies.length || run.cls === 'puppet') {
      h += `<div class="mech dollrow" data-act="mechInfo" data-k="doll">${c.allies.length ? c.allies.map((d, i) => `<span class="doll ${i === 0 ? 'front' : ''}" data-who="doll${i}">${d.dodo ? '🛡️' : '🪆'}<b>${d.hp}</b>/${d.maxHp} ⚔${d.atk + (c.p.st.dollCraft || 0)}</span>`).join('') : '<span class="small dim">인형 없음</span>'}</div>`;
    }
    return h;
  }
  function layoutHand() {
    const hand = document.getElementById('hand'); if (!hand) return;
    const n = hand.children.length; if (!n) return;
    const cw = 100, avail = hand.clientWidth - 12;
    const ov = n * cw > avail ? -((n * cw - avail) / (n - 1)) : 2;
    hand.style.setProperty('--ov', ov + 'px');
    ui.deal = false;
  }

  // ───────── 보상 ─────────
  function renderReward() {
    const r = run.rewards;
    const items = [];
    if (r.bossRelics && !r.bossRelicTaken) {
      items.push(`<div class="section-title" style="padding-left:0">👑 보스 유물 — 하나만 고를 수 있어 (필수)</div>` + r.bossRelics.map((id, i) => { const rl = D.RELICS[id]; return `<button class="list-btn bossrelic" data-act="rwBoss" data-i="${i}"><span class="ic">${rl.icon}</span><span>${esc(rl.name)}<br><span class="small dim">${esc(rl.desc)}</span></span></button>`; }).join(''));
    } else if (r.bossRelics) items.push(`<div class="small dim">👑 보스 유물 획득 완료</div>`);
    items.push(`<button class="list-btn ${r.goldTaken ? 'done' : ''}" data-act="rwGold"><span class="ic">💰</span>${r.gold} 골드</button>`);
    if (r.relic) { const rl = D.RELICS[r.relic]; items.push(`<button class="list-btn ${r.relicTaken ? 'done' : ''}" data-act="rwRelic"><span class="ic">${rl.icon}</span><span>${esc(rl.name)}<br><span class="small dim">${esc(rl.desc)}</span></span></button>`); }
    if (r.potion) { const p = D.POTIONS[r.potion]; items.push(`<button class="list-btn ${r.potionTaken ? 'done' : ''}" data-act="rwPotion"><span class="ic">${p.icon}</span><span>${esc(p.name)}<br><span class="small dim">${esc(p.desc)}</span></span></button>`); }
    const title = r.kind === 'boss' ? '보스 격파! 👑' : r.kind === 'elite' ? '엘리트 격파! 😈' : '전투 승리! 🎉';
    return `${topBar()}<div class="scroll"><div class="col pad">
      <h2 class="center">${title}</h2>
      ${items.join('')}
      <div class="section-title" style="padding-left:0">${r.cardTaken ? '카드 보상 완료' : '카드 1장을 골라 덱에 넣어 · 🔗는 내 덱과의 조합'}</div>
      ${r.cardTaken ? '' : `<div class="grid" style="padding:4px 0">${r.cards.map((cd, i) => cardHTML(cd, { act: 'rwCardView', data: { i }, syn: true })).join('')}</div>
      <button class="btn ghost" data-act="rwSkip">카드 안 받기</button>`}
      <button class="btn primary block" data-act="rwLeave">${r.kind === 'boss' && run.act < E.LAST_ACT ? '다음 막으로 ▶' : '계속 ▶'}</button>
    </div></div>`;
  }

  // ───────── 휴식 ─────────
  function renderRest() {
    const s = D.STARTERS[run.starter];
    const heal = E.restHealAmount(run);
    const lines = ['모닥불 따뜻하다… 잠깐만 눈 붙이고 갈까?', '칼날 좀 손볼 시간이야.', '여기서 숨 좀 돌리자. 다음은 더 셀 거야.', '별이 예쁘다. …아, 아니야. 준비하자.'];
    const finalTxt = run.act === E.LAST_ACT ? '마지막 모닥불이야. 이 너머에 황혼의 여신이 있어.' : lines[(run.floor + run.act) % lines.length];
    return `${topBar()}<div class="scroll"><div class="col pad">
      <div class="bubble-hero">${heroArt(s.hero, 'bh')}<div class="bubble">${esc(finalTxt)}</div></div>
      <div class="center bigicon campfire">🔥</div>
      <button class="list-btn ${heal ? '' : 'done'}" data-act="restHeal"><span class="ic">😴</span><span>휴식<br><span class="small dim">${heal ? `체력 ${heal} 회복 (${run.hp}/${run.maxHp})` : '영원의 불씨 때문에 쉴 수 없어'}</span></span></button>
      <button class="list-btn ${run.deck.some(E.canUpgrade) ? '' : 'done'}" data-act="restSmith"><span class="ic">⚒️</span><span>단련<br><span class="small dim">카드 1장 강화(+) · 바뀌는 수치를 미리 보여 줘</span></span></button>
    </div></div>`;
  }

  // ───────── 상점 ─────────
  function renderShop() {
    const s = run.shop;
    const pr = (p) => `<div class="price ${run.gold < p ? 'no' : ''}">💰 ${p}</div>`;
    return `${topBar()}<div class="scroll">
      <div class="pad" style="padding-bottom:0"><div class="bubble-hero">${heroArt('pio', 'bh')}<div class="bubble">어서 와~ 피오 상점이야! 폭발은 안 해. …거의 안 해.</div></div></div>
      <div class="section-title">카드 (🔗 = 내 덱과 조합)</div>
      <div class="grid">${s.cards.map((it, i) => `<div class="shopitem ${it.sold ? 'sold' : ''}" style="position:relative">${it.sale ? '<span class="sale">세일</span>' : ''}${cardHTML(it, { act: 'shopCardView', data: { i }, syn: true })}${pr(it.price)}</div>`).join('')}</div>
      <div class="section-title">유물 · 물약</div>
      <div class="col pad" style="padding-top:8px">
        ${s.relics.map((it, i) => { const r = D.RELICS[it.id]; return `<button class="list-btn ${it.sold ? 'done' : ''}" data-act="buy" data-k="relics" data-i="${i}"><span class="ic">${r.icon}</span><span style="flex:1">${esc(r.name)}<br><span class="small dim">${esc(r.desc)}</span></span>${pr(it.price)}</button>`; }).join('')}
        ${s.potions.map((it, i) => { const p = D.POTIONS[it.id]; return `<button class="list-btn ${it.sold ? 'done' : ''}" data-act="buy" data-k="potions" data-i="${i}"><span class="ic">${p.icon}</span><span style="flex:1">${esc(p.name)}<br><span class="small dim">${esc(p.desc)}</span></span>${pr(it.price)}</button>`; }).join('')}
        <button class="list-btn ${s.removeUsed ? 'done' : ''}" data-act="shopRemove"><span class="ic">✂️</span><span style="flex:1">카드 제거 서비스<br><span class="small dim">덱에서 카드 1장을 뺀다 (상점당 1회)</span></span>${pr(E.removePrice(run))}</button>
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
      if (ev.gotPotion2) got.push(`${D.POTIONS[ev.gotPotion2].icon} ${esc(D.POTIONS[ev.gotPotion2].name)} 획득`);
      if (ev.gotUpgrade) got.push(`⚒️ 「${esc(D.CARDS[ev.gotUpgrade].name)}」 강화됨`);
      if (ev.gotUpgrades) ev.gotUpgrades.forEach(id => got.push(`⚒️ 「${esc(D.CARDS[id].name)}」 강화됨`));
      if (ev.gotTransform) got.push(`🔀 「${esc(D.CARDS[ev.gotTransform[0]].name)}」 → 「${esc(D.CARDS[ev.gotTransform[1]].name)}」`);
      if (ev.gotWound) got.push(`🩸 「상처」 ${ev.gotWound}장이 덱에 들어왔어`);
      body = `<div class="panel">${esc(ev.text)}${got.length ? `<div class="small" style="margin-top:8px;color:var(--gold)">${got.join('<br>')}</div>` : ''}</div>
        <button class="btn primary block" data-act="evLeave">계속 ▶</button>`;
    }
    const info = d.hero ? heroInfo(d.hero, 'event') : { kind: 'event', c1: '#8f7bff', c2: '#160f3a', glyph: '❓' };
    if (d.hero) info.fallback = 'hero:' + d.hero;
    return `${topBar()}<div class="scroll"><div class="col pad">
      <h2>${esc(d.title)}</h2>
      <div class="bubble-hero">${artBox('event:' + ev.id, info, 'bh', { cap: d.title })}<div class="bubble">${esc(d.text)}</div></div>
      ${body}</div></div>`;
  }

  // ───────── 보물 ─────────
  function renderTreasure() {
    const t = run.treasure;
    return `${topBar()}<div class="scroll"><div class="col pad center" style="align-items:center">
      <h2>보물 상자</h2>
      ${t.opened ? `<div class="bigicon pop">✨</div><div class="panel">💰 ${t.gold} 골드${t.relic ? `<br>${D.RELICS[t.relic].icon} <b>${esc(D.RELICS[t.relic].name)}</b><br><span class="small dim">${esc(D.RELICS[t.relic].desc)}</span>` : ''}</div>
        <button class="btn primary block" data-act="leaveTreasure">계속 ▶</button>`
      : `<button class="btn ghost chest" style="font-size:90px;min-height:140px" data-act="openChest">🎁</button><div class="dim">터치해서 열기</div>`}
    </div></div>`;
  }

  // ───────── 카드 선택(강화/제거/복제) ─────────
  // 기믹 요약 (data.js STARTERS[].mech, 코드 동작 기준 짧은 설명. <b>만 허용하는 고정 문자열)
  function mechListHTML(s) {
    return s && s.mech ? `<ul class="mechlist small">${s.mech.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
  }
  function renderSelect() {
    const p = run.pending;
    const list = E.selectableCards(run);
    const title = p.mode === 'upgrade' ? '강화할 카드를 골라 줘' : p.mode === 'dup' ? '복제할 카드를 골라 줘' : `덱에서 뺄 카드를 골라 줘${p.cost ? ` (💰 ${p.cost})` : ''}`;
    return `${topBar()}<div class="scroll">
      <div class="pad" style="padding-bottom:0"><h2>${title}</h2>${p.mode === 'upgrade' ? '<div class="small dim">터치하면 강화 전/후를 비교해 줘</div>' : ''}</div>
      <div class="grid">${list.map(cd => cardHTML(cd, { act: 'selView', data: { uid: cd.uid } })).join('')}</div>
      <div class="pad"><button class="btn block" data-act="selCancel">취소</button></div></div>`;
  }

  // ───────── 종료 ─────────
  // ───────── 히로인 레벨 · 스토리 · 대사 (v1.2) ─────────
  const TRACK_ICON = { story: '📖', card: '🃏', relic: '💎', passive: '✨', deck: '🗂️', title: '🎖️', potion: '🧪', frame: '🖼️' };
  function trackLabel(h, t) {
    const m = D.MASTERY.heroes[h];
    switch (t.kind) {
      case 'story': return `개인 스토리 「${D.STORIES ? D.STORIES[h][t.ch].title : (t.ch + 1) + '장'}」`;
      case 'card': return `새 카드 「${D.CARDS[t.id].name}」 보상 풀 추가`;
      case 'relic': return `시작 유물 선택지 「${D.RELICS[t.id].icon} ${D.RELICS[t.id].name}」`;
      case 'passive': return `패시브 「${m.passive.name}」: ${m.passive.desc}`;
      case 'deck': return `시작 덱 변형 「${m.deck.name}」`;
      case 'title': return `칭호 「${m.titles[t.id]}」`;
      case 'potion': return '원정 시작 시 무작위 물약 1개';
      case 'frame': return '프로필 금빛 테두리';
    }
    return '';
  }
  function lvBar(info, cls) {
    return `<div class="lvbar ${cls || ''}"><i style="width:${Math.round(info.pct * 100)}%"></i></div>`;
  }
  function lvMini(h) {
    if (!D.MASTERY.heroes[h]) return '';
    const L = E.heroLevel(meta, h), t = E.heroTitle(meta, h);
    return `<div class="lvmini"><b>Lv ${L.lv}</b>${t ? ` <span class="htitle">「${esc(t)}」</span>` : ''}${lvBar(L)}<span class="small dim">${L.max ? 'MAX' : `${L.xp} / ${L.next} XP`}</span></div>`;
  }
  function loadoutHTML(h) {
    const m = D.MASTERY.heroes[h]; if (!m) return '';
    const L = Object.assign({ relic: 'base', deck: 'base' }, settings.loadout[h]);
    const seg = (k, label, a, b, ok, lv) => ok
      ? `<div class="seg"><span class="small dim">${label}</span><button class="segb ${L[k] !== 'alt' ? 'on' : ''}" data-act="loadout" data-h="${h}" data-k="${k}" data-v="base">${esc(a)}</button><button class="segb ${L[k] === 'alt' ? 'on' : ''}" data-act="loadout" data-h="${h}" data-k="${k}" data-v="alt">${esc(b)}</button></div>`
      : `<div class="seg lockedseg" data-act="lockedTrack" data-h="${h}" data-lv="${lv}"><span class="small dim">${label}</span><span class="small dim">🔒 Lv ${lv}</span></div>`;
    const R = D.RELICS, st = D.STARTERS[h];
    const alt = L.relic === 'alt' && E.masteryHas(meta, h, 'relic') ? `<div class="small">${R[m.relic].icon} <b>${esc(R[m.relic].name)}</b> — ${esc(R[m.relic].desc)}</div>` : '';
    const dk = L.deck === 'alt' && E.masteryHas(meta, h, 'deck') ? `<div class="small">🗂️ <b>${esc(m.deck.name)}</b> — ${esc(m.deck.desc)}</div>` : '';
    return `<div class="loadout">${seg('relic', '시작 유물', R[st.relic].name, R[m.relic].name, E.masteryHas(meta, h, 'relic'), 3)}${seg('deck', '시작 덱', '기본', m.deck.name, E.masteryHas(meta, h, 'deck'), 6)}${alt}${dk}</div>`;
  }
  function storyNewCount(h) {
    if (!D.STORIES) return 0;
    let n = 0;
    for (const hh of h ? [h] : Object.keys(D.MASTERY.heroes)) {
      if (!E.heroUnlocked(meta, hh)) continue;
      D.MASTERY.track(hh).forEach(t => { if (t.kind === 'story' && E.masteryHas(meta, hh, 'story', t.ch) && !meta.storyRead[hh + t.ch]) n++; });
    }
    return n;
  }
  function heroListHTML() {
    return `<h2>💞 히로인</h2><div class="small dim">원정을 마칠 때마다(실패해도) 그 히로인이 경험치를 얻어. 레벨이 오르면 새 카드·시작 유물·덱 변형·패시브·개인 스토리가 열려.</div>
      ${Object.keys(D.MASTERY.heroes).map(h => {
        const s = D.STARTERS[h], n = storyNewCount(h);
        if (s.pack && !E.ownsPack(meta, s.pack)) return `<button class="list-btn" data-act="store">${heroArt(h, 'hl')}<span style="flex:1;text-align:left">${esc(s.title)}<br><span class="small dim">상점에서 받으면 고를 수 있어. 스토리·추가 카드는 받아도 플레이해야 열려.</span></span></button>`;
        if (!E.heroUnlocked(meta, h)) return `<div class="list-btn" data-act="lockedHero"><div class="artbox hl locked">${A.html('hero:' + h, heroInfo(h, 'hero', { silhouette: true }))}</div><span style="flex:1">??? · ${esc(D.HEROINES[h].job)}<br><span class="small dim">${esc(s.unlockText)}</span></span></div>`;
        return `<button class="list-btn heroline" data-act="profile" data-id="${h}">${heroArt(h, 'hl')}<span style="flex:1;text-align:left">${esc(D.STARTERS[h].title)}${n ? ' <span class="dot"></span>' : ''}<br>${lvMini(h)}</span></button>`;
      }).join('')}
      <button class="btn block primary" data-act="closeModal">닫기</button>`;
  }
  function profileHTML(h) {
    const L = E.heroLevel(meta, h), Hn = D.HEROINES[h], t = E.heroTitle(meta, h), lv = L.lv;
    const frame = E.masteryHas(meta, h, 'frame');
    const track = D.MASTERY.track(h), nextLv = (track.find(x => x.lv > lv) || {}).lv;
    const tr = track.map(x => {
      const got = lv >= x.lv, nx = x.lv === nextLv;
      const st = got ? '<span class="tstate got">획득</span>' : nx ? '<span class="tstate next">다음</span>' : '';
      return `<div class="trackrow ${got ? 'got' : nx ? 'next' : 'locked'}"><span class="tlv">Lv${x.lv}</span><span class="tic">${got || nx ? TRACK_ICON[x.kind] : '🔒'}</span><span class="small" style="flex:1">${esc(trackLabel(h, x))}</span>${st}</div>`;
    }).join('');
    const nextBox = nextLv ? `<div class="nextbox"><div class="small"><b>다음 보상 · Lv ${nextLv}</b> <span class="dim">(${D.MASTERY.curve[nextLv - 1] - L.xp} XP 남음)</span></div>${track.filter(x => x.lv === nextLv).map(x => `<div class="small">${TRACK_ICON[x.kind]} ${esc(trackLabel(h, x))}</div>`).join('')}</div>`
      : '<div class="nextbox"><div class="small"><b>모든 레벨 보상을 얻었어.</b></div></div>';
    const got = track.filter(x => lv >= x.lv).length;
    const stories = D.STORIES ? D.STORIES[h].map((st, i) => {
      const lvReq = D.MASTERY.track(h).find(x => x.kind === 'story' && x.ch === i).lv;
      const ok = lv >= lvReq, isNew = ok && !meta.storyRead[h + i];
      return ok ? `<button class="list-btn" data-act="story" data-h="${h}" data-ch="${i}"><span style="flex:1;text-align:left">📖 ${esc(st.title)}${isNew ? ' <span class="newtag">NEW</span>' : ''}</span><span>▶</span></button>`
        : `<div class="list-btn locked" data-act="lockedTrack" data-h="${h}" data-lv="${lvReq}"><span style="flex:1">🔒 ${i + 1}장 · ???</span><span class="small dim">Lv ${lvReq}</span></div>`;
    }).join('') : '';
    const runs = meta.heroRuns[h] || 0, wins = meta.heroWins[h] || 0;
    const look = E.skinOffer(h);
    const lookOn = !!(look && E.skinFor(meta, h));
    const lookBtn = !look ? '' : E.ownsPack(meta, look.pid)
      ? `<button class="btn block" data-act="toggleSkin" data-id="${h}">${lookOn ? '초상 장식 끄기' : '초상 장식 켜기'} · ${esc(look.skin.name)}</button>`
      : `<button class="btn block" data-act="store">초상 장식은 상점에서 받을 수 있어</button>`;
    return `<div class="profile">
      <div class="prof-top ${frame ? 'goldframe' : ''}">${heroArt(h, 'prof')}
        <div class="col" style="gap:4px;flex:1">
          <h2 style="margin:0">${esc(Hn.name)} <span class="small dim">${esc(Hn.job)} · ${Hn.age}세</span></h2>
          ${t ? `<div class="htitle">「${esc(t)}」</div>` : ''}
          <div><b class="lvbig">Lv ${lv}</b> <span class="small dim">${L.max ? '최대 레벨' : `다음 레벨까지 ${L.next - L.xp} XP`}</span></div>
          ${lvBar(L, 'big')}
          <div class="small dim">원정 ${runs}회 · 클리어 ${wins}회</div>
          ${lookBtn}
          <div class="small">${esc(Hn.bio)}</div>
        </div></div>
      ${nextBox}
      ${mechListHTML(D.STARTERS[h])}
      ${meta.xpMigratedFrom ? '<div class="small dim" style="margin:6px 0">이전 버전 기록(원정·클리어 수)으로 시작 경험치를 계산해 넣었어.</div>' : ''}
      <div class="section-title" style="padding-left:0">📖 개인 스토리</div>${stories}
      <div class="section-title" style="padding-left:0">🎁 레벨 보상 <span class="small dim">${got} / ${track.length}</span></div><div class="track">${tr}</div>
      <div class="small dim" style="margin-top:6px">경험치: 오른 층 ×${D.MASTERY.xp.floor} · 엘리트 ×${D.MASTERY.xp.elite} · 보스 ×${D.MASTERY.xp.boss} · 원정 성공 +${D.MASTERY.xp.win}</div>
      <button class="btn block primary" data-act="closeModal">닫기</button></div>`;
  }
  function speakerArt(id) {
    if (D.HEROINES[id]) return `<div class="artbox sp">${A.html('hero:' + id, heroInfo(id, 'hero'))}</div>`;
    if (D.ENEMIES[id]) return `<div class="artbox sp">${A.html('enemy:' + id, enemyInfo(id))}</div>`;
    return '';
  }
  function speakerName(id) { return D.HEROINES[id] ? D.HEROINES[id].name : D.ENEMIES[id] ? D.ENEMIES[id].name : ''; }
  function storyHTML() {
    const st = D.STORIES[ui.story.h][ui.story.ch], i = ui.story.i, [who, text] = st.lines[i];
    const nar = who === 'nar';
    return `<div class="story-bg" data-act="storyNext">
      <div class="story-head"><span>${esc(D.HEROINES[ui.story.h].name)} · ${esc(st.title)}</span><button class="tb" data-act="storyClose" aria-label="닫기">✕</button></div>
      <div class="story-stage">${nar ? '' : speakerArt(who)}</div>
      <div class="story-box ${nar ? 'nar' : ''}">${nar ? '' : `<div class="story-name">${esc(speakerName(who))}</div>`}<div class="story-text">${esc(text)}</div>
        <div class="story-foot small dim"><span>${i + 1} / ${st.lines.length}</span><span>${i < st.lines.length - 1 ? '터치해서 계속 ▶' : '터치해서 닫기'}</span></div></div>
    </div>`;
  }
  function pickLine(h, kind) { const a = D.LINES[h] && D.LINES[h][kind]; return a && a.length ? a[Math.floor(Math.random() * a.length)] : null; }
  function endLine() {
    if (!ui.endLine || ui.endLine.run !== run.seed) ui.endLine = { run: run.seed, text: pickLine(run.starter, run.won ? 'win' : 'loss') || '' };
    return ui.endLine.text;
  }
  function heroSay(kind, delay, sub) {
    if (!settings.talk || !run) return;
    const h = run.starter;
    const keyed = sub && D.LINES[h] && D.LINES[h][kind + 'To'] && D.LINES[h][kind + 'To'][sub];
    const text = keyed || pickLine(h, kind);
    if (!text) return;
    setTimeout(() => {
      document.querySelectorAll('.herosay.live').forEach(x => x.remove());
      const b = document.createElement('div');
      b.className = 'herosay live';
      b.innerHTML = `<span class="hs-name">${esc(D.HEROINES[h].name)}</span> ${esc(text)}`;
      fxLayer.appendChild(b); setTimeout(() => b.remove(), 3400);
    }, delay || 0);
  }
  function xpPanelHTML() {
    const x = run.xpResult; if (!x) return '';
    const before = x.before, after = x.after, up = after.lv > before.lv;
    const parts = x.parts.filter(p => p.n).map(p => `<span>${esc(p.k)} ${p.n}</span><b>+${p.xp}</b>`).join('');
    const unl = x.unlocks.map(t => `<div class="trackrow got"><span class="tic">${TRACK_ICON[t.kind]}</span><span class="small" style="flex:1">${esc(trackLabel(x.hero, t))}</span></div>`).join('');
    const beforePct = up ? 0 : before.pct;
    return `<div class="panel col xppanel" style="width:100%;max-width:340px">
      <div class="row" style="justify-content:space-between"><b>💞 ${esc(D.HEROINES[x.hero].name)} 경험치 +${x.gain}</b><span>${up ? `<span class="lvup">Lv ${before.lv} → Lv ${after.lv}!</span>` : `Lv ${after.lv}`}</span></div>
      <div class="lvbar big xpanim"><i class="old" style="width:${Math.round(beforePct * 100)}%"></i><i class="new" style="width:${Math.round(after.pct * 100)}%"></i></div>
      <div class="small dim">${after.max ? '최대 레벨' : `${after.xp} / ${after.next} XP`}${x.gain === 0 && after.max ? '' : ''}</div>
      ${parts ? `<div class="statgrid small">${parts}</div>` : '<div class="small dim">이번엔 층을 넘지 못했어. 그래도 다음엔 더 멀리!</div>'}
      ${unl ? `<b style="color:var(--gold)">새로 열린 것</b>${unl}` : ''}
      ${(() => { const nt = D.MASTERY.track(x.hero).filter(t => t.lv > after.lv); if (!nt.length) return ''; const nl = nt[0].lv; return `<div class="small dim" style="text-align:left">다음 보상 Lv ${nl} (${D.MASTERY.curve[nl - 1] - after.xp} XP 남음): ${nt.filter(t => t.lv === nl).map(t => esc(trackLabel(x.hero, t))).join(', ')}</div>`; })()}
      ${x.unlocks.some(t => t.kind === 'story') ? `<button class="btn gold block" data-act="profile" data-id="${x.hero}">📖 새 개인 스토리 보기</button>` : ''}
    </div>`;
  }
  function renderEnd() {
    const won = run.won, s = D.STARTERS[run.starter];
    const st = run.stats;
    const ach = ui.runAch.map(id => `<div class="achrow got"><span class="ic">${D.ACHIEVEMENTS[id].icon}</span><span><b>${esc(D.ACHIEVEMENTS[id].name)}</b><br><span class="small dim">${esc(D.ACHIEVEMENTS[id].desc)}</span></span></div>`).join('');
    const newG = (meta.newGallery || []).length;
    return `<div class="scroll"><div class="title-screen">
      <div class="logo" style="font-size:34px">${won ? '원정 성공!' : '원정 실패…'}</div>
      ${won ? artBox('gallery:g_' + run.starter, galleryInfo('g_' + run.starter), 'endart', { cap: D.GALLERY['g_' + run.starter].title }) : heroArt(s.hero, 'endart')}
      <div class="bubble">${won ? esc(D.GALLERY['g_' + run.starter].cap) : esc('조금만… 더 갈 수 있었는데. 다음엔 꼭.')}</div>
      ${settings.talk ? `<div class="herosay static"><span class="hs-name">${esc(D.HEROINES[s.hero].name)}</span> ${esc(endLine())}</div>` : ''}
      ${xpPanelHTML()}
      <div class="panel statgrid" style="width:100%;max-width:340px">
        <span>도달</span><b>${won ? '황혼 너머' : `${run.act < 4 ? run.act + '막' : '종막'} ${run.floor}층`}</b>
        <span>승천</span><b>🔥${run.asc}</b>
        <span>처치한 적</span><b>${st.kills}</b>
        <span>엘리트 / 보스</span><b>${st.elites} / ${st.bosses.length}</b>
        <span>낸 카드</span><b>${st.cardsPlayed}</b>
        <span>준 피해</span><b>${st.dmgDealt}</b>
        <span>최대 한 방</span><b>${st.maxHit}</b>
        <span>최종 덱</span><b>${run.deck.length}장</b>
      </div>
      ${ach ? `<div class="panel col" style="width:100%;max-width:340px"><b>이번 원정에서 달성한 업적</b>${ach}</div>` : ''}
      ${newG ? `<button class="btn gold block" style="max-width:340px" data-act="codexGallery">🖼️ 새 갤러리 ${newG}장 열림!</button>` : ''}
      ${won && run.asc + 1 <= 10 ? `<div class="small" style="color:var(--gold)">🔥 승천 ${Math.min(10, run.asc + 1)} 도전 가능!</div>` : ''}
      <div class="col" style="width:100%;max-width:300px">
        <button class="btn primary block" data-act="again">다시 도전</button>
        <button class="btn block" data-act="viewDeckEnd">최종 덱 보기</button>
        <button class="btn block" data-act="toTitle">타이틀로</button>
      </div></div></div>`;
  }

  // ───────── 모달 ─────────
  function openModal(html, push) { if (push && ui.modal) ui.modalStack.push(ui.modal); else if (!push) ui.modalStack = []; ui.modal = html; render(); const m = app.querySelector('.modal'); if (m) m.scrollTop = 0; }
  function closeModal() { ui.modal = ui.modalStack.pop() || null; render(); }
  function deckModal(cards, title, sortIt) {
    const list = sortIt === false ? cards : cards.slice().sort((a, b) => (a.id > b.id ? 1 : -1));
    return `<h2>${esc(title)} (${cards.length})</h2><div class="small dim">카드를 터치하면 크게 보기 + 강화 비교</div><div class="grid" style="padding:4px 0">${list.map(cd => cardHTML(cd, { act: 'cardInfo', data: { id: cd.id, up: cd.up ? 1 : 0 } })).join('') || '<div class="dim">비어 있어</div>'}</div><button class="btn block" data-act="closeModal">닫기</button>`;
  }
  // 카드 크게 보기: 일러스트 전체 + 설명 + 강화 비교 + 조합 태그
  function cardDetail(card, actions) {
    const d = E.cardDef(card), base = D.CARDS[card.id];
    const info = cardInfo(d); if (d.hero) info.fallback = 'hero:' + d.hero;
    const h = d.hero && D.HEROINES[d.hero];
    let up = '';
    if (E.canUpgrade({ id: card.id, up: false }) && D.CARDS[card.id].up) {
      const df = E.upgradeDiff(card.id);
      up = `<div class="panel diffpanel"><b>${card.up ? '✅ 강화됨' : '⚒️ 강화(+)하면'}</b>
        <div class="small diffline">${df.cost ? `<span class="tag">비용 ${esc(df.cost)}</span>` : ''}${df.changes.map(x => `<span class="tag up">${esc(x)}</span>`).join('')}</div>
        <div class="small">${df.html}</div>${card.up ? `<div class="small dim">강화 전: ${esc(df.before)}</div>` : ''}</div>`;
    }
    const tags = (base.tags || []).filter(t => D.ARCH[t]).map(t => {
      const n = run ? (E.synergy(run, card.id).tags.find(x => x.t === t) || { n: 0 }).n : 0;
      return `<span class="tag">${D.ARCH[t].icon} ${esc(D.ARCH[t].name)}${run && n ? ` · 내 덱 ${n}장` : ''}</span>`;
    }).join('');
    const unlock = base.unlock && D.ACHIEVEMENTS[base.unlock] ? `<div class="small" style="color:var(--gold)">🏆 해금: ${esc(D.ACHIEVEMENTS[base.unlock].name)} — ${esc(D.ACHIEVEMENTS[base.unlock].desc)}</div>` : '';
    return `<div class="cdetail">
      <div class="cd-art" data-act="viewArt" data-key="card:${esc(card.id)}" data-info="${esc(JSON.stringify(info))}" data-cap="${esc(d.name)}">${A.html('card:' + card.id, info, { eager: true })}<span class="zoom">🔍</span></div>
      <div class="col" style="gap:6px;flex:1;min-width:0">
        <div class="cd-cost ${'t-' + d.type}">${d.unplayable ? '—' : d.cost === -1 ? 'X' : d.cost}</div>
        <h2 class="${card.up ? 'upname' : ''}">${esc(d.name)}</h2>
        <div><span class="tag">${TYPE_KO[d.type] || ''}</span><span class="tag r-${d.rarity}">${RAR_KO[d.rarity] || ''}</span>${h ? `<span class="tag">${esc(h.name)} · ${h.age}세</span>` : ''}</div>
        <div class="cd-desc">${E.describe(d, run && run.combat ? { p: run.combat.p } : null)}</div>
        ${base.quote ? `<div class="quote">“${esc(base.quote)}”</div>` : ''}
      </div></div>
      ${tags ? `<div class="archrow">${tags}</div>` : ''}${unlock}${up}
      ${actions || ''}<button class="btn block" data-act="closeModal">닫기</button>`;
  }
  function helpHTML() {
    return `<h2>어떻게 해?</h2>
    <div class="small" style="line-height:1.65">
    • 히로인을 골라 <b>3막(각 10층+보스)과 종막</b>을 지나 황혼의 여신을 쓰러뜨리는 원정이야. 막이 바뀌면 체력이 회복돼.<br>
    • 매 턴 <b>에너지 3</b>, 카드 <b>5장</b>. 카드를 <b>터치해서 고르고</b>, 적을 터치(또는 카드 한 번 더 터치)하면 사용!<br>
    • 적 머리 위는 <b>다음 행동 예고</b>. 🗡️공격(숫자=피해) 🛡️방어 ✨강화 🌀방해 📯소환. 적을 터치하면 자세히.<br>
    • 내 이름 옆에 <b>🗡️들어올 피해 − 🛡️방어도 → 실제 피해</b>가 나와. 막을지 때릴지 계산해 봐.<br>
    • 💔취약 +50% 피해 받음 · 🥀약화 −25% 피해 줌 · ☠️중독 턴마다 피해 · 💪힘 공격 +1 · 🦶민첩 방어도 +1<br>
    • 카드 보상의 <b>🔗숫자</b>는 내 덱에 같은 계열 카드가 몇 장 있는지야. 계열을 모으면 시너지가 커져.<br>
    • 🔥휴식: 회복 또는 강화(+). 강화 전에 바뀌는 수치를 보여 줘. 🛍️상점: 카드 제거도 돼.<br>
    • 보스를 이기면 <b>👑보스 유물</b> 3개 중 하나. 강하지만 대가가 있어.<br>
    • 2막 보스를 이기면 새 히로인 <b>아리아</b> 합류. 업적을 달성하면 <b>전설 카드</b>가 보상에 나오기 시작해.<br>
    • 클리어하면 <b>🔥승천</b>이 열려. 최대 10단계까지.<br>
    • 진행은 <b>이 기기에 자동 저장</b>돼. 한 기기만 쓰면 더 할 일 없어. 폰과 컴퓨터를 오가려면 설정에서 백업 파일을 내보내고, 다른 기기에서 가져와.<br>
    • 홈 화면에 추가하면 앱처럼 쓸 수 있어.</div>
    <button class="btn block" data-act="tutReplay">첫 전투 튜토리얼 다시 보기</button>
    <button class="btn block primary" data-act="closeModal">알겠어!</button>`;
  }
  function settingsHTML() {
    const row = (k, label, sub) => `<button class="list-btn toggle ${settings[k] ? 'on' : ''}" data-act="toggle" data-k="${k}"><span style="flex:1">${label}<br><span class="small dim">${sub}</span></span><span class="sw">${settings[k] ? 'ON' : 'OFF'}</span></button>`;
    return `<h2>⚙️ 설정</h2>
      <div class="panel small dim" style="margin-bottom:8px">${esc(saveStatusLine())}</div>
      ${row('sound', '🔊 효과음', '기본은 꺼져 있어. 켜면 합성 효과음이 나와.')}
      ${row('vibe', '📳 진동', '피격·보스 격파 때 짧게 진동 (지원 기기만)')}
      ${row('reduce', '🧘 움직임 줄이기', '화면 흔들림·카드 날아가기 같은 연출을 줄여')}
      ${row('fast', '⏩ 빠른 연출', '적 턴 연출 속도 2배')}
      ${row('talk', '💬 히로인 대사', '엘리트·보스·이벤트·상점·휴식에서 짧은 말풍선')}
      <div class="section-title" style="padding-left:0;margin-top:8px">💾 다른 기기</div>
      <div class="small dim" style="margin-bottom:6px">한 기기에서만 하면 그대로 두면 돼. 다른 기기에서 이으려면 파일을 내보내고, 거기서 가져와.</div>
      <button class="btn block" data-act="exportBackup">⬇️ 이 기기 기록 내보내기</button>
      <button class="btn block" data-act="importPick">⬆️ 다른 기기 기록 가져오기</button>
      <button class="btn block" data-act="resetConfirm" style="color:var(--red)">🗑️ 모든 기록 초기화</button>
      <button class="btn block primary" data-act="closeModal">닫기</button>`;
  }
  function seenSets() {
    const cards = new Set(meta.cardsSeen), relics = new Set(meta.relicsSeen), enemies = new Set(meta.enemiesSeen);
    if (run) { run.cardsSeen.forEach(x => cards.add(x)); run.deck.forEach(c => cards.add(c.id)); run.relicsSeen.forEach(x => relics.add(x)); run.relics.forEach(x => relics.add(x)); run.enemiesSeen.forEach(x => enemies.add(x)); }
    Object.values(D.STARTERS).forEach(s => { if (E.heroUnlocked(meta, Object.keys(D.STARTERS).find(k => D.STARTERS[k] === s))) { s.deck.forEach(x => cards.add(x)); relics.add(s.relic); } });
    return { cards, relics, enemies };
  }
  const CODEX_TABS = [['cards', '🃏 카드'], ['relics', '💎 유물'], ['enemies', '👹 적'], ['gallery', '🖼️ 갤러리'], ['ach', '🏆 업적'], ['stats', '📊 기록']];
  function codexHTML() {
    const tab = ui.codexTab, S = seenSets();
    const tabs = `<div class="tabs">${CODEX_TABS.map(([k, n]) => `<button class="tabb ${tab === k ? 'on' : ''}" data-act="codexTab" data-t="${k}">${n}${k === 'gallery' && meta.newGallery.length ? '<span class="dot"></span>' : ''}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'cards') {
      const all = Object.values(D.CARDS).filter(c => E.isCollectible(c));
      const clsTabs = [['all', '전체'], ['sword', '세라'], ['magic', '루나'], ['ninja', '유키'], ['holy', '아리아'], ['puppet', '마리엘'], ['moon', '세레나'], ['lore', '오데트'], ['neutral', '공용'], ['legend', '전설']];
      const list = all.filter(c => ui.codexCls === 'all' || (ui.codexCls === 'legend' ? c.rarity === 'legend' : c.cls === ui.codexCls && c.rarity !== 'legend'));
      const seenN = all.filter(c => S.cards.has(c.id)).length;
      body = `<div class="small dim">발견 ${seenN} / ${all.length} · 아직 못 본 카드는 실루엣으로 보여</div>
        <div class="tabs sub">${clsTabs.map(([k, n]) => `<button class="tabb ${ui.codexCls === k ? 'on' : ''}" data-act="codexCls" data-c="${k}">${n}</button>`).join('')}</div>
        <div class="grid" style="padding:4px 0">${list.map(c => S.cards.has(c.id) ? cardHTML({ id: c.id, up: false }, { act: 'cardInfo', data: { id: c.id, up: 0 } })
          : `<div class="card locked t-${c.type}" data-act="lockedCard" data-id="${c.id}"><div class="art">${A.html('card:' + c.id, Object.assign(cardInfo(c), { silhouette: true }))}</div><div class="cname">???</div><div class="cdesc"><span>${c.rarity === 'legend' ? '🏆 업적 보상' : esc(RAR_KO[c.rarity])}</span></div></div>`).join('')}</div>`;
    } else if (tab === 'relics') {
      const all = Object.keys(D.RELICS);
      body = `<div class="small dim">발견 ${all.filter(r => S.relics.has(r)).length} / ${all.length}</div><div class="relicgrid">${all.map(r => {
        const x = D.RELICS[r], seen = S.relics.has(r);
        return `<button class="relictile ${seen ? '' : 'locked'} ${x.boss ? 'bossr' : ''}" data-act="${seen ? 'relic' : 'lockedRelic'}" data-id="${r}"><span class="ri">${seen ? x.icon : '❔'}</span><span class="small">${seen ? esc(x.name) : '???'}</span></button>`;
      }).join('')}</div>`;
    } else if (tab === 'enemies') {
      const all = Object.keys(D.ENEMIES);
      body = `<div class="small dim">조우 ${all.filter(e => S.enemies.has(e)).length} / ${all.length}</div><div class="artgrid">${all.map(id => {
        const d = D.ENEMIES[id], seen = S.enemies.has(id);
        return `<div class="tile ${seen ? '' : 'locked'}" data-act="${seen ? 'enemyInfo' : 'lockedEnemy'}" data-id="${id}">${A.html('enemy:' + id, enemyInfo(id, { silhouette: !seen }))}<div class="tcap">${seen ? esc(d.name) : '???'}${d.boss ? ' 👑' : d.kind === 'elite' ? ' 😈' : ''}</div></div>`;
      }).join('')}</div>`;
    } else if (tab === 'gallery') {
      const all = Object.keys(D.GALLERY);
      body = `<div class="small dim">해금 ${all.filter(g => E.galleryUnlocked(meta, g)).length} / ${all.length} · 클리어·보스 격파·업적으로 열려</div><div class="artgrid gal">${all.map(g => {
        const x = D.GALLERY[g], ok = E.galleryUnlocked(meta, g), isNew = meta.newGallery.includes(g);
        return ok ? `<div class="tile" data-act="viewArt" data-key="gallery:${g}" data-info="${esc(JSON.stringify(galleryInfo(g)))}" data-cap="${esc(x.title + ' — ' + x.cap)}">${A.html('gallery:' + g, galleryInfo(g))}<div class="tcap">${isNew ? '🆕 ' : ''}${esc(x.title)}</div></div>`
          : `<div class="tile locked" data-act="lockedGal" data-id="${g}">${A.html('gallery:' + g, galleryInfo(g, { silhouette: true }))}<div class="tcap">🔒 ${esc(x.how)}</div></div>`;
      }).join('')}</div>`;
    } else if (tab === 'ach') body = achHTML(true);
    else if (tab === 'stats') {
      const rows = Object.entries(D.STARTERS).map(([id, s]) => `<span>${esc(D.HEROINES[s.hero].name)}</span><b>${meta.heroWins[id] || 0}승 / ${meta.heroRuns[id] || 0}회${meta.heroWins[id] ? ` · 🔥${meta.heroBestAsc[id] || 0}` : ''}</b>`).join('');
      const bosses = ['morgana', 'belita', 'celes', 'nyx'].map(b => `<span>${esc(D.ENEMIES[b].name)}</span><b>${meta.bosses[b] || 0}회 격파</b>`).join('');
      body = `<div class="panel statgrid">
        <span>원정</span><b>${meta.runs}회</b><span>클리어</span><b>${meta.wins}회</b>
        <span>승률</span><b>${meta.runs ? Math.round(meta.wins / meta.runs * 100) : 0}%</b><span>최고 도달</span><b>${meta.bestAct >= 4 ? '종막' : meta.bestAct ? meta.bestAct + '막' : '-'}</b>
        <span>열린 승천</span><b>🔥${meta.ascMax}</b><span>처치한 적</span><b>${meta.kills}</b>
        <span>엘리트 처치</span><b>${meta.elites}</b><span>낸 카드</span><b>${meta.cardsPlayed}</b>
        <span>준 피해</span><b>${meta.dmgDealt}</b><span>최대 한 방</span><b>${meta.maxHit}</b>
        <span>쓴 물약</span><b>${meta.potionsUsed}</b><span>번 골드</span><b>${meta.goldEarned}</b>
        ${rows}${bosses}</div>`;
    }
    if (tab === 'gallery' && meta.newGallery.length) { meta.newGallery = []; saveMeta(); }
    return `<h2>📖 도감</h2>${tabs}${body}<button class="btn block" data-act="closeModal">닫기</button>`;
  }
  function achHTML(inner) {
    const ids = Object.keys(D.ACHIEVEMENTS);
    const list = ids.map(id => {
      const a = D.ACHIEVEMENTS[id], got = !!meta.ach[id];
      return `<div class="achrow ${got ? 'got' : ''}"><span class="ic">${got ? a.icon : '🔒'}</span><span style="flex:1"><b>${esc(a.name)}</b><br><span class="small dim">${esc(a.desc)}</span></span>${got ? '<span class="chk">✓</span>' : ''}</div>`;
    }).join('');
    const head = `<div class="small dim">달성 ${ids.filter(i => meta.ach[i]).length} / ${ids.length} · 일부 업적은 전설 카드·갤러리·히로인을 열어 줘</div>`;
    return inner ? head + list : `<h2>🏆 업적</h2>${head}${list}<button class="btn block" data-act="closeModal">닫기</button>`;
  }
  function enemyInfoHTML(id, e) {
    const def = D.ENEMIES[id];
    let detail = '';
    if (e) {
      const iv = E.intentView(run, e), m = def.moves[e.intent], dd = [];
      if (m.dmg) dd.push(`피해 ${iv.parts[0].text}`);
      if (m.block) dd.push(`방어도 ${m.block}`);
      if (m.blockAll) dd.push(`모두 방어도 ${m.blockAll}`);
      if (m.selfSt) dd.push(Object.entries(m.selfSt).map(([s, v]) => `${D.STATUS[s].name} +${v}`).join(', '));
      if (m.playerSt) dd.push('나에게 ' + Object.entries(m.playerSt).map(([s, v]) => `${D.STATUS[s].name} ${v}`).join(', '));
      if (m.addCards) dd.push(m.addCards.map(a => `「${D.CARDS[a.id].name}」 ${a.n}장 섞기`).join(', '));
      if (m.heal) dd.push(`체력 ${m.heal} 회복`);
      if (m.summon) dd.push('부하 소환');
      detail = `<div class="panel small"><b>다음 행동: ${esc(m.name)}</b><br>${esc(dd.join(' · ') || '알 수 없음')}</div>
        ${Object.keys(e.st).length ? `<div class="panel small">${Object.entries(e.st).map(([s, v]) => `${D.STATUS[s].icon} <b>${D.STATUS[s].name}</b> ${D.STATUS[s].flag ? '' : v} — ${esc(D.STATUS[s].desc(v))}`).join('<br>')}</div>` : ''}`;
    }
    const moves = Object.values(def.moves).map(m => esc(m.name)).join(' · ');
    return `<div class="row" style="align-items:flex-start;gap:12px">${enemyArt(id, 'p-lg')}
        <div class="col" style="gap:4px"><h2>${esc(def.name)}</h2><span class="small dim">${def.ageText ? esc(def.ageText) : def.age ? def.age + '세' : ''} ${def.boss ? '· 👑 보스' : def.kind === 'elite' ? '· 😈 엘리트' : ''} · ❤️ ${def.hp[0]}</span><div class="small">${esc(def.desc)}</div></div></div>
        ${detail}<div class="small dim">기술: ${moves}</div>
        <button class="btn block" data-act="closeModal">닫기</button>`;
  }
  function viewArt(key, info, cap) {
    const v = document.createElement('div');
    v.className = 'viewer'; v.setAttribute('role', 'dialog');
    v.innerHTML = `<div class="vimg">${A.html(key, info, { eager: true })}</div>${cap ? `<div class="vcap">${esc(cap)}</div>` : ''}<div class="vclose">✕ 닫기</div>`;
    v.addEventListener('click', () => v.remove());
    document.body.appendChild(v);
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
    if (fxs.some(f => f.k === 'turn' && f.who === 'p')) ui.deal = true;
    saveRun();
    if (!run.over && run.screen !== 'combat') grantAch();
    render();
    const dur = playFx(fxs);
    if (before !== run.screen && run.screen === 'combat' && run.combat && run.combat.kind !== 'monster') {
      const bossId = run.combat.kind === 'boss' && run.combat.enemies[0] ? run.combat.enemies[0].id : null;
      heroSay(run.combat.kind === 'boss' ? 'boss' : 'elite', bossId ? 1100 : 600, bossId);
    }
    if (fxs.some(f => f.k === 'bosswin')) heroSay('bossWin', 1600);
    if (before !== run.screen && ['event', 'shop', 'rest'].includes(run.screen)) heroSay(run.screen, 350);
    if (leftCombat) {
      ui.busy = true;
      const boss = fxs.some(f => f.k === 'victory' || f.k === 'defeat' || f.k === 'bosswin');
      const sp = settings.fast ? 0.5 : 1;
      setTimeout(() => { ui.hold = false; ui.busy = false; ui.deadShown = new Set(); fxLayer.innerHTML = ''; render(); if (run && run.over) sfx(run.won ? 'win' : 'lose'); }, (Math.max(900, Math.min(dur, 1800)) + (boss ? 1200 : 0)) * sp);
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
  function screenShake(delay, big) {
    if (reduced()) return;
    setTimeout(() => { const s = app.firstElementChild; if (!s) return; s.classList.remove('sshake', 'sshake2'); void s.offsetWidth; s.classList.add(big ? 'sshake2' : 'sshake'); }, delay);
  }
  function banner(text, delay, cls) {
    setTimeout(() => { const b = document.createElement('div'); b.className = 'banner ' + (cls || ''); b.textContent = text; fxLayer.appendChild(b); setTimeout(() => b.remove(), cls === 'actb' ? 2200 : 1150); }, delay);
  }
  function flash(delay, color) {
    setTimeout(() => { const s = document.createElement('div'); s.className = 'screenflash'; if (color) s.style.background = color; fxLayer.appendChild(s); setTimeout(() => s.remove(), 650); }, delay);
  }
  function later(fn, t) { setTimeout(fn, t); }
  function playFx(list) {
    let t = 0, enemyPhase = false;
    const sp = settings.fast ? 0.5 : 1;
    for (const f of list) {
      switch (f.k) {
        case 'turn':
          if (f.who === 'e') { enemyPhase = true; banner('적의 턴', t); t += 450 * sp; }
          else { if (enemyPhase || f.turn === 1) { banner(f.turn === 1 ? '전투 시작!' : '내 턴', t + 100); later(() => sfx('turn'), t + 100); } enemyPhase = false; }
          break;
        case 'act':
          if (f.who) { floatText(f.who, f.name, 'act', t); t += 120 * sp; }
          else { const a = D.ACTS[f.act]; banner(a ? a.name : '', t + 200, 'actb'); flash(t + 100, '#ffffff'); later(() => sfx('win'), t); }
          break;
        case 'dmg':
          if (f.v > 0) {
            floatText(f.who, (f.poison ? '☠️' : '') + '-' + f.v, 'dmg' + (f.v >= 15 ? ' big' : ''), t); shake(f.who, t);
            if (f.who === 'p') { screenShake(t, f.v >= 15); later(() => { sfx('hurt'); buzz(f.v >= 15 ? 70 : 30); }, t); if (f.v >= 15) flash(t, '#ff2e4d'); }
            else later(() => sfx(f.v >= 20 ? 'big' : 'hit'), t);
            if (f.who !== 'p' && f.v >= 20) screenShake(t, false);
          } else if (f.blocked) { floatText(f.who, '막음!', 'blk', t); later(() => sfx('block'), t); }
          t += (enemyPhase ? 260 : 110) * sp; break;
        case 'block': floatText(f.who, '+' + f.v + '🛡️', 'blk', t); later(() => sfx('block'), t); t += 60 * sp; break;
        case 'heal': floatText(f.who, '+' + f.v, 'heal', t); if (f.who === 'p') later(() => sfx('heal'), t); t += 60 * sp; break;
        case 'buff': case 'debuff': if (D.STATUS[f.s]) floatText(f.who, D.STATUS[f.s].icon + D.STATUS[f.s].name, 'st', t + 150); break;
        case 'say': sayBubble(f.who, f.text, t); break;
        case 'die': if (f.boss) { flash(t, '#ffd36e'); screenShake(t, true); later(() => buzz([60, 40, 120]), t); } break;
        case 'phase': flash(t); banner(`${f.n}페이즈`, t + 200); screenShake(t + 100, true); t += 600 * sp; break;
        case 'revive': banner(f.how === 'fairy' ? '🧚 요정이 되살려 줬어!' : '🔥 불사조의 깃털!', t + 100); flash(t, '#ffd36e'); t += 500; break;
        case 'win': banner('승리!', t + 200); later(() => sfx('coin'), t + 200); break;
        case 'bosswin': banner('보스 격파!', t + 300); later(() => sfx('win'), t + 300); break;
        case 'victory': banner('황혼의 여신 격파!', t + 300); later(() => buzz([80, 60, 80, 60, 200]), t + 300); break;
        case 'defeat': banner('쓰러졌다…', t + 200); later(() => buzz(200), t + 200); break;
        case 'potion': banner(D.POTIONS[f.id].icon + ' ' + D.POTIONS[f.id].name, t); later(() => sfx('buff'), t); break;
        case 'shuffle': floatText('p', '🔀 셔플', 'st', t); break;
      }
    }
    return t;
  }

  function flyCard(el) {
    if (!el || reduced()) return;
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
    flyCard(el); sfx('card'); buzz(8);
    ui.sel = null;
    doAct(() => res);
  }
  function startRun(id) {
    if (!E.heroUnlocked(meta, id)) { toast('이 히로인은 상점에서 받은 뒤에 고를 수 있어.'); ui.view = 'store'; render(); return; }
    const asc = Math.min(settings.asc, meta.ascMax);
    run = E.newRun(id, null, Object.assign(E.runOptions(meta, id, settings.loadout[id]), { asc }));
    ui.sel = null; ui.modal = null; ui.modalStack = []; ui.deadShown = new Set(); ui.runAch = []; ui.tut = 0;
    saveRun(); render();
    if (!meta.runs) setTimeout(() => toast('지도에서 빛나는 칸을 골라 출발해!'), 300);
  }

  // ───────── 입력 ─────────
  const H = {
    noop() {},
    closeModal() { closeModal(); },
    newGame() { ui.view = 'pick'; render(); },
    store() { if (run) return; ui.view = 'store'; ui.modal = null; render(); },
    claimPack(d) {
      const r = E.claimPack(meta, d.id);
      if (!r.ok) toast(esc(r.reason));
      else { saveMeta(); toast(D.SHOP.packs[d.id] && D.SHOP.packs[d.id].kind === 'character' ? '받았어. 이제 고를 수 있고, 스토리·추가 카드는 플레이해야 열려.' : '장식을 켰어. 레벨 보상은 그대로야.'); sfx('coin'); }
      ui.view = 'store'; render();
    },
    toggleSkin(d) {
      const r = E.toggleSkin(meta, d.id);
      if (!r.ok) { toast(esc(r.reason)); return; }
      saveMeta();
      if (ui.modal) ui.modal = profileHTML(d.id);
      render();
    },
    toTitle() { fxLayer.innerHTML = ''; run = null; ui.view = 'title'; ui.modal = null; ui.modalStack = []; render(); },
    help() { openModal(helpHTML()); },
    settings() { openModal(settingsHTML()); },
    toggle(d) { settings[d.k] = !settings[d.k]; saveSettings(); if (d.k === 'sound' && settings.sound) sfx('ach'); if (d.k === 'vibe' && settings.vibe) buzz(40); ui.modal = settingsHTML(); render(); },
    resetConfirm() { openModal(`<h2>정말 초기화할까?</h2><div class="small dim">업적·도감·갤러리·승천·진행 중인 원정이 모두 지워져.</div><div class="row"><button class="btn block" data-act="closeModal">아니</button><button class="btn block primary" data-act="resetYes">초기화</button></div>`, true); },
    resetYes() { meta = E.newMeta(); saveMeta(); try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ } run = null; ui.view = 'title'; ui.modal = null; ui.modalStack = []; render(); toast('기록을 초기화했어.'); },
    exportBackup() {
      try {
        const b = buildBackup();
        const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        const stamp = (b.exportedAt || '').slice(0, 10) || 'backup';
        a.href = URL.createObjectURL(blob);
        a.download = `beauty-deck-backup-${stamp}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('백업 파일을 저장했어.');
      } catch (e) { toast('내보내기 실패: ' + esc(e.message)); }
    },
    importPick() {
      let inp = document.getElementById('bd-backup-file');
      if (!inp) {
        inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'application/json,.json'; inp.id = 'bd-backup-file';
        inp.style.display = 'none';
        document.body.appendChild(inp);
        inp.addEventListener('change', () => {
          const f = inp.files && inp.files[0];
          inp.value = '';
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const b = JSON.parse(reader.result);
              if (!b || b.game !== 'beauty-deck' || b.v !== 1 || !b.meta) throw new Error('미녀 덱 백업 파일이 아니야');
              ui.pendingBackup = b;
              const older = backupIsOlderThanLocal(b);
              openModal(`<h2>이 백업을 불러올까?</h2>
                <div class="small dim">파일: ${esc(summarizeBackup(b))}</div>
                <div class="small dim" style="margin-top:6px">지금 이 기기: ${esc(summarizeBackup({ meta, run: loadJSON(SAVE_KEY) }))}</div>
                ${older ? '<div class="small" style="color:var(--red);margin-top:8px">지금 이 기기 기록이 더 새롭거나 더 많을 수 있어. 가져오면 지금 기록을 덮어써.</div>' : '<div class="small dim" style="margin-top:8px">가져오면 지금 이 기기의 기록을 이 파일로 바꿔.</div>'}
                <div class="row" style="margin-top:10px"><button class="btn block" data-act="closeModal">아니</button><button class="btn block primary" data-act="importConfirm">가져오기</button></div>`, true);
            } catch (e) { toast('가져오기 실패: ' + esc(e.message)); }
          };
          reader.onerror = () => toast('파일을 읽지 못했어.');
          reader.readAsText(f);
        });
      }
      inp.click();
    },
    importConfirm() {
      try { applyBackup(ui.pendingBackup); }
      catch (e) { toast('가져오기 실패: ' + esc(e.message)); }
    },
    codex() { ui.codexTab = 'cards'; openModal(codexHTML()); },
    codexGallery() { ui.codexTab = 'gallery'; openModal(codexHTML()); },
    codexTab(d) { ui.codexTab = d.t; ui.modal = codexHTML(); render(); },
    codexCls(d) { ui.codexCls = d.c; ui.modal = codexHTML(); render(); },
    achv() { openModal(achHTML(false)); },
    lockedHero() { toast('🔒 ' + esc(D.STARTERS.aria.unlockText)); },
    lockedCard(d) { const c = D.CARDS[d.id]; if (c.mastery) { const t = D.MASTERY.track(c.mastery).find(x => x.id === d.id); toast(`🔒 ${esc(D.HEROINES[c.mastery].name)} 레벨 ${t.lv}에서 보상 풀에 추가돼.`); return; } toast(c.unlock ? `🔒 업적 「${esc(D.ACHIEVEMENTS[c.unlock].name)}」: ${esc(D.ACHIEVEMENTS[c.unlock].desc)}` : '아직 만나지 못한 카드야. 보상·상점에서 찾아봐.'); },
    lockedRelic() { toast('아직 찾지 못한 유물이야.'); },
    lockedEnemy() { toast('아직 만나지 못한 적이야.'); },
    lockedGal(d) { toast('🔒 해금 조건: ' + esc(D.GALLERY[d.id].how)); },
    enemyInfo(d) { openModal(enemyInfoHTML(d.id, null), true); },
    viewArt(d) { let info = {}; try { info = JSON.parse(d.info); } catch (e) { /* 무시 */ } viewArt(d.key, info, d.cap); },
    tutNext() { ui.tut++; if (ui.tut >= TUT.length) { meta.tutorialDone = true; saveMeta(); } render(); },
    tutSkip() { meta.tutorialDone = true; saveMeta(); render(); },
    tutReplay() { meta.tutorialDone = false; ui.tut = 0; saveMeta(); closeModal(); toast('다음 전투에서 튜토리얼이 다시 나와.'); },
    asc(d) { settings.asc = Math.max(0, Math.min(meta.ascMax, Math.min(settings.asc, meta.ascMax) + +d.d)); saveSettings(); render(); },
    continue() { const s = loadJSON(SAVE_KEY); if (s && s.v === 2) { run = s; run.fx = []; ui.modal = null; ui.deadShown = new Set(); ui.runAch = []; render(); } },
    previewDeck(d) { const s = D.STARTERS[d.id], o = E.runOptions(meta, d.id, settings.loadout[d.id]); openModal(deckModal((o.deck || s.deck).map(id => ({ id, up: false })), s.title + (o.deck ? ' 시작 덱 (변형)' : ' 시작 덱'))); },
    heroes() { openModal(heroListHTML()); },
    profile(d) { openModal(profileHTML(d.id), !!ui.modal); },
    loadout(d) { const L = settings.loadout[d.h] = Object.assign({ relic: 'base', deck: 'base' }, settings.loadout[d.h]); L[d.k] = d.v; saveSettings(); render(); },
    story(d) { ui.story = { h: d.h, ch: +d.ch, i: 0 }; meta.storyRead[d.h + (+d.ch)] = Date.now(); saveMeta(); render(); },
    storyNext() { const st = D.STORIES[ui.story.h][ui.story.ch]; if (ui.story.i < st.lines.length - 1) { ui.story.i++; render(); } else H.storyClose(); },
    storyClose() { const h = ui.story.h; ui.story = null; if (ui.modal) ui.modal = profileHTML(h); render(); },
    lockedTrack(d) { toast('🔒 ' + esc(D.HEROINES[d.h].name) + ' 레벨 ' + d.lv + '에서 열려.'); },
    pick(d) { startRun(d.id); },
    again() { const id = run.starter; run = null; startRun(id); },
    viewDeckEnd() { openModal(deckModal(run.deck, '최종 덱')); },
    menu() {
      openModal(`<h2>메뉴</h2>
        <div class="small dim">${esc(D.STARTERS[run.starter].title)} · ${esc(D.ACTS[run.act].name)} · 🔥승천 ${run.asc}</div>
        <button class="btn block" data-act="deck">🃏 덱 보기</button>
        <button class="btn block" data-act="codex">📖 도감</button>
        <button class="btn block" data-act="help">❔ 도움말</button>
        <button class="btn block" data-act="settings">⚙️ 설정</button>
        <button class="btn block" data-act="toTitle">🏠 타이틀로 (자동 저장됨)</button>
        <button class="btn block" style="color:var(--red)" data-act="abandon">🏳️ 원정 포기</button>
        <button class="btn block" data-act="closeModal">닫기</button>`);
    },
    abandon() { openModal(`<h2>정말 포기할까?</h2><div class="small dim">이번 원정 기록은 실패로 남아.</div><div class="row"><button class="btn block" data-act="closeModal">아니</button><button class="btn block primary" data-act="abandonYes">포기</button></div>`, true); },
    abandonYes() { ui.modal = null; ui.modalStack = []; run.over = true; run.won = false; run.screen = 'gameover'; run.combat = null; saveRun(); render(); },
    deck() { openModal(deckModal(run.deck, '내 덱')); },
    relic(d) { const r = D.RELICS[d.id]; toast(`${r.icon} <b>${esc(r.name)}</b>${r.boss ? ' 👑' : ''}<br>${esc(r.desc)}`); },
    mechInfo(d) { toast(d.k === 'moon' ? '🌙 <b>달의 위상</b><br>카드를 낼 때마다 🌒초승→🌓반달→🌕보름→🌑그믐 순으로 1칸. 카드 오른쪽 위 달이 지금 위상과 같으면 추가 효과. 그믐→초승으로 넘어가면 한 바퀴.' : '🪆 <b>인형</b> (최대 3체)<br>적의 공격은 방어도 → 맨 앞 인형 → 체력 순으로 받아. 턴 종료 시 인형마다 무작위 적을 공격. 3체일 때 더 세우면 맨 앞 인형 체력이 늘어.', 4200); },
    status(d) { const s = D.STATUS[d.s]; toast(`${s.icon} <b>${esc(s.name)}</b> ${s.flag ? '' : d.v}<br>${esc(s.desc(+d.v))}`); },
    cardInfo(d) { openModal(cardDetail({ id: d.id, up: d.up === '1' }), true); },
    node(d) { sfx('tap'); doAct(() => E.chooseNode(run, d.id)); },
    potion(d) {
      const id = run.potions[+d.slot]; if (!id) { toast('빈 물약 칸이야.'); return; }
      const p = D.POTIONS[id];
      const can = !p.passive && ((run.screen === 'combat' && run.combat && !run.combat.over) || p.anywhere);
      openModal(`<h2>${p.icon} ${esc(p.name)}</h2><div>${esc(p.desc)}</div>
        <div class="row">${p.passive ? '<span class="small dim" style="flex:1">자동으로 발동하는 물약이야.</span>' : `<button class="btn block primary ${can ? '' : 'disabled'}" data-act="usePotion" data-slot="${d.slot}">사용</button>`}<button class="btn block" data-act="dropPotion" data-slot="${d.slot}">버리기</button></div>
        <button class="btn block" data-act="closeModal">닫기</button>`);
    },
    usePotion(d) {
      const slot = +d.slot, p = D.POTIONS[run.potions[slot]];
      ui.modal = null; ui.modalStack = [];
      if (p.target && run.screen === 'combat' && E.aliveEnemies(run).length > 1) { ui.potionSel = slot; ui.sel = null; render(); return; }
      doAct(() => E.usePotion(run, slot, run.screen === 'combat' ? run.combat.enemies.indexOf(E.aliveEnemies(run)[0]) : null));
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
        playSelected(E.needsTarget(def) ? c.enemies.indexOf(E.aliveEnemies(run)[0]) : null); return;
      }
      if (!E.canPlay(run, cd)) {
        const def = E.cardDef(cd);
        toast(def.unplayable ? '이 카드는 낼 수 없어.' : '에너지가 부족해.');
        const el = app.querySelector(`.card[data-uid="${uid}"]`); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
        buzz(15); return;
      }
      sfx('tap'); ui.sel = uid; render();
    },
    enemy(d) {
      const i = +d.i, e = run.combat.enemies[i];
      if (!e || e.dead) return;
      if (ui.sel != null) { playSelected(i); return; }
      if (ui.potionSel != null) { const slot = ui.potionSel; ui.potionSel = null; doAct(() => E.usePotion(run, slot, i)); return; }
      openModal(enemyInfoHTML(e.id, e));
    },
    bg() { if (ui.sel != null || ui.potionSel != null) { ui.sel = null; ui.potionSel = null; render(); } },
    endTurn() {
      if (!run.combat) return;
      ui.sel = null; ui.potionSel = null; ui.busy = true;
      doAct(() => E.endTurn(run));
      setTimeout(() => { if (!ui.hold) ui.busy = false; }, settings.fast ? 250 : 500);
    },
    rwGold() { sfx('coin'); doAct(() => E.takeGold(run)); },
    rwRelic() { sfx('buff'); doAct(() => E.takeRelic(run)); },
    rwBoss(d) { const r = D.RELICS[run.rewards.bossRelics[+d.i]]; openModal(`<h2>${r.icon} ${esc(r.name)}</h2><div>${esc(r.desc)}</div><div class="small dim">보스 유물은 하나만 가질 수 있어. 다른 둘은 사라져.</div><button class="btn gold block" data-act="rwBossOk" data-i="${d.i}">이걸로 할래</button><button class="btn block" data-act="closeModal">다시 볼래</button>`); },
    rwBossOk(d) { ui.modal = null; sfx('ach'); buzz(40); doAct(() => E.takeBossRelic(run, +d.i)); },
    rwPotion() { doAct(() => E.takePotion(run)); },
    rwCardView(d) {
      const cd = run.rewards.cards[+d.i];
      openModal(cardDetail(cd, `<button class="btn primary block" data-act="rwCard" data-i="${d.i}">덱에 넣기</button>`));
    },
    rwCard(d) { ui.modal = null; sfx('card'); doAct(() => E.takeCard(run, +d.i)); },
    rwSkip() { doAct(() => E.skipCard(run)); },
    rwLeave() {
      const r = run.rewards;
      if (r && r.bossRelics && !r.bossRelicTaken) { toast('👑 보스 유물을 하나 골라 줘.'); return; }
      if (r && !r.cardTaken && !ui.confirmSkip) { ui.confirmSkip = true; toast('카드 보상을 아직 안 골랐어. 한 번 더 누르면 그냥 넘어가.'); setTimeout(() => { ui.confirmSkip = false; }, 3000); return; }
      ui.confirmSkip = false;
      if (r && r.potion && !r.potionTaken && !run.potions.includes(null)) toast('물약 칸이 가득 차서 물약은 두고 왔어.');
      doAct(() => E.leaveReward(run));
    },
    restHeal() { sfx('heal'); doAct(() => E.restHeal(run)); },
    restSmith() { doAct(() => E.restSmith(run)); },
    selView(d) {
      const uid = +d.uid, cd = run.deck.find(x => x.uid === uid), p = run.pending;
      let body;
      if (p.mode === 'upgrade') {
        const df = E.upgradeDiff(cd.id);
        body = `<div class="row" style="justify-content:center;gap:6px">${cardHTML(cd)}<span style="font-size:24px">➜</span>${cardHTML({ id: cd.id, up: true })}</div>
          <div class="panel diffpanel"><div class="small diffline">${df.cost ? `<span class="tag">비용 ${esc(df.cost)}</span>` : ''}${df.changes.map(x => `<span class="tag up">${esc(x)}</span>`).join('')}</div><div class="small">${df.html}</div></div>`;
      } else body = `<div style="display:flex;justify-content:center">${cardHTML(cd, { big: true })}</div>`;
      const verb = { upgrade: ['이 카드를 강화할까?', '강화!'], remove: ['이 카드를 뺄까?', '제거'], dup: ['이 카드를 복제할까?', '복제'] }[p.mode] || ['선택', '확인'];
      openModal(`<h2>${verb[0]}</h2>${body}
        <button class="btn primary block" data-act="selOk" data-uid="${uid}">${verb[1]}</button><button class="btn block" data-act="closeModal">다른 카드</button>`);
    },
    selOk(d) { ui.modal = null; const mode = run.pending && run.pending.mode; const r = doAct(() => E.selectCard(run, +d.uid)); if (r && r.ok) { toast(mode === 'upgrade' ? '⚒️ 강화 완료!' : mode === 'dup' ? '🪞 복제 완료!' : '✂️ 카드를 뺐어.'); sfx('buff'); } },
    selCancel() { doAct(() => E.cancelSelect(run)); },
    shopCardView(d) {
      const it = run.shop.cards[+d.i];
      openModal(cardDetail(it, `<button class="btn gold block ${run.gold < it.price ? 'disabled' : ''}" data-act="buy" data-k="cards" data-i="${d.i}">💰 ${it.price}에 구매</button>`));
    },
    buy(d) { ui.modal = null; ui.modalStack = []; const r = doAct(() => E.buy(run, d.k, +d.i)); if (r && r.ok) { toast('구매 완료!'); sfx('coin'); } },
    shopRemove() { doAct(() => E.shopRemove(run)); },
    leaveShop() { doAct(() => E.leaveShop(run)); },
    openChest() { sfx('coin'); buzz(30); doAct(() => E.openChest(run)); },
    leaveTreasure() { doAct(() => E.leaveTreasure(run)); },
    evOpt(d) { doAct(() => E.chooseEvent(run, +d.i)); },
    evLeave() { doAct(() => E.leaveEvent(run)); }
  };

  app.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || !app.contains(el)) return;
    const act = el.dataset.act;
    if (act === 'noop') { ev.stopPropagation(); return; }
    if (ui.busy && act !== 'closeModal' && act !== 'viewArt') return;
    if (act === 'closeModal' && el.classList.contains('modal-bg') && ev.target !== el) return;
    ev.stopPropagation();
    const h = H[act];
    if (h) {
      try { h(el.dataset, el); } catch (e) { console.error(e); toast('앗, 오류가 났어: ' + esc(e.message)); }
    }
  });
  app.addEventListener('input', ev => {
    if (ev.target.id === 'ascr') { settings.asc = +ev.target.value; saveSettings(); render(); }
  });
  window.addEventListener('resize', () => { if (run && run.screen === 'combat') layoutHand(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { const v = document.querySelector('.viewer'); if (v) v.remove(); else if (ui.modal) closeModal(); } });

  // PWA: 오프라인 캐시
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // 테스트/디버그용
  window.BD_UI = { get run() { return run; }, set run(v) { run = v; }, get meta() { return meta; }, set meta(v) { meta = v; }, render, ui, H, settings, openModal };
  applySettings();
  render();
})();
