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
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'beauty-deck.html'), html);
console.log('built dist/beauty-deck.html', (html.length / 1024).toFixed(1) + ' KB');
