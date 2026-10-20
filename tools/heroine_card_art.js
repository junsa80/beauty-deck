/* v1.3.1 새 히로인 3명(마리엘·세레나·오데트) 카드 45장 일러스트
 * mastery_art.js(v1.2.1)와 같은 방식: 히로인 초상(img/hero_*.webp)을 카드마다 다르게 잘라(확대·초점·반전) 색보정하고,
 * 카드 효과 SVG(실·바늘·인형·달 위상·별비·책장·문자·봉인…)를 겹쳐 540×960 webp로 굽습니다. 숙련 카드(mx_*)는 금빛 마름모+금테.
 * 사용: NODE_PATH=/tmp/pt/node_modules node tools/heroine_card_art.js → img/card_<id>.webp + artmap.js 갱신
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const W = 540, H = 960;
const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const glow = id => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const sparks = (R, n, c, y0 = 0, y1 = H) => Array.from({ length: n }, () => `<circle cx="${(R() * W) | 0}" cy="${(y0 + R() * (y1 - y0)) | 0}" r="${(1 + R() * 4).toFixed(1)}" fill="${c}" opacity="${(.3 + R() * .6).toFixed(2)}"/>`).join('');
const G = (inner) => `<g filter="url(#g)">${inner}</g>`;
// 이펙트 조각: (R, c) → svg
const FX = {
  slash: (R, c) => G([0, 1, 2].map(i => { const y = 300 + R() * 400; return `<path d="M-20 ${y | 0} Q270 ${(y - 200 - R() * 150) | 0} 580 ${(y - 380 + R() * 200) | 0}" stroke="${i ? '#fff' : c}" stroke-width="${i ? 3 : 14}" fill="none" stroke-linecap="round" opacity=".85"/>`; }).join('')),
  cross: (R, c) => G(`<path d="M60 220 L480 760" stroke="${c}" stroke-width="12" stroke-linecap="round"/><path d="M480 220 L60 760" stroke="${c}" stroke-width="12" stroke-linecap="round"/><path d="M60 220 L480 760 M480 220 L60 760" stroke="#fff" stroke-width="3"/>`),
  threads: (R, c) => G(Array.from({ length: 7 }, () => { const x = R() * W; return `<path d="M${x | 0} -10 C${(x + 80 - R() * 160) | 0} 300 ${(R() * W) | 0} 500 ${(R() * W) | 0} ${(600 + R() * 360) | 0}" stroke="${c}" stroke-width="2.5" fill="none" opacity=".85"/>`; }).join('')),
  needles: (R, c) => G(Array.from({ length: 9 }, () => { const x = R() * W, y = 300 + R() * 600, a = -60 + R() * 40; return `<g transform="translate(${x | 0} ${y | 0}) rotate(${a | 0})"><path d="M0 -70 L4 50 L0 60 L-4 50 Z" fill="#e8eef8"/><ellipse cx="0" cy="-58" rx="2" ry="6" fill="none" stroke="${c}" stroke-width="2"/></g>`; }).join('')),
  patch: (R, c) => G(`<rect x="110" y="520" width="320" height="320" rx="30" fill="${c}" opacity=".25"/><rect x="110" y="520" width="320" height="320" rx="30" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="14 10"/>`),
  dolls: (R, c) => G(Array.from({ length: 3 }, (_, i) => { const x = 110 + i * 160, y = 760 + (i % 2) * 40; return `<g transform="translate(${x} ${y})" fill="none" stroke="${c}" stroke-width="5"><circle cx="0" cy="-70" r="24"/><path d="M0 -46 L0 30 M-36 -20 L36 -20 M0 30 L-24 90 M0 30 L24 90"/><path d="M0 -94 L0 -200" stroke-width="2" stroke-dasharray="4 6"/></g>`; }).join('')),
  heart: (R, c) => G(`<path d="M270 760 C120 640 120 480 220 470 C250 467 265 490 270 510 C275 490 290 467 320 470 C420 480 420 640 270 760Z" fill="${c}" opacity=".7"/>${Array.from({ length: 12 }, () => `<path d="M${(160 + R() * 220) | 0} ${(500 + R() * 200) | 0} q8 -30 0 -60" stroke="#ffcf6e" stroke-width="4" fill="none"/>`).join('')}`),
  wall: (R, c) => G(Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, k) => `<rect x="${(k * 110 - (r % 2) * 55) + 10}" y="${600 + r * 80}" width="100" height="70" rx="8" fill="${c}" opacity=".22" stroke="#fff" stroke-width="2"/>`).join('')).join('')),
  gears: (R, c) => G([[160, 700, 80], [330, 620, 55], [420, 780, 40]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="10" stroke-dasharray="${(r / 3) | 0} ${(r / 4) | 0}"/><circle cx="${x}" cy="${y}" r="${(r / 3) | 0}" fill="none" stroke="#fff" stroke-width="3"/>`).join('')),
  stage: (R, c) => `<path d="M0 0 L0 960 L90 960 C140 600 60 300 140 0 Z" fill="${c}" opacity=".55"/><path d="M540 0 L540 960 L450 960 C400 600 480 300 400 0 Z" fill="${c}" opacity=".55"/><path d="M0 0 L540 0 L540 70 Q270 130 0 70Z" fill="${c}" opacity=".7"/>${G(`<ellipse cx="270" cy="900" rx="220" ry="40" fill="#fff1c0" opacity=".35"/>`)}`,
  snip: (R, c) => G(`<g transform="translate(300 640) rotate(-30)" fill="none" stroke="#e8eef8" stroke-width="7"><circle cx="-60" cy="80" r="30"/><circle cx="60" cy="80" r="30"/><path d="M-40 55 L40 -140 M40 55 L-40 -140"/></g><path d="M0 500 Q200 560 250 600" stroke="${c}" stroke-width="3" fill="none"/><path d="M350 680 Q450 720 540 700" stroke="${c}" stroke-width="3" fill="none"/>`),
  net: (R, c) => G(Array.from({ length: 9 }, (_, i) => `<path d="M${i * 68} 380 L${i * 68 - 120} 960" stroke="${c}" stroke-width="2"/><path d="M${i * 68} 380 L${i * 68 + 120} 960" stroke="${c}" stroke-width="2"/>`).join('')),
  moons: (R, c) => G([0, 1, 2, 3].map(i => { const x = 90 + i * 120, y = 140; return `<circle cx="${x}" cy="${y}" r="34" fill="#1a2050" stroke="${c}" stroke-width="3"/><path d="M${x} ${y - 34} A34 34 0 0 ${i < 2 ? 1 : 0} ${x} ${y + 34} A${[10, 34, 34, 10][i]} 34 0 0 ${i == 1 || i == 2 ? 1 : 0} ${x} ${y - 34}Z" fill="#f4f6ff"/>`; }).join('')),
  crescent: (R, c) => `<defs><mask id="cm"><rect width="540" height="960" fill="#fff"/><circle cx="${330 + R() * 40 | 0}" cy="200" r="110" fill="#000"/></mask></defs>${G(`<circle cx="380" cy="230" r="120" fill="${c}" mask="url(#cm)"/>`)}`,
  fullmoon: (R, c) => `<defs><radialGradient id="fm"><stop offset=".6" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle cx="270" cy="230" r="180" fill="url(#fm)" opacity=".8"/>`,
  eclipse: (R, c) => G(`<circle cx="270" cy="250" r="140" fill="none" stroke="${c}" stroke-width="18" opacity=".8"/><circle cx="270" cy="250" r="128" fill="#05030f" opacity=".75"/>`),
  waves: (R, c) => G(Array.from({ length: 6 }, (_, i) => `<path d="M-20 ${620 + i * 55} Q 120 ${590 + i * 55} 270 ${620 + i * 55} T 560 ${620 + i * 55}" stroke="${c}" stroke-width="${6 - i * .6}" fill="none" opacity="${.9 - i * .1}"/>`).join('')),
  halo: (R, c) => G(`<ellipse cx="270" cy="300" rx="230" ry="230" fill="none" stroke="${c}" stroke-width="5"/><ellipse cx="270" cy="300" rx="200" ry="200" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 9"/>`),
  spiral: (R, c) => G(Array.from({ length: 3 }, (_, k) => `<path d="${Array.from({ length: 60 }, (_, i) => { const a = i / 8 + k * 2.1, r = 20 + i * 5; return (i ? 'L' : 'M') + ((270 + Math.cos(a) * r) | 0) + ' ' + ((560 + Math.sin(a) * r * .6) | 0); }).join(' ')}" stroke="${k ? '#fff' : c}" stroke-width="${k ? 2 : 6}" fill="none" opacity=".8"/>`).join('')),
  rain: (R, c) => G(Array.from({ length: 34 }, () => { const x = R() * 700 - 80, y = R() * 900; return `<path d="M${x | 0} ${y | 0} l-60 120" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><circle cx="${(x - 60) | 0}" cy="${(y + 120) | 0}" r="3" fill="#fff"/>`; }).join('')),
  clock: (R, c) => G(`<circle cx="270" cy="420" r="210" fill="none" stroke="${c}" stroke-width="5"/>${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path d="M${(270 + Math.cos(a) * 190) | 0} ${(420 + Math.sin(a) * 190) | 0} L${(270 + Math.cos(a) * 210) | 0} ${(420 + Math.sin(a) * 210) | 0}" stroke="#fff" stroke-width="4"/>`; }).join('')}<path d="M270 420 L270 260 M270 420 L380 470" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`),
  galaxy: (R, c) => `<defs><radialGradient id="gx"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".4" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><ellipse cx="270" cy="380" rx="300" ry="120" fill="url(#gx)" transform="rotate(-20 270 380)"/>${sparks(R, 120, '#fff', 200, 560)}`,
  notes: (R, c) => G(Array.from({ length: 8 }, () => `<text x="${(R() * 480 + 20) | 0}" y="${(200 + R() * 700) | 0}" font-size="${(30 + R() * 30) | 0}" fill="${c}">${'♪♫♩'[(R() * 3) | 0]}</text>`).join('')),
  pages: (R, c) => G(Array.from({ length: 9 }, () => { const x = R() * 480, y = 120 + R() * 760, a = R() * 70 - 35; return `<g transform="translate(${x | 0} ${y | 0}) rotate(${a | 0})"><rect width="70" height="92" rx="4" fill="#fff6e0" opacity=".75"/>${[20, 36, 52, 68].map(l => `<path d="M10 ${l} L60 ${l}" stroke="${c}" stroke-width="2"/>`).join('')}</g>`; }).join('')),
  glyphs: (R, c) => G(Array.from({ length: 16 }, () => `<text x="${(R() * 500 + 10) | 0}" y="${(160 + R() * 780) | 0}" font-size="${(22 + R() * 26) | 0}" fill="${c}" opacity=".85">${'§¶†‡*※ⅠⅡⅢ'[(R() * 10) | 0]}</text>`).join('')),
  quill: (R, c) => G(`<path d="M110 860 C220 640 330 420 470 160 C420 360 340 560 130 860Z" fill="#fff6e0" opacity=".85"/><path d="M110 860 L470 160" stroke="${c}" stroke-width="3"/>`),
  bookmark: (R, c) => G(`<path d="M380 0 L380 520 L420 470 L460 520 L460 0Z" fill="${c}" opacity=".85"/>`),
  seal: (R, c) => G(`<circle cx="270" cy="520" r="150" fill="none" stroke="${c}" stroke-width="10"/><circle cx="270" cy="520" r="120" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 8"/><path d="M170 420 L370 620 M370 420 L170 620" stroke="${c}" stroke-width="8"/><path d="M0 500 L540 540" stroke="#7a1f2a" stroke-width="16" opacity=".7"/>`),
  key: (R, c) => G(`<g transform="translate(270 560) rotate(-35)" fill="none" stroke="${c}" stroke-width="10"><circle cx="0" cy="-150" r="50"/><path d="M0 -100 L0 200 M0 140 L40 140 M0 180 L30 180"/></g>`),
  index: (R, c) => G(Array.from({ length: 7 }, (_, i) => `<rect x="${430 + (i % 2) * 20}" y="${180 + i * 90}" width="110" height="60" rx="8" fill="${c}" opacity=".6"/><text x="${450 + (i % 2) * 20}" y="${222 + i * 90}" font-size="30" fill="#fff">${'가나다라마바사'[i]}</text>`).join('')),
  vault: (R, c) => G(`<path d="M90 900 L90 420 Q270 260 450 420 L450 900" fill="none" stroke="${c}" stroke-width="10"/>${[0, 1, 2, 3].map(i => `<path d="M110 ${520 + i * 100} L430 ${520 + i * 100}" stroke="#fff" stroke-width="3"/>`).join('')}`),
  tome: (R, c) => G(`<g transform="translate(270 640)"><path d="M-220 -60 L0 -20 L220 -60 L220 140 L0 180 L-220 140Z" fill="#3a2614" stroke="${c}" stroke-width="6"/><path d="M0 -20 L0 180" stroke="${c}" stroke-width="4"/></g><path d="M270 620 L270 200" stroke="#fff1c0" stroke-width="40" opacity=".25"/>`),
  scroll: (R, c) => G(`<rect x="100" y="200" width="340" height="560" fill="#fff6e0" opacity=".25"/><rect x="80" y="180" width="380" height="36" rx="18" fill="${c}"/><rect x="80" y="745" width="380" height="36" rx="18" fill="${c}"/><text x="270" y="520" font-size="120" text-anchor="middle" fill="${c}" opacity=".8">17</text>`),
  tear: (R, c) => G(`<path d="M120 200 L240 360 L190 440 L300 560 L260 640 L380 820" stroke="${c}" stroke-width="10" fill="none"/><path d="M120 200 L240 360 L190 440 L300 560 L260 640 L380 820" stroke="#fff" stroke-width="3" fill="none"/>`),
};
// id: [hero, zoom, fx, fy, flip, [tint, alpha], [fx parts], color]
const C = {
  pm_strike: ['mariel', 1.5, .62, .2, false, ['#c0395a', .18], ['needles', 'slash'], '#ff8aa3'],
  pm_guard: ['mariel', 1.6, .45, .45, true, ['#1f3a2a', .2], ['patch', 'threads'], '#9fe0b8'],
  pm_doll: ['mariel', 1.8, .78, .68, false, ['#e0b46a', .15], ['dolls'], '#ffd9a0'],
  pm_chorus: ['mariel', 1.3, .5, .55, false, ['#c0395a', .15], ['dolls', 'notes'], '#ffc0d0'],
  pm_stitch: ['mariel', 2.0, .42, .26, false, ['#d8e0ff', .15], ['threads', 'needles'], '#e8eef8'],
  pm_twin: ['mariel', 1.7, .75, .7, true, ['#ffb347', .15], ['dolls', 'threads'], '#ffe0a0'],
  pm_scrap: ['mariel', 1.4, .7, .62, false, ['#6b3a1a', .2], ['gears'], '#ffcf6e'],
  pm_heart: ['mariel', 1.9, .78, .6, false, ['#ff3d2a', .2], ['heart'], '#ff5a3a'],
  pm_wall: ['mariel', 1.2, .5, .6, true, ['#1f3a2a', .22], ['wall', 'dolls'], '#b8e6c8'],
  pm_upgrade: ['mariel', 1.7, .7, .65, true, ['#ffcf6e', .18], ['gears', 'threads'], '#ffe08a'],
  pm_booth: ['mariel', 1.15, .5, .4, false, ['#7a1f2a', .2], ['stage'], '#7a1f3a'],
  pm_cut: ['mariel', 1.7, .3, .3, true, ['#c0395a', .2], ['snip'], '#ff8aa3'],
  mx_net: ['mariel', 1.45, .55, .3, true, ['#d0d8ff', .18], ['net', 'threads'], '#e6ecff'],
  mx_curtain: ['mariel', 1.25, .5, .45, false, ['#a3002a', .2], ['stage', 'dolls'], '#a3002a'],
  mx_finale: ['mariel', 1.1, .5, .5, true, ['#ffd36e', .18], ['stage', 'heart'], '#ffd36e'],
  sm_slash: ['serena', 1.6, .45, .2, false, ['#b9c6ff', .18], ['crescent', 'slash'], '#cfd8ff'],
  sm_step: ['serena', 1.4, .5, .78, true, ['#1a2050', .25], ['moons', 'waves'], '#9fb0ff'],
  sm_full: ['serena', 1.3, .55, .45, false, ['#ffffff', .15], ['fullmoon', 'slash'], '#eef2ff'],
  sm_wane: ['serena', 1.8, .5, .2, true, ['#0f1440', .3], ['crescent'], '#8090d0'],
  sm_crescent: ['serena', 1.5, .3, .55, false, ['#b9c6ff', .2], ['crescent', 'cross'], '#cfd8ff'],
  sm_tide: ['serena', 1.3, .5, .72, false, ['#2a4aa0', .22], ['waves'], '#9fd0ff'],
  sm_skip: ['serena', 1.5, .65, .45, true, ['#5a6aff', .18], ['moons'], '#c0c8ff'],
  sm_eclipse: ['serena', 1.35, .5, .3, false, ['#300a40', .3], ['eclipse', 'slash'], '#ff9a5a'],
  sm_halo: ['serena', 1.7, .48, .18, false, ['#d8e0ff', .18], ['halo'], '#e6ecff'],
  sm_spin: ['serena', 1.2, .5, .55, true, ['#b9c6ff', .18], ['spiral'], '#c8d4ff'],
  sm_hold: ['serena', 1.6, .55, .3, false, ['#1a2050', .25], ['clock', 'moons'], '#c0c8ff'],
  sm_rain: ['serena', 1.15, .5, .4, false, ['#3b3fa0', .22], ['rain'], '#e8ecff'],
  mx_zanwol: ['serena', 1.55, .7, .5, true, ['#9fb0ff', .2], ['crescent', 'slash'], '#e6ecff'],
  mx_galaxy: ['serena', 1.25, .5, .5, false, ['#5a3dff', .2], ['galaxy'], '#a08cff'],
  mx_lastsong: ['serena', 1.1, .5, .45, true, ['#1a0a30', .28], ['fullmoon', 'notes'], '#c0a8ff'],
  lo_strike: ['odette', 1.7, .55, .3, false, ['#e0b46a', .15], ['quill'], '#a05a1a'],
  lo_guard: ['odette', 1.3, .2, .6, true, ['#3a2614', .2], ['wall', 'pages'], '#e0b46a'],
  lo_read: ['odette', 1.9, .75, .3, false, ['#ffcf6e', .18], ['pages'], '#8a5a12'],
  lo_mark: ['odette', 1.8, .45, .2, true, ['#c0395a', .12], ['bookmark'], '#c0395a'],
  lo_note: ['odette', 1.6, .7, .35, false, ['#e0b46a', .15], ['glyphs'], '#ffe0a0'],
  lo_index: ['odette', 1.4, .3, .4, false, ['#3a2614', .2], ['index'], '#a05a1a'],
  lo_quote: ['odette', 1.5, .5, .25, true, ['#e0b46a', .15], ['glyphs', 'pages'], '#fff1c0'],
  lo_seal: ['odette', 1.35, .5, .5, false, ['#7a1f2a', .22], ['seal'], '#ffcf6e'],
  lo_tome: ['odette', 1.6, .72, .4, true, ['#ffb347', .15], ['tome'], '#e0b46a'],
  lo_vault: ['odette', 1.2, .5, .55, false, ['#3a2614', .25], ['vault', 'key'], '#e0b46a'],
  lo_revise: ['odette', 1.5, .6, .35, true, ['#fff1c0', .15], ['quill', 'glyphs'], '#c08030'],
  lo_library: ['odette', 1.1, .5, .45, false, ['#ffcf6e', .18], ['pages', 'tome'], '#ffe08a'],
  mx_clause: ['odette', 1.45, .5, .3, false, ['#e0b46a', .18], ['scroll'], '#ffd36e'],
  mx_weight: ['odette', 1.3, .6, .6, true, ['#3a2614', .22], ['tome', 'key'], '#ffd36e'],
  mx_annul: ['odette', 1.2, .5, .4, false, ['#7a1f2a', .22], ['scroll', 'tear'], '#ff6a4a'],
};
module.exports = { C };
if (require.main === module) (async () => {
  const puppeteer = require('puppeteer');
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.goto('file://' + path.join(ROOT, 'img/README.txt'));
  for (const [id, [hero, z, fx, fy, flip, [tint, ta], parts, col]] of Object.entries(C)) {
    const R = rnd(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483646 + 1);
    const mastery = id.startsWith('mx_');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${glow('g')}</defs>${parts.map(k => FX[k](R, col)).join('')}${sparks(R, 40, '#fff8e8')}
      ${mastery ? `<g transform="translate(470 70)" opacity=".95"><path d="M0 -40 L34 0 L0 40 L-34 0 Z" fill="#2a1a3a" stroke="#ffd36e" stroke-width="4"/><path d="M0 -20 L16 0 L0 20 L-16 0 Z" fill="#ffd36e"/></g>
      <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="14" fill="none" stroke="#ffd36e" stroke-width="3" opacity=".55"/>` : ''}</svg>`;
    const data = await p.evaluate(async (src, svg, W, H, z, fx, fy, flip, tint, ta) => {
      const load = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = s; });
      const im = await load(src), ov = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      const sw = im.width / z, sh = im.height / z, sx = Math.max(0, Math.min(im.width - sw, im.width * fx - sw / 2)), sy = Math.max(0, Math.min(im.height - sh, im.height * fy - sh / 2));
      g.save(); if (flip) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(im, sx, sy, sw, sh, 0, 0, W, H); g.restore();
      g.globalCompositeOperation = 'overlay'; g.globalAlpha = ta * 2; g.fillStyle = tint; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      const v = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,0,20,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'screen'; g.drawImage(ov, 0, 0); g.globalCompositeOperation = 'source-over';
      return c.toDataURL('image/webp', .8);
    }, `hero_${hero}.webp`, svg, W, H, z, fx, fy, flip, tint, ta);
    fs.writeFileSync(path.join(ROOT, 'img', `card_${id}.webp`), Buffer.from(data.split(',')[1], 'base64'));
  }
  await b.close();
  const am = path.join(ROOT, 'artmap.js'); let s = fs.readFileSync(am, 'utf8');
  for (const id of Object.keys(C)) if (!s.includes(`"card:${id}"`)) s = s.replace('window.BD_ARTMAP = {\n', `window.BD_ARTMAP = {\n"card:${id}": "img/card_${id}.webp",\n`);
  fs.writeFileSync(am, s);
  console.log('wrote', Object.keys(C).length, 'cards');
})();
