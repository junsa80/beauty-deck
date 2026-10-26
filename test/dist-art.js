// dist 단일 파일을 dist/ 폴더에서 file:// 로 열고, BD_ARTMAP 의 모든 그림 + 문서 안 <img> 를 실제로 읽어 본다: node test/dist-art.js [dist/beauty-deck.html]
const puppeteer=require(process.env.PUPPETEER_DIR ? process.env.PUPPETEER_DIR + '/puppeteer' : 'puppeteer');const f=process.argv[2]||require('path').join(__dirname,'..','dist','beauty-deck.html');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();
const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+f,{waitUntil:'load'});await new Promise(r=>setTimeout(r,800));
const r=await p.evaluate(async()=>{const urls=[...new Set(Object.values(window.BD_ARTMAP||{}).concat([...document.images].map(i=>i.getAttribute('src'))).filter(Boolean))];
const res=await Promise.all(urls.map(u=>new Promise(ok=>{const im=new Image();im.onload=()=>ok([u,1]);im.onerror=()=>ok([u,0]);im.src=u;})));
return {n:res.length,bad:res.filter(x=>!x[1]).map(x=>x[0]),base:document.baseURI};});
console.log(JSON.stringify({...r,consoleErrors:errs}));console.log(r.bad.length||errs.length?"FAIL":"OK "+r.n+" images");await b.close();process.exitCode=r.bad.length||errs.length?1:0;})();
