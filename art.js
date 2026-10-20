/* 미녀 덱 — 절차적 일러스트 + 실제 일러스트 연결
 * BD_ARTMAP['card:s_bash'] = 'img/card_s_bash.webp' 처럼 실제 그림이 등록돼 있으면 그걸 쓰고(lazy 로딩),
 * 없으면 key마다 다른 9:16 SVG 그림을 즉석에서 그립니다. (같은 key → 항상 같은 그림)
 */
(function (root) {
  'use strict';
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const CLS_COL = { sword: ['#ff6f91', '#3a0d1f'], magic: ['#8f7bff', '#160f3a'], ninja: ['#58e0b5', '#0b2a24'], holy: ['#ffd36e', '#4a3008'], puppet: ['#c0395a', '#1f3a2a'], moon: ['#b9c6ff', '#1a2050'], lore: ['#e0b46a', '#3a2614'], neutral: ['#c9b3ff', '#241a3a'], status: ['#777', '#222'], curse: ['#777', '#222'] };

  function sparkles(R, n, col) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = (R() * 90).toFixed(1), y = (R() * 160).toFixed(1), r = (0.3 + R() * 1.4).toFixed(2), o = (0.25 + R() * 0.6).toFixed(2);
      s += R() < 0.3 ? `<path d="M${x} ${y - r * 2}L${+x + r * 0.5} ${y}L${x} ${+y + r * 2}L${x - r * 0.5} ${y}Z" fill="${col}" opacity="${o}"/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${o}"/>`;
    }
    return s;
  }
  function petals(R, n, col) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = R() * 90, y = R() * 160, a = R() * 360, k = 1.5 + R() * 3;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${k.toFixed(1)}" ry="${(k * 0.45).toFixed(1)}" fill="${col}" opacity="${(0.15 + R() * 0.35).toFixed(2)}" transform="rotate(${a.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return s;
  }
  // 성인 여성 실루엣(단정한 드레스 차림). hair: 0 긴 생머리, 1 포니테일, 2 단발, 3 웨이브
  function lady(R, c1, c2, opt) {
    opt = opt || {};
    const hair = opt.hair != null ? opt.hair : Math.floor(R() * 4);
    const cx = opt.cx || 45, top = opt.top || 40, sc = opt.sc || 1;
    const H = shade(c2, -0.35), skin = '#f6dccd', dress = shade(c1, -0.15), trim = shade(c1, 0.45);
    const tf = `translate(${cx} ${top}) scale(${sc})`;
    let back = '';
    if (hair === 0) back = `<path d="M-15 -4 C-18 20 -16 44 -12 58 L12 58 C16 44 18 20 15 -4 Z" fill="${H}"/>`;
    if (hair === 1) back = `<path d="M8 -14 C22 -10 24 10 18 40 C16 28 14 12 8 -2 Z" fill="${H}"/>`;
    if (hair === 3) back = `<path d="M-16 -4 C-22 10 -12 18 -18 30 C-14 40 -8 44 -10 50 L10 50 C8 44 14 40 18 30 C12 18 22 10 16 -4 Z" fill="${H}"/>`;
    const fringe = hair === 2
      ? `<path d="M-13 -2 C-14 -18 14 -18 13 -2 L13 12 C10 8 10 0 8 -4 C2 -2 -6 -2 -9 -6 C-10 2 -10 8 -13 12 Z" fill="${H}"/>`
      : `<path d="M-12 -2 C-13 -17 13 -17 12 -2 C8 -8 0 -9 -4 -6 C-6 -2 -9 0 -12 4 Z" fill="${H}"/>`;
    return `<g transform="${tf}">${back}
      <path d="M-26 70 C-24 44 -14 32 0 32 C14 32 24 44 26 70 L30 130 L-30 130 Z" fill="${dress}"/>
      <path d="M-10 33 L0 46 L10 33" fill="none" stroke="${trim}" stroke-width="1.6"/>
      <rect x="-3.5" y="16" width="7" height="14" rx="3" fill="${skin}"/>
      <ellipse cx="0" cy="2" rx="11" ry="13.5" fill="${skin}"/>
      <ellipse cx="-4" cy="3" rx="1.2" ry="1.6" fill="#3a2230"/><ellipse cx="4" cy="3" rx="1.2" ry="1.6" fill="#3a2230"/>
      <path d="M-2 9.5 Q0 11 2 9.5" stroke="#c45a6a" stroke-width="0.9" fill="none"/>
      ${fringe}
      ${opt.crown ? `<path d="M-8 -14 L-6 -22 L-2 -16 L0 -24 L2 -16 L6 -22 L8 -14 Z" fill="#ffd36e"/>` : ''}
      ${opt.accent ? `<circle cx="-11" cy="-8" r="2.6" fill="${trim}"/>` : ''}
    </g>`;
  }
  const MOTIF = {
    attack: (R, c) => { let s = ''; for (let i = 0; i < 3; i++) { const y = 40 + R() * 80; s += `<path d="M${5 + R() * 10} ${y + 30} L${80 - R() * 10} ${y - 30}" stroke="${c}" stroke-width="${(1 + R() * 2.5).toFixed(1)}" stroke-linecap="round" opacity=".55"/>`; } return s; },
    skill: (R, c) => `<path d="M45 34 L72 46 L68 92 L45 116 L22 92 L18 46 Z" fill="none" stroke="${c}" stroke-width="2" opacity=".45"/><path d="M45 44 L64 53 L61 88 L45 106 L29 88 L26 53 Z" fill="${c}" opacity=".12"/>`,
    power: (R, c) => { let s = ''; const n = 10 + Math.floor(R() * 6); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; s += `<path d="M45 80 L${(45 + Math.cos(a) * 60).toFixed(1)} ${(80 + Math.sin(a) * 60).toFixed(1)}" stroke="${c}" stroke-width="1" opacity=".3"/>`; } return s + `<circle cx="45" cy="80" r="26" fill="none" stroke="${c}" stroke-width="1.5" opacity=".5"/>`; },
    status: () => '', curse: () => ''
  };
  function frame(id, c1, c2, body, R, k) {
    const g = 'g' + id;
    return `<svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><linearGradient id="${g}a" x1="0" y1="0" x2="${(0.3 + R() * 0.7).toFixed(2)}" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <radialGradient id="${g}b" cx="${(0.3 + R() * 0.4).toFixed(2)}" cy="${(0.2 + R() * 0.3).toFixed(2)}" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="90" height="160" fill="url(#${g}a)"/><rect width="90" height="160" fill="url(#${g}b)"/>${body}
      <rect width="90" height="160" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/></svg>`;
  }
  let uidc = 0;
  /* info: { kind:'card'|'hero'|'enemy'|'gallery'|'event', c1, c2, glyph, type, woman, hair, crown, silhouette } */
  function svg(key, info) {
    const R = rng(hash(key)); info = info || {};
    const c1 = info.c1 || '#8f7bff', c2 = info.c2 || '#160f3a', id = (hash(key) % 99991) + '_' + (++uidc);
    let body = sparkles(R, 10 + Math.floor(R() * 16), '#fff');
    if (R() < 0.5) body += petals(R, 6 + Math.floor(R() * 8), shade(c1, 0.5));
    // 뒤 배경 구조물(달/아치/별자리) — key마다 다른 조합
    const deco = Math.floor(R() * 4);
    if (deco === 0) body += `<circle cx="${(20 + R() * 50).toFixed(0)}" cy="${(16 + R() * 20).toFixed(0)}" r="${(9 + R() * 8).toFixed(0)}" fill="#fff" opacity=".22"/>`;
    if (deco === 1) body += `<path d="M10 160 L10 60 Q45 10 80 60 L80 160" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="3"/>`;
    if (deco === 2) { let p = ''; for (let i = 0; i < 5; i++) p += `${i ? 'L' : 'M'}${(10 + R() * 70).toFixed(0)} ${(10 + R() * 50).toFixed(0)} `; body += `<path d="${p}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width=".6"/>`; }
    if (deco === 3) body += `<path d="M0 ${(120 + R() * 20).toFixed(0)} Q45 ${(100 + R() * 20).toFixed(0)} 90 ${(120 + R() * 20).toFixed(0)} L90 160 L0 160Z" fill="#000" opacity=".25"/>`;
    if (info.kind === 'card') body += (MOTIF[info.type] || MOTIF.skill)(R, shade(c1, 0.6));
    if (info.woman) body += lady(R, c1, c2, { hair: info.hair, crown: info.crown, accent: R() < 0.5, sc: info.kind === 'card' ? 0.85 : 1, top: info.kind === 'card' ? 52 : 44 });
    if (info.party) { body += lady(R, '#ff6f91', '#3a0d1f', { cx: 22, top: 66, sc: 0.62, hair: 0 }) + lady(R, '#8f7bff', '#160f3a', { cx: 68, top: 66, sc: 0.62, hair: 3 }) + lady(R, '#58e0b5', '#0b2a24', { cx: 45, top: 56, sc: 0.7, hair: 1 }); }
    if (info.glyph && !info.woman && !info.party) body += `<text x="45" y="${info.kind === 'card' ? 92 : 98}" font-size="${info.kind === 'card' ? 38 : 46}" text-anchor="middle" dominant-baseline="middle">${esc(info.glyph)}</text>`;
    else if (info.glyph && info.kind === 'card') body += `<text x="72" y="26" font-size="18" text-anchor="middle" dominant-baseline="middle">${esc(info.glyph)}</text>`;
    if (info.silhouette) body = `<g filter="url(#sil${id})">${body}</g>`;
    let out = frame(id, c1, c2, body, R, key);
    if (info.silhouette) out = out.replace('<defs>', `<defs><filter id="sil${id}"><feColorMatrix type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0 0.12  0 0 0 1 0"/></filter>`);
    return out;
  }
  function src(key) { const m = root.BD_ARTMAP || {}; return m[key] || null; }
  function html(key, info, opt) {
    opt = opt || {};
    const s = src(key) || (info && info.fallback && src(info.fallback));
    if (s && !(info && info.silhouette)) return `<img class="artimg" src="${esc(s)}" alt="" loading="${opt.eager ? 'eager' : 'lazy'}" decoding="async" draggable="false" onerror="this.style.display='none'">`;
    if (s && info && info.silhouette) return `<img class="artimg sil" src="${esc(s)}" alt="" loading="lazy" decoding="async" draggable="false">`;
    return svg(key, info);
  }
  root.BD_ART = { svg, html, src, hash, shade, CLS_COL };
  if (typeof module !== 'undefined') module.exports = root.BD_ART;
})(typeof window !== 'undefined' ? window : globalThis);
