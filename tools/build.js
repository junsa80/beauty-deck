// 단일 파일 빌드: node tools/build.js → dist/beauty-deck.html
// index.html의 <link rel="stylesheet">와 <script src>를 전부 인라인으로 넣습니다.
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"?]+)[^"]*">/g, (m, f) => `<style>\n${fs.readFileSync(path.join(root, f), 'utf8')}\n</style>`);
html = html.replace(/<script src="([^"?]+)[^"]*"><\/script>/g, (m, f) => {
  const js = fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ${f} */\n${js}\n</script>`;
});
// dist/ 안에서 열어도 그림·아이콘·소리·매니페스트(img/ · icons/ · sfx/ · manifest)가 저장소 루트에서 읽히게 (v1.5.2).
// 모든 상대 경로의 기준을 한 단계 위로: <base href="../">. 루트 index.html 은 그대로.
if (!/<base /i.test(html)) html = html.replace(/<meta charset="utf-8">/i, (m) => m + '\n<base href="../">');
if (!/<base /i.test(html)) throw new Error('build: <meta charset="utf-8"> 를 못 찾아 <base> 를 못 넣음');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'beauty-deck.html'), html);
console.log('built dist/beauty-deck.html', (html.length / 1024).toFixed(1) + ' KB');
