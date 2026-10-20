/* 숙련 카드 12장 전용 일러스트 (v1.2.1)
 * 기존 실제 일러스트(히로인 초상·갤러리·전용 카드)를 카드마다 다르게 잘라 색보정하고,
 * 카드 효과를 나타내는 SVG 이펙트(꽃잎 참격, 혜성, 서리, 독침, 등불…)를 코드로 겹쳐 540×960 webp로 굽습니다.
 * 사용: NODE_PATH=/tmp/pt/node_modules node tools/mastery_art.js  → img/card_<id>.webp + artmap.js 갱신
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const W = 540, H = 960;
// base: 원본, z: 확대, x/y: 초점(0~1), flip, tint: 색보정, fx: 이펙트 SVG(뷰박스 540×960)
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647);
function sparks(R, n, col, y0 = 0, y1 = H) { let s = ''; for (let i = 0; i < n; i++) { const x = R() * W, y = y0 + R() * (y1 - y0), r = 1 + R() * 4; s += `<circle cx="${x|0}" cy="${y|0}" r="${r.toFixed(1)}" fill="${col}" opacity="${(.3 + R() * .6).toFixed(2)}"/>`; } return s; }
function petals(R, n, col) { let s = ''; for (let i = 0; i < n; i++) { const x = R() * W, y = R() * H, a = R() * 360, k = 8 + R() * 14; s += `<ellipse cx="${x|0}" cy="${y|0}" rx="${k|0}" ry="${(k*.42)|0}" fill="${col}" opacity="${(.45 + R() * .45).toFixed(2)}" transform="rotate(${a|0} ${x|0} ${y|0})"/>`; } return s; }
const glow = (id, col) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const FX = {
  sx_flurry: R => `<defs>${glow('g')}</defs><g filter="url(#g)">
    <path d="M-20 700 Q270 420 580 180" stroke="#ff5a7a" stroke-width="16" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="M-20 520 Q300 640 580 860" stroke="#ffb3c4" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M40 760 Q280 470 520 300" stroke="#fff" stroke-width="3" fill="none" opacity=".9"/></g>${petals(R, 46, '#ff3d6b')}${sparks(R, 40, '#ffd1dc')}`,
  sx_vow: R => `<defs>${glow('g')}<linearGradient id="rb" x1="0" x2="1"><stop offset="0" stop-color="#b3002d"/><stop offset="1" stop-color="#ff4d73"/></linearGradient></defs>
    <g filter="url(#g)" opacity=".92"><path d="M40 900 C160 760 300 900 400 820 C480 760 520 640 470 600" stroke="url(#rb)" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M400 820 l-70 -40 l0 80 Z M400 820 l70 -40 l0 80 Z" fill="#e0204a"/><circle cx="400" cy="820" r="16" fill="#ff8aa3"/></g>
    ${sparks(R, 30, '#ff8aa3')}`,
  sx_dawn: R => `<defs><radialGradient id="sun" cx=".5" cy="1"><stop offset="0" stop-color="#fff2c0" stop-opacity=".95"/><stop offset=".4" stop-color="#ff9a5a" stop-opacity=".55"/><stop offset="1" stop-color="#ff4d6d" stop-opacity="0"/></radialGradient>${glow('g')}</defs>
    <rect x="0" y="420" width="540" height="540" fill="url(#sun)"/>${Array.from({length: 14}, (_, i) => { const a = Math.PI + i / 13 * Math.PI; return `<path d="M270 960 L${(270 + Math.cos(a) * 700)|0} ${(960 + Math.sin(a) * 700)|0}" stroke="#ffe3a0" stroke-width="4" opacity=".3"/>`; }).join('')}
    <g filter="url(#g)"><path d="M40 300 A300 300 0 0 1 500 300" stroke="#ffd36e" stroke-width="8" fill="none" opacity=".8"/></g>${petals(R, 24, '#ff8a6b')}${sparks(R, 50, '#fff0c8')}`,
  lx_comet: R => `<defs><linearGradient id="tail" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#d9ccff" stop-opacity=".95"/></linearGradient>${glow('g')}</defs>
    <g filter="url(#g)">${[[470, 60, 150, 520, 22], [520, 200, 330, 470, 12], [400, 20, 60, 330, 9]].map(([x1, y1, x2, y2, w]) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="url(#tail)" stroke-width="${w}" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="${w * 1.3}" fill="#fff"/>`).join('')}</g>${sparks(R, 90, '#e8e0ff', 0, 600)}`,
  lx_veil: R => `<defs><linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe9ff" stop-opacity="0"/><stop offset="1" stop-color="#e6f4ff" stop-opacity=".7"/></linearGradient></defs>
    <rect x="0" y="540" width="540" height="420" fill="url(#fog)"/>${Array.from({length: 9}, () => { const x = R() * 540, y = 80 + R() * 800, r = 18 + R() * 30; return `<g transform="translate(${x|0} ${y|0})" stroke="#f0f8ff" stroke-width="3" opacity=".75">${[0, 60, 120].map(a => `<path d="M0 ${-r} L0 ${r}" transform="rotate(${a})"/>`).join('')}</g>`; }).join('')}
    <path d="M0 760 C140 700 260 820 540 740" stroke="#fff" stroke-width="30" opacity=".2" fill="none"/>${sparks(R, 60, '#e0f2ff')}`,
  lx_orbit: R => `<defs>${glow('g')}</defs><g filter="url(#g)" fill="none" stroke="#c7b6ff" opacity=".85">
    <ellipse cx="270" cy="420" rx="240" ry="80" stroke-width="3" transform="rotate(-18 270 420)"/><ellipse cx="270" cy="420" rx="200" ry="60" stroke-width="2" transform="rotate(24 270 420)"/><circle cx="270" cy="420" r="150" stroke-width="1.5" stroke-dasharray="6 10"/></g>
    ${[[60, 360], [470, 300], [150, 560], [420, 520], [270, 270]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#fff" filter="url(#g)"/>`).join('')}<path d="M60 360 L270 270 L470 300 L420 520 L150 560 Z" stroke="#fff" stroke-width="1.5" fill="none" opacity=".5"/>${sparks(R, 70, '#efe8ff')}`,
  yx_mist: R => `<defs><filter id="bl"><feGaussianBlur stdDeviation="14"/></filter></defs>
    ${Array.from({length: 8}, () => `<ellipse cx="${(R() * 540)|0}" cy="${(300 + R() * 660)|0}" rx="${(120 + R() * 160)|0}" ry="${(30 + R() * 40)|0}" fill="#d8fff2" opacity=".28" filter="url(#bl)"/>`).join('')}
    ${[0, 1, 2].map(i => `<ellipse cx="${150 + i * 110}" cy="${900 - i * 40}" rx="22" ry="9" fill="#58e0b5" opacity="${.25 + i * .2}"/>`).join('')}${sparks(R, 40, '#bfffe9')}`,
  yx_needle: R => `<defs>${glow('g')}</defs><g filter="url(#g)">${Array.from({length: 11}, () => { const y = 480 + R() * 440, x = R() * 200; return `<path d="M${x|0} ${y|0} l${(220 + R() * 160)|0} ${(-60 - R() * 50)|0}" stroke="#9dffb0" stroke-width="3" stroke-linecap="round"/>`; }).join('')}</g>
    ${Array.from({length: 26}, () => `<circle cx="${(R() * 540)|0}" cy="${(500 + R() * 460)|0}" r="${(3 + R() * 9)|0}" fill="#6dff8a" opacity="${(.3 + R() * .5).toFixed(2)}"/>`).join('')}`,
  yx_moon: R => `<defs>${glow('g')}<mask id="cm"><rect width="540" height="960" fill="#fff"/><circle cx="350" cy="150" r="96" fill="#000"/></mask></defs>
    <circle cx="390" cy="170" r="105" fill="#e9fff7" mask="url(#cm)" filter="url(#g)" opacity=".95"/>
    <g filter="url(#g)">${Array.from({length: 5}, (_, i) => { const a = -60 + i * 30; return `<g transform="translate(${90 + i * 90} ${560 + (i % 2) * 120}) rotate(${a})"><path d="M0 -60 L9 0 L0 60 L-9 0 Z" fill="#58e0b5"/></g>`; }).join('')}</g>${sparks(R, 50, '#c8fff0')}`,
  ax_lantern: R => `<defs><radialGradient id="lg" cx=".5" cy=".5"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".35" stop-color="#ffcf6e" stop-opacity=".5"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>
    <circle cx="140" cy="640" r="260" fill="url(#lg)"/><g transform="translate(140 640)"><rect x="-26" y="-40" width="52" height="74" rx="10" fill="#ffe08a" stroke="#8a5a12" stroke-width="5"/><path d="M-30 -40 L0 -66 L30 -40 Z" fill="#8a5a12"/><path d="M0 -66 L0 -96" stroke="#8a5a12" stroke-width="4"/><path d="M0 -24 C14 -6 8 12 0 18 C-8 12 -14 -6 0 -24Z" fill="#fff"/></g>${sparks(R, 60, '#ffe7a8')}`,
  ax_oath: R => `<defs>${glow('g')}</defs><g filter="url(#g)" fill="none" stroke="#ffd36e" opacity=".85"><circle cx="270" cy="470" r="230" stroke-width="3"/><circle cx="270" cy="470" r="200" stroke-width="1.5" stroke-dasharray="4 8"/></g>
    ${Array.from({length: 12}, (_, i) => { const a = i / 12 * Math.PI * 2; return `<text x="${(270 + Math.cos(a) * 215)|0}" y="${(478 + Math.sin(a) * 215)|0}" font-size="26" fill="#fff2c0" text-anchor="middle" opacity=".9">✦</text>`; }).join('')}
    ${Array.from({length: 10}, () => { const x = 40 + R() * 460, y = 120 + R() * 760; return `<path d="M${x|0} ${y|0} l12 -26 l12 26 Z" fill="#ffe08a" opacity=".7"/>`; }).join('')}`,
  ax_dawnshield: R => `<defs><radialGradient id="sg" cx=".5" cy=".5"><stop offset="0" stop-color="#fff8dc" stop-opacity=".9"/><stop offset="1" stop-color="#ffd36e" stop-opacity="0"/></radialGradient>${glow('g')}</defs>
    <circle cx="270" cy="200" r="300" fill="url(#sg)"/>${Array.from({length: 18}, (_, i) => { const a = i / 18 * Math.PI * 2; return `<path d="M270 200 L${(270 + Math.cos(a) * 520)|0} ${(200 + Math.sin(a) * 520)|0}" stroke="#fff1b8" stroke-width="5" opacity=".28"/>`; }).join('')}
    <g filter="url(#g)"><path d="M270 640 L370 680 L360 810 L270 890 L180 810 L170 680 Z" fill="none" stroke="#fff" stroke-width="6" opacity=".9"/></g>${sparks(R, 50, '#fff4cc')}`,
};
const CARDS = [
  ['sx_flurry', 'card_ex_crimson', 1.25, .5, .35, false, ['#ff2d55', .18]],
  ['sx_vow', 'hero_sera', 1.35, .5, .3, true, ['#a3002a', .22]],
  ['sx_dawn', 'gallery_g_sera', 1.15, .5, .45, false, ['#ff8a3d', .2]],
  ['lx_comet', 'hero_luna', 1.3, .5, .35, true, ['#3b1f8f', .2]],
  ['lx_veil', 'gallery_g_luna', 1.2, .5, .5, false, ['#7fb8ff', .2]],
  ['lx_orbit', 'card_ex_nova', 1.2, .5, .4, false, ['#5a3dff', .15]],
  ['yx_mist', 'hero_yuki', 1.3, .5, .35, false, ['#3fd6a6', .2]],
  ['yx_needle', 'card_ex_venom', 1.3, .5, .4, true, ['#23ff7a', .15]],
  ['yx_moon', 'gallery_g_yuki', 1.2, .55, .5, true, ['#0f3b5a', .25]],
  ['ax_lantern', 'gallery_g_aria', 1.25, .5, .4, true, ['#ffb347', .18]],
  ['ax_oath', 'hero_aria', 1.35, .5, .3, false, ['#ffd36e', .15]],
  ['ax_dawnshield', 'card_ex_aegis', 1.2, .5, .4, false, ['#fff1b8', .15]],
];
(async () => {
  const puppeteer = require('puppeteer');
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const p = await b.newPage();
  await p.goto('file://' + path.join(ROOT, 'index.html').replace('index.html', 'img/README.txt'));
  for (const [id, base, z, fx, fy, flip, [tint, ta]] of CARDS) {
    const R = rnd(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483646 + 1);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${FX[id](R)}
      <g transform="translate(470 70)" opacity=".95"><path d="M0 -40 L34 0 L0 40 L-34 0 Z" fill="#2a1a3a" stroke="#ffd36e" stroke-width="4"/><path d="M0 -20 L16 0 L0 20 L-16 0 Z" fill="#ffd36e"/></g>
      <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="14" fill="none" stroke="#ffd36e" stroke-width="3" opacity=".55"/></svg>`;
    const data = await p.evaluate(async (src, svg, W, H, z, fx, fy, flip, tint, ta) => {
      const load = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = s; });
      const im = await load(src), ov = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      const sw = im.width / z, sh = im.height / z, sx = Math.max(0, Math.min(im.width - sw, im.width * fx - sw / 2)), sy = Math.max(0, Math.min(im.height - sh, im.height * fy - sh / 2));
      g.save(); if (flip) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(im, sx, sy, sw, sh, 0, 0, W, H); g.restore();
      g.globalCompositeOperation = 'overlay'; g.globalAlpha = ta * 2; g.fillStyle = tint; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      const v = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,0,20,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'screen'; g.drawImage(ov, 0, 0); g.globalCompositeOperation = 'source-over';
      return c.toDataURL('image/webp', .8);
    }, `${base}.webp`, svg, W, H, z, fx, fy, flip, tint, ta);
    fs.writeFileSync(path.join(ROOT, 'img', `card_${id}.webp`), Buffer.from(data.split(',')[1], 'base64'));
    console.log('card_' + id + '.webp');
  }
  await b.close();
  // artmap 갱신
  const am = path.join(ROOT, 'artmap.js'); let s = fs.readFileSync(am, 'utf8');
  for (const [id] of CARDS) if (!s.includes(`"card:${id}"`)) s = s.replace('window.BD_ARTMAP = {\n', `window.BD_ARTMAP = {\n"card:${id}": "img/card_${id}.webp",\n`);
  fs.writeFileSync(am, s);
})();
