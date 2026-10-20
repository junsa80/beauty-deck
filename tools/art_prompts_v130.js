// v1.3 새 히로인 3명 일러스트 슬롯(초상 3 + 카드 45): node tools/art_prompts_v130.js → art/ART_PROMPTS_v130.md
// 생성한 그림을 art/incoming/hero_mariel.png, card_pm_strike.png 처럼 저장하고 python3 tools/ingest_art.py 를 실행하면 들어갑니다.
'use strict';
const fs = require('fs'), path = require('path');
const D = require('../data.js');
const STYLE = 'polished anime fantasy game illustration, soft cinematic rim lighting, rich detailed background, vibrant colors, clean line art';
const SAFE = 'original adult woman in her early twenties, modest fully clothed fantasy outfit, non-sexual, not resembling any real person, no text, no watermark';
const POSE = { attack: 'dynamic attack pose with glowing motion trails', skill: 'focused defensive or crafting pose with a glowing circle', power: 'awakening pose surrounded by swirling light' };
const out = ['# v1.3 새 히로인 일러스트 슬롯 (9:16, 한 장씩)', '', `공통 스타일: ${STYLE}. 안전: ${SAFE}.`, ''];
for (const h of ['mariel', 'serena', 'odette']) {
  const H = D.HEROINES[h];
  out.push(`## ${H.name} (${h})`, '', `- \`art/incoming/hero_${h}.png\` — Full-body character portrait of ${H.name}, ${H.job}: ${H.look}. ${STYLE}. ${SAFE}.`);
  for (const [id, c] of Object.entries(D.CARDS)) if (c.hero === h) out.push(`- \`art/incoming/card_${id}.png\` — Card art "${c.name}" (${c.type}): ${H.look}, ${POSE[c.type] || ''}, motif ${c.icon}, mood: "${c.quote || ''}". ${STYLE}. ${SAFE}.`);
  out.push('');
}
fs.writeFileSync(path.join(__dirname, '..', 'art', 'ART_PROMPTS_v130.md'), out.join('\n'));
console.log('art/ART_PROMPTS_v130.md', out.length, 'lines');
