// 일러스트 슬롯·프롬프트 생성: node tools/art_prompts.js → art/prompts.json, art/ART_PROMPTS.md
// 3장씩 한 배치(16:9 트립틱 1장 = 세로 9:16 패널 3장)로 묶습니다. 생성 후 tools/ingest_art.py로 넣으세요.
'use strict';
const fs = require('fs'), path = require('path');
const D = require('../data.js');
const root = path.join(__dirname, '..');
const STYLE = 'polished anime fantasy game illustration, soft cinematic rim lighting, rich detailed background, vibrant colors, clean line art';
const SAFE = 'all characters are clearly adult women in their twenties, tasteful fully clothed fantasy outfits, no school uniforms, no nudity, no text, no watermark';
const TYPE_POSE = { attack: 'dynamic attack pose with glowing motion trails and impact sparks', skill: 'focused defensive or spellcasting pose with a glowing magic circle', power: 'awakening pose surrounded by a swirling aura of power', status: 'dim, ominous mood' };
const slots = [];
const H = D.HEROINES;
const heroDesc = id => { const h = H[id]; return `${h.name} (adult woman, ${h.age} years old, ${h.job}): ${h.look}`; };
for (const id of Object.keys(H)) slots.push({ key: 'hero:' + id, prompt: `Full-body character portrait of ${heroDesc(id)}, confident pose, standing in a moonlit fantasy setting` });
for (const [id, e] of Object.entries(D.ENEMIES)) {
  const who = e.age ? `an adult fantasy villainess aged ${e.ageText ? 'late twenties (goddess)' : e.age}, ${e.desc}` : `a fantasy creature: ${e.desc}`;
  slots.push({ key: 'enemy:' + id, prompt: `${e.boss ? 'Epic boss splash art of' : e.kind === 'elite' ? 'Menacing elite enemy art of' : 'Enemy art of'} ${who} (${e.name}), main colors ${e.colors.join(' and ')}, facing the viewer` });
}
for (const [id, c] of Object.entries(D.CARDS)) {
  if (!['sword', 'magic', 'ninja', 'holy', 'neutral'].includes(c.cls) || c.rarity === 'special') continue;
  const subject = c.hero && H[c.hero] ? heroDesc(c.hero) : 'a mysterious adventurer woman in her twenties';
  slots.push({ key: 'card:' + id, prompt: `Card art for the skill "${c.name}" (${c.type}, ${c.rarity}): ${subject}, ${TYPE_POSE[c.type] || ''}, motif ${c.icon || ''}${c.quote ? `, mood: "${c.quote}"` : ''}` });
}
for (const [id, g] of Object.entries(D.GALLERY)) {
  const who = g.hero ? heroDesc(g.hero) : g.enemy ? `${D.ENEMIES[g.enemy].name}, ${D.ENEMIES[g.enemy].desc}` : 'Sera, Luna, Yuki and Aria (four adult heroines) together';
  slots.push({ key: 'gallery:' + id, prompt: `Reward splash illustration "${g.title}": ${who}. Scene: ${g.cap}` });
}
for (const [id, ev] of Object.entries(D.EVENTS)) {
  const who = ev.hero && H[ev.hero] ? heroDesc(ev.hero) : 'a fantasy scene';
  slots.push({ key: 'event:' + id, prompt: `Story event illustration "${ev.title}": ${who}. Scene: ${ev.text.replace(/\n/g, ' ').slice(0, 160)}` });
}
const batches = [];
for (let i = 0; i < slots.length; i += 3) {
  const three = slots.slice(i, i + 3);
  while (three.length < 3) three.push({ key: null, prompt: 'decorative moonlit fantasy night sky with stars' });
  const prompt = `Triptych of three equal vertical 9:16 panels side by side, separated by thin dark borders, consistent art style: ${STYLE}. ` +
    three.map((s, j) => `Panel ${['one', 'two', 'three'][j]}: ${s.prompt}.`).join(' ') + ` Each subject centered in her own panel with head fully visible. ${SAFE}.`;
  batches.push({ batch: batches.length + 1, file: `batch_${String(batches.length + 1).padStart(3, '0')}.png`, keys: three.map(s => s.key), aspect_ratio: '16:9', prompt });
}
fs.mkdirSync(path.join(root, 'art'), { recursive: true });
fs.writeFileSync(path.join(root, 'art', 'prompts.json'), JSON.stringify({ style: STYLE, safety: SAFE, slots, batches }, null, 1));
let md = `# 미녀 덱 일러스트 슬롯 (${slots.length}장 / 트립틱 ${batches.length}회 생성)\n\n` +
  '1. 아래 배치마다 GenerateImage(aspect_ratio 16:9)로 1장 생성 → `art/incoming/batch_###.png` 로 저장\n' +
  '2. `python3 tools/ingest_art.py` 실행 → 패널 3장으로 자르고(늘리지 않고 crop) 540×960 webp로 `img/`에 저장, `artmap.js` 자동 갱신\n' +
  '3. 개별 그림은 `art/incoming/card_s_bash.png` 처럼 key의 `:`를 `_`로 바꾼 이름으로 넣어도 됩니다.\n\n';
for (const b of batches) md += `## ${b.file}\n- ${b.keys.map(k => k || '(빈 칸)').join('\n- ')}\n\n\`\`\`\n${b.prompt}\n\`\`\`\n\n`;
fs.writeFileSync(path.join(root, 'art', 'ART_PROMPTS.md'), md);
console.log('slots', slots.length, 'batches', batches.length, 'by kind', JSON.stringify(slots.reduce((m, s) => (m[s.key.split(':')[0]] = (m[s.key.split(':')[0]] || 0) + 1, m), {})));
