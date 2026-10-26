# WORKLOG — 미녀 덱: 밤의 여왕 (beauty-deck)

작업 하나마다: 프로젝트·작업 ID · 수정 내용 · 변경 파일 · 테스트 · 커밋/PR · 남은 문제 · 다음 작업. 시간은 Europe/Berlin (CET).
테스트는 헤드리스 크로미움(브라우저 에뮬레이션)이고 실제 폰 테스트가 아님.

## 2026-10-26 · BD-QA-01 (GrokBot) — v1.5.1 회귀·모바일·저장·성능
- **수정**
  - **상단 줄 잘림 (실제 버그)**: 360px 폭에서는 물약 3칸만 있어도 덱 버튼이 18px 화면 밖, 물약 5칸(유물)이면 360·390·412 모두 덱 + 물약 2칸이 화면 밖이라 누를 수 없었음(body overflow:hidden 이라 가로 넘침 검사에 안 잡힘). `fitTopbar()`: 넘칠 때만 간격을 좁히고(.tight), 그래도 넘치면 물약·덱 묶음(.tbr)만 둘째 줄 오른쪽. 안 넘치면 예전과 같은 한 줄. 전/후 `/tmp/bd-topbar-5potions-compare.png`.
  - **터치 범위**: 상단 물약(보이는 34×40)·유물(35×32)은 보이는 크기 그대로 두고 `::after` 로 누르는 범위만 넓힘(바깥 3px 탭 0/4 → 4/4). 튜토리얼 버튼 36 → 44px.
  - **저장 이관 보강**: `migrateMeta` 가 칸 모양을 안 보고 복사해서, 백업 가져오기로 망가진 값(ach:null, cardsSeen:"x" 등)이 들어오면 기록·업적에서 던졌음. 기본값과 같은 모양일 때만 가져오고 아니면 그 칸만 기본값. 빈 기록도 v3 로(두 번 이관해도 같게). 정상 세이브는 그대로.
- **파일**: ui.js, style.css, engine.js, data.js(VERSION 1.5.1), index.html·sw.js(`?v=1.5.1`, `beautydeck-v1.5.1`), dist/beauty-deck.html, test/saves.js(새), test/ui-v151.js(새), test/perf.js(새), test/ui-smoke.js(화면별 터치 크기 정보), test/ui-v150.js(VPS 환경변수·버전 정규식), test/boss-greet.js(버전 정규식)
- **테스트 (브라우저 에뮬레이션)**: ui-smoke 360×800·390×844·412×915 각각 게임오버까지 JS 오류 없음·터치 ≥40px, ui-mastery 3폭 0 FAIL, ui-v150 3폭 45/45, ui-v151 36/36 (main 에서는 16 FAIL), ui-scenes 3폭, ui-v121·v130·v131·boss-greet·shop-own 통과, saves 60/60 (main 54/60), `node test/sim.js 150` 출력 main 과 바이트 동일.
- **성능** `test/perf.js` (CPU ×4, 390×844): 첫 로드 ~935KB (webp 482KB × 7 · js 404KB), long task 0~1 (최대 ~90ms), 전투 프레임 p50·p95 16.7ms, 50ms 넘는 프레임 0, 힙 ~3.5MB. 병목 없음.
- **자산**: img·sfx·icons 248개 전부 코드/SW 에서 참조. `art/`(33MB)는 원본 보관이라 게임이 받지 않음. 지울 것 없음.
- **남은 문제**: `dist/beauty-deck.html`(단일 파일 묶음)을 dist 폴더에서 열면 히로인 그림 7장·manifest·아이콘이 상대경로로 없어서 못 불러옴(main 도 같음, 라이브는 루트 index.html 이라 영향 없음). 실제 폰 미검증.
- **다음**: dist 묶음 경로 정리 여부 결정, 실제 폰에서 상단 둘째 줄 체감.
