# 미녀 덱: 밤의 여왕 (v0.1.0)

슬레이 더 스파이어(슬더슬) 스타일의 **덱빌딩 로그라이트** 웹앱입니다.
히로인 카드로 덱을 만들고, 12층짜리 갈림길 지도를 올라가 보스 **밤의 여왕 벨리타**를 쓰러뜨리면 클리어입니다.
폰 브라우저 세로 화면(360~430px)에 맞춰 만들었고, 빌드 도구 없이 순수 HTML/CSS/JS로 동작합니다.
모든 등장인물은 성인(20대) 설정이고, 선정적인 요소는 없습니다.

## 바로 해 보기
- **파일 하나로:** `dist/beauty-deck.html`을 브라우저로 열면 끝. (모든 코드가 한 파일에 들어 있음)
- **폴더 그대로:** `index.html`을 열어도 됩니다.
- **인터넷에 올리기:** 폴더째(또는 `dist/beauty-deck.html`만 `index.html`로 이름 바꿔) GitHub Pages, Netlify, Cloudflare Pages 같은 정적 호스팅에 올리면 링크로 플레이할 수 있습니다.
- 진행 상황은 브라우저 `localStorage`에 자동 저장됩니다. (`beautydeck.run.v1` = 현재 원정, `beautydeck.meta.v1` = 누적 기록)

## 게임 규칙 요약
- 매 턴 에너지 3, 카드 5장 드로우. 남은 손패는 턴 종료 시 버림. 방어도는 내 턴 시작 시 사라짐.
- 적 머리 위에 **다음 행동 예고**(⚔️공격 수치, 🛡️방어, ✨강화, 🌀방해, 🦇소환)가 보입니다.
- 상태 효과: 힘, 민첩, 약화(주는 피해 −25%), 취약(받는 피해 +50%), 중독, 가시, 활력, 그리고 파워 카드 효과(각성/철벽/마나 순환/정령 계약/맹독/잔상/불굴), 적 전용 분노.
- 체력은 전투가 끝나도 이어집니다.
- 지도: 12층 + 보스. 칸 종류 = 전투, 엘리트, 휴식(회복 30% 또는 카드 강화), 상점(카드/유물/물약/카드 제거), 이벤트, 보물(7층 고정), 보스. 1층은 항상 전투, 12층은 항상 휴식.
- 보상: 카드 3장 중 1장(건너뛰기 가능), 골드, 확률로 물약, 엘리트는 유물.

## 조작 (모바일)
- 카드를 **터치하면 선택**(위로 올라옴) → 적을 터치하면 그 적에게 사용. 적이 하나뿐이거나 대상이 필요 없는 카드는 **카드를 한 번 더 터치**하면 사용.
- 빈 곳 터치 = 선택 취소. 적 터치(카드 미선택) = 적 정보/다음 행동 상세.
- 상단 바: ☰ 메뉴, 체력, 골드, 층, 물약 3칸(터치해서 사용/버리기), 🃏 덱 보기. 그 아래 줄은 유물(터치하면 설명).

## 등장인물
**플레이어 히로인 (시작 시 1명 선택)**
| 히로인 | 직업 | 체력 | 시작 유물 | 특징 |
|---|---|---|---|---|
| 붉은 검의 세라 (24) | 검사 | 74 | 🎀 붉은 머리끈: 전투 승리 시 체력 5 회복 | 힘·방어 위주 정면 승부 |
| 별을 읽는 루나 (22) | 마법사 | 75 | 🌙 달의 펜던트: 첫 턴 에너지 +1 | 광역 마법·드로우 |
| 그림자 걷는 유키 (23) | 닌자 | 70 | 🥷 그림자 두건: 전투 시작 시 표창 2장 | 표창·독 |

**카드 일러스트 히로인:** 세라, 루나, 유키, 아리아(성기사), 카이라(창술사), 시엘(정령사), 엘레나(사제), 피오(연금술사), 미르(궁수), 벨(도적), 다온(무희), 리라(음유시인)

**적**
- 일반: 말랑 슬라임, 흡혈 박쥐, 견습 마녀 미아, 산적 두목 카린, 가시덩굴 정령 로사, 해골 기사 녹스, 사냥꾼 베로니카
- 엘리트: 흑장미 결투가 이자벨(스킬 카드를 쓰면 힘이 오름), 쌍둥이 암살자 레나 & 리나
- 보스: **밤의 여왕 벨리타** — 체력 210. 1막(피의 입맞춤/박쥐 소환/매혹의 시선/붉은 송곳니), 체력 50% 이하에서 2막(디버프 해제 + 힘 상승, 피의 폭풍/핏빛 장막/영원한 밤 순환).

## 파일 구조
```
beauty-deck/
├─ index.html        진입점 (data.js → engine.js → ui.js 순서로 로드)
├─ style.css         모든 스타일 (모바일 세로 우선)
├─ data.js           ★ 콘텐츠: 히로인/상태효과/카드/시작덱/적/조우/유물/물약/이벤트/이미지(ART)
├─ engine.js         게임 규칙 (DOM 없음, Node에서도 실행됨). 상태는 run 객체 하나 = JSON 저장
├─ ui.js             화면 그리기 + 터치 입력 + 연출. 규칙은 없음
├─ img/              일러스트 넣는 곳 (지금은 비어 있음 → 그라데이션+이니셜로 대체 표시)
├─ tools/build.js    단일 파일 빌드: node tools/build.js → dist/beauty-deck.html
├─ dist/beauty-deck.html  단일 파일 버전
└─ test/
   ├─ sim.js         헤드리스 시뮬레이션 (무작위 봇 + 휴리스틱 봇)
   ├─ ui-smoke.js    (선택) 헤드리스 크롬으로 실제 클릭 진행 + 스크린샷
   └─ ui-scenes.js   (선택) 보스전/패배 화면 스크린샷
```

### 구조 원칙
- `engine.js`의 함수(`playCard`, `endTurn`, `chooseNode`, `buy` …)는 전부 `run`을 바꾸고 `{ok, reason}`을 돌려줍니다.
- 화면 전환은 `run.screen` 값 하나로 결정됩니다: `map | combat | reward | rest | shop | event | treasure | select | victory | gameover`.
- 연출은 엔진이 `run.fx` 배열에 이벤트(`dmg`, `block`, `say`, `die`, `phase` …)를 쌓고, `ui.js`의 `playFx`가 소비합니다.
- 난수는 시드 기반(`run.rng`)이라 저장/불러오기 후에도 똑같이 이어집니다.

## 콘텐츠 추가하는 법
### 카드 추가 (`data.js` → `CARDS`)
```js
s_newcard: { name: '새 카드', cls: 'sword', type: 'attack', rarity: 'common', cost: 1, hero: 'aria',
  effects: [{ t: 'dmg', v: 7 }, { t: 'apply', s: 'weak', v: 1 }],
  up: { effects: [{ t: 'dmg', v: 10 }, { t: 'apply', s: 'weak', v: 2 }] },
  quote: '대사 한 줄' },
```
- `cls`: `sword`(세라 보상 풀) / `magic`(루나) / `ninja`(유키) / `neutral`(모두) / `token`·`status`(보상에 안 나옴)
- `rarity`: `starter | common | uncommon | rare | special`, `cost: -1`은 X 비용
- 키워드: `exhaust`(소멸), `innate`(선천성), `ethereal`(휘발성), `unplayable`
- 효과 종류(`t`): `dmg{v,hits,hitsFrom:'atk'}`, `dmgAll{v,hits|'X'}`, `dmgRandom{v,hits}`, `dmgBlock`, `block{v}`, `doubleBlock`, `draw{v}`, `energy{v}`, `apply{s,v}`, `applyAll{s,v}`, `self{s,v}`(버프·파워), `heal{v}`, `add{id,n,to:'hand'|'draw'|'discard'}`, `upgradeHand{v:1|'all'}`, `multiplyPoison{v}`, `loseHp{v}`
- 카드 설명문은 효과에서 **자동 생성**됩니다(`engine.js`의 `describe`). 새 효과 종류를 만들면 `runEffects`와 `describe` 두 곳에 추가하세요.
- 새 파워는 `STATUS`에 `power: true`로 상태를 만들고, 발동 시점(턴 시작/종료/카드 사용)을 `engine.js`의 `startPlayerTurn`/`endTurn`/`playCard`에 추가합니다.

### 적 추가 (`ENEMIES` + `ENCOUNTERS`)
- 행동(`moves`): `dmg, hits, block, blockAll, selfSt{}, playerSt{}, addCards[], heal, summon[], say`
- 패턴(`ai`): `{type:'random', w:{행동:가중치}, maxRun:{행동:연속최대}, first}` 또는 `{type:'cycle', order:[...], first}`
- 보스 페이즈: `phases: [{ai}, {at:0.5, enter:{say, clearDebuffs, st, block}, ai}]`, `intro`/`death` 대사
- 등장시키려면 `ENCOUNTERS.easy/normal/elite/boss`에 조합을 추가.

### 유물 · 물약 · 이벤트
- 유물: `RELICS`에 추가 후 효과는 `engine.js`에서 `hasRelic(run, 'id')`로 검색해 원하는 시점에 넣기.
- 물약: `POTIONS` (카드와 같은 효과 문법, `target: true`면 대상 선택, `anywhere: true`면 지도에서도 사용 가능)
- 이벤트: `EVENTS`에 텍스트·선택지 추가. 선택지 `fx`: `hp, maxHp, heal, gold, relic:'random', card:id|'rare', potion:'random', upgrade, remove, upgradeRandom`, `chance:{p, win, lose}`, `need:{gold}`

### 일러스트 넣기
1. 이미지를 `img/`에 넣습니다 (세로형 3:4 권장, webp/png/jpg).
2. `data.js` 맨 아래 `ART`에 연결:
```js
const ART = {
  sera: 'img/sera.webp',              // 히로인 → 그 히로인이 주인공인 모든 카드 + 초상
  belita: 'img/belita.webp',          // 적 id
  'card:s_heavy': 'img/cards/s_heavy.webp'  // 특정 카드 전용 일러스트(우선 적용)
};
```
- 이미지가 없거나 깨지면 자동으로 그라데이션 + 이니셜로 돌아갑니다.
- 단일 파일 버전에서 이미지를 쓰려면 html 옆에 `img/` 폴더를 같이 두거나, 경로 대신 data URI를 넣으면 됩니다.

## 테스트
```bash
node test/sim.js 300        # 히로인별 300판 × (무작위 봇 + 휴리스틱 봇)
node tools/build.js         # 단일 파일 다시 만들기 (코드 수정 후 꼭 실행)
```
`sim.js`는 매 행동마다 체력/에너지/카드 중복/적 의도/설명문/JSON 저장 가능 여부를 검사하고, 97걸음마다 저장→복원 왕복도 합니다.
v0.1.0 기준 결과(히로인별 300판): 크래시·무한루프 0건. 휴리스틱 봇 승률 세라 ~50%, 루나 ~29%, 유키 ~34% (대부분 보스에서 패배). 사람은 봇보다 잘하므로, 체감 난이도는 "가끔 이길 수 있음~보통" 정도를 노렸습니다.

## 다음 할 일 (추천 순서)
1. **일러스트 연결** — 히로인 12명 + 적 11종 초상. `ART`에 경로만 넣으면 끝.
2. **밸런스 2차** — 세라가 다른 둘보다 확실히 쉬움. 실제 플레이 후 카드 수치/보스 체력 조정.
3. **카드 드래그로 내기**(지금은 터치 2번), 카드 길게 눌러 확대 보기.
4. **튜토리얼** — 첫 전투에서 카드 선택→대상 터치 안내 화살표.
5. **2막/3막** 추가 (지도 `FLOORS`, 조우표를 막별로 분리), 보스 유물, 상점 카드 강화판.
6. **사운드/진동**(Web Audio + `navigator.vibrate`), 연출 줄이기 옵션.
7. **영구 해금** — 클리어 시 새 히로인/카드 해금, 난이도(승천) 단계.
8. **저장 백업/복원**(JSON 내보내기), PWA(홈 화면 추가·오프라인).
9. 카드 선택형 효과(손에서 카드 골라 강화/소멸 등) — 지금은 무작위로 처리.
