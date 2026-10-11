#!/usr/bin/env python3
"""일러스트 넣기: art/incoming/ 의 그림을 img/*.webp (540x960)로 만들고 artmap.js를 다시 씁니다.
- batch_###.png : 16:9 트립틱 → art/prompts.json 의 keys 순서대로 패널 3장 (crop only, never stretch)
- <kind>_<id>.png/jpg/webp : 한 장짜리 (예: card_s_bash.png → card:s_bash). 9:16이 아니면 가운데 crop.
사용: python3 tools/ingest_art.py [--quality 78]
"""
import json, os, re, sys, glob
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INC, IMG = os.path.join(ROOT, 'art', 'incoming'), os.path.join(ROOT, 'img')
Q = int(sys.argv[sys.argv.index('--quality') + 1]) if '--quality' in sys.argv else 78
os.makedirs(INC, exist_ok=True); os.makedirs(IMG, exist_ok=True)
prompts = json.load(open(os.path.join(ROOT, 'art', 'prompts.json'), encoding='utf-8'))
by_file = {b['file']: b['keys'] for b in prompts['batches']}
def to916(im):
    W, H = im.size
    if W / H > 9 / 16:  # 넓음 → 폭을 자름
        cw = round(H * 9 / 16); l = (W - cw) // 2; return im.crop((l, 0, l + cw, H))
    ch = round(W * 16 / 9); t = max(0, int((H - ch) * 0.2)); return im.crop((0, t, W, t + ch))
def save(im, key):
    out = to916(im.convert('RGB')).resize((540, 960), Image.LANCZOS)
    p = os.path.join(IMG, key.replace(':', '_') + '.webp')
    q = Q
    while True:
        out.save(p, 'WEBP', quality=q, method=6)
        if os.path.getsize(p) <= 125 * 1024 or q <= 50: break
        q -= 6
    return p
n = 0
for f in sorted(os.listdir(INC)):
    src = os.path.join(INC, f)
    if not re.search(r'\.(png|jpe?g|webp)$', f, re.I): continue
    im = Image.open(src)
    if f in by_file or re.sub(r'\.\w+$', '.png', f) in by_file:
        keys = by_file.get(f) or by_file[re.sub(r'\.\w+$', '.png', f)]
        W, H = im.size; cw = round(H * 9 / 16); pw = W / 3
        for i, key in enumerate(keys):
            if not key: continue
            cx = pw * i + pw / 2; l = max(0, min(W - cw, int(round(cx - cw / 2))))
            save(im.crop((l, 0, l + cw, H)), key); n += 1
    else:
        m = re.match(r'(hero|enemy|card|gallery|event)_(.+)\.\w+$', f)
        if not m: print('skip', f); continue
        save(im, m.group(1) + ':' + m.group(2)); n += 1
art = {}
for p in sorted(glob.glob(os.path.join(IMG, '*.webp'))):
    b = os.path.basename(p)[:-5]; kind, _, rest = b.partition('_')
    art[kind + ':' + rest] = 'img/' + os.path.basename(p)
with open(os.path.join(ROOT, 'artmap.js'), 'w', encoding='utf-8') as fh:
    fh.write('/* 실제 일러스트 목록 — tools/ingest_art.py가 자동으로 다시 씁니다. */\nwindow.BD_ARTMAP = ' + json.dumps(art, ensure_ascii=False, indent=0) + ';\n')
sizes = [os.path.getsize(os.path.join(ROOT, v)) for v in art.values()]
print(f'processed {n}, artmap entries {len(art)}, avg {sum(sizes)/max(1,len(sizes))/1024:.0f} KB')
