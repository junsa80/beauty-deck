/* 미녀 덱: 밤의 여왕 — 게임 데이터
 * 카드, 히로인, 적, 유물, 물약, 이벤트를 모두 여기서 정의합니다.
 * 엔진(engine.js)은 이 데이터만 읽어서 동작하므로, 새 콘텐츠는 대부분 이 파일만 고치면 됩니다.
 * 모든 캐릭터는 성인(20대 이상) 설정입니다.
 */
(function (root) {
  'use strict';

  // ───────── 히로인(카드 일러스트 주인공) ─────────
  // colors: 이미지가 없을 때 쓰는 그라데이션 색. ART에 이미지를 넣으면 그게 우선입니다.
  const HEROINES = {
    sera:  { name: '세라',   job: '검사',     age: 24, colors: ['#ff5f6d', '#8e1b3a'], bio: '붉은 머리끈을 질끈 묶은 떠돌이 검사. 말보다 칼이 먼저 나가는 타입.' },
    luna:  { name: '루나',   job: '마법사',   age: 22, colors: ['#8e7bff', '#2b2269'], bio: '마탑 최연소 수석 졸업생. 잠이 많고, 계산은 정확하다.' },
    yuki:  { name: '유키',   job: '닌자',     age: 23, colors: ['#3fd1c0', '#123a4a'], bio: '말수가 적은 그림자 무사. 표창 솜씨만큼은 업계 최고.' },
    aria:  { name: '아리아', job: '성기사',   age: 27, colors: ['#ffd36e', '#a5741b'], bio: '성기사단 부단장. 방패 하나로 마을 하나를 지켜낸 적이 있다.' },
    kaira: { name: '카이라', job: '창술사',   age: 28, colors: ['#ff9a3c', '#7a3010'], bio: '사막 출신 용병. 시원시원한 성격에 창끝은 더 시원하다.' },
    sion:  { name: '시엘',   job: '정령사',   age: 21, colors: ['#7fe3ff', '#1b5a8a'], bio: '바람 정령과 계약한 정령사. 호기심이 많아 늘 사고를 친다.' },
    elena: { name: '엘레나', job: '사제',     age: 26, colors: ['#f4f1ff', '#8aa0d8'], bio: '조용한 미소의 사제. 화나면 제일 무섭다는 소문이 있다.' },
    pio:   { name: '피오',   job: '연금술사', age: 25, colors: ['#c6f06a', '#4b6b12'], bio: '폭발은 예술이라고 믿는 연금술사. 앞머리가 자주 그을린다.' },
    mir:   { name: '미르',   job: '궁수',     age: 25, colors: ['#7ddc8a', '#1f5b33'], bio: '숲의 궁수. 백 걸음 밖 사과도 꿰뚫는다.' },
    bell:  { name: '벨',     job: '도적',     age: 24, colors: ['#c27bff', '#3a1458'], bio: '독과 자물쇠의 달인. 웃는 얼굴로 지갑을 털어 간다.' },
    daon:  { name: '다온',   job: '무희',     age: 23, colors: ['#ff8fc8', '#7a2152'], bio: '칼춤을 추는 무희. 무대든 전장이든 스텝은 같다고.' },
    lyra:  { name: '리라',   job: '음유시인', age: 22, colors: ['#ffb38a', '#8a3c5c'], bio: '원정대 소식을 노래로 퍼뜨리는 음유시인. 응원 담당.' }
  };

  // ───────── 상태 효과 ─────────
  const STATUS = {
    str:       { name: '힘',     icon: '💪', type: 'buff',   desc: v => `공격 피해가 ${v} 증가해.` },
    dex:       { name: '민첩',   icon: '🍃', type: 'buff',   desc: v => `카드로 얻는 방어도가 ${v} 증가해.` },
    weak:      { name: '약화',   icon: '🥀', type: 'debuff', turns: true, desc: v => `주는 공격 피해가 25% 줄어. (${v}턴)` },
    vuln:      { name: '취약',   icon: '💔', type: 'debuff', turns: true, desc: v => `받는 공격 피해가 50% 늘어. (${v}턴)` },
    poison:    { name: '중독',   icon: '☠️', type: 'debuff', desc: v => `턴 시작 시 체력을 ${v} 잃고, 수치가 1 줄어.` },
    thorns:    { name: '가시',   icon: '🌹', type: 'buff',   desc: v => `공격받을 때마다 공격자에게 피해 ${v}.` },
    ritual:    { name: '각성',   icon: '🔥', type: 'buff',   desc: v => `턴 시작 시 힘을 ${v} 얻어.`, power: true },
    metal:     { name: '철벽',   icon: '🛡️', type: 'buff',   desc: v => `턴 종료 시 방어도를 ${v} 얻어.`, power: true },
    drawUp:    { name: '마나 순환', icon: '📖', type: 'buff', desc: v => `턴 시작 시 카드를 ${v}장 더 뽑아.`, power: true },
    energyUp:  { name: '정령 계약', icon: '🌬️', type: 'buff', desc: v => `턴 시작 시 에너지를 ${v} 더 얻어.`, power: true },
    envenom:   { name: '맹독',   icon: '🐍', type: 'buff',   desc: v => `공격으로 체력 피해를 줄 때마다 중독 ${v} 부여.`, power: true },
    afterImage:{ name: '잔상',   icon: '👥', type: 'buff',   desc: v => `카드를 낼 때마다 방어도 ${v}.`, power: true },
    barricade: { name: '불굴',   icon: '🏰', type: 'buff',   desc: () => `방어도가 턴이 바뀌어도 사라지지 않아.`, power: true, flag: true },
    enrage:    { name: '분노',   icon: '😤', type: 'buff',   desc: v => `상대가 스킬 카드를 쓸 때마다 힘을 ${v} 얻어.` },
    vigor:     { name: '활력',   icon: '✨', type: 'buff',   desc: v => `다음 공격 카드의 피해가 ${v} 증가해. (1회)` }
  };

  // ───────── 카드 ─────────
  // type: attack | skill | power | status
  // cls : sword(세라) | magic(루나) | ninja(유키) | neutral | token | status
  // rarity: starter | common | uncommon | rare | special
  // cost: 숫자, -1 = X(남은 에너지 전부)
  // effects: engine.js의 runEffect 참고
  //   dmg{v,hits,hitsFrom}, dmgAll{v,hits('X')}, dmgRandom{v,hits}, dmgBlock, block{v}, doubleBlock,
  //   draw{v}, energy{v}, apply{s,v}, applyAll{s,v}, self{s,v}, heal{v}, add{id,n,to,up},
  //   upgradeHand{v:1|'all'}, multiplyPoison{v}, loseHp{v}
  // up: 강화(+) 시 덮어쓸 값
  // hero: 카드 일러스트 주인공(HEROINES 키) / quote: 플레이버 대사
  const CARDS = {
    // ── 세라(검사) 시작 카드
    s_strike:   { name: '베기', cls: 'sword', type: 'attack', rarity: 'starter', cost: 1, hero: 'sera',
                  effects: [{ t: 'dmg', v: 6 }], up: { effects: [{ t: 'dmg', v: 9 }] }, quote: '가볍게 한 번!' },
    s_guard:    { name: '막기', cls: 'sword', type: 'skill', rarity: 'starter', cost: 1, hero: 'sera',
                  effects: [{ t: 'block', v: 5 }], up: { effects: [{ t: 'block', v: 8 }] }, quote: '그 정도론 안 뚫려.' },
    s_bash:     { name: '붉은 일섬', cls: 'sword', type: 'attack', rarity: 'starter', cost: 2, hero: 'sera',
                  effects: [{ t: 'dmg', v: 8 }, { t: 'apply', s: 'vuln', v: 2 }], up: { effects: [{ t: 'dmg', v: 10 }, { t: 'apply', s: 'vuln', v: 3 }] }, quote: '빈틈, 보였어.' },
    // ── 검사 계열
    s_twin:     { name: '쌍검 연격', cls: 'sword', type: 'attack', rarity: 'common', cost: 1, hero: 'sera',
                  effects: [{ t: 'dmg', v: 5, hits: 2 }], up: { effects: [{ t: 'dmg', v: 7, hits: 2 }] }, quote: '하나, 둘. 리듬 타는 거야.' },
    s_shieldbash:{ name: '방패 강타', cls: 'sword', type: 'attack', rarity: 'common', cost: 1, hero: 'aria',
                  effects: [{ t: 'dmgBlock' }], up: { cost: 0 }, quote: '방패도 무기라는 거, 몰랐어?' },
    s_holyshield:{ name: '성스러운 방패', cls: 'sword', type: 'skill', rarity: 'common', cost: 1, hero: 'aria',
                  effects: [{ t: 'block', v: 7 }], up: { effects: [{ t: 'block', v: 10 }] }, quote: '내 뒤에 있어. 괜찮아.' },
    s_sweep:    { name: '회전 베기', cls: 'sword', type: 'attack', rarity: 'common', cost: 1, hero: 'kaira',
                  effects: [{ t: 'dmgAll', v: 8 }], up: { effects: [{ t: 'dmgAll', v: 11 }] }, quote: '다 같이 덤벼. 그게 편해.' },
    s_armaments:{ name: '무기 손질', cls: 'sword', type: 'skill', rarity: 'common', cost: 1, hero: 'kaira',
                  effects: [{ t: 'block', v: 5 }, { t: 'upgradeHand', v: 1 }], up: { effects: [{ t: 'block', v: 5 }, { t: 'upgradeHand', v: 'all' }] }, quote: '날은 세워 둬야 제맛이지.' },
    s_heavy:    { name: '혼신의 일격', cls: 'sword', type: 'attack', rarity: 'uncommon', cost: 2, hero: 'sera',
                  effects: [{ t: 'dmg', v: 18 }], up: { effects: [{ t: 'dmg', v: 24 }] }, quote: '이거 하나에 다 걸었어.' },
    s_warcry:   { name: '전투의 함성', cls: 'sword', type: 'skill', rarity: 'uncommon', cost: 1, hero: 'kaira', exhaust: true,
                  effects: [{ t: 'self', s: 'str', v: 2 }, { t: 'draw', v: 1 }], up: { effects: [{ t: 'self', s: 'str', v: 3 }, { t: 'draw', v: 1 }] }, quote: '자, 기합 넣고 간다!' },
    s_inflame:  { name: '불꽃 검기', cls: 'sword', type: 'power', rarity: 'uncommon', cost: 1, hero: 'sera',
                  effects: [{ t: 'self', s: 'str', v: 2 }], up: { effects: [{ t: 'self', s: 'str', v: 3 }] }, quote: '칼끝이 뜨거워지는 거 느껴져?' },
    s_metal:    { name: '철벽 수호', cls: 'sword', type: 'power', rarity: 'uncommon', cost: 1, hero: 'aria',
                  effects: [{ t: 'self', s: 'metal', v: 3 }], up: { effects: [{ t: 'self', s: 'metal', v: 4 }] }, quote: '서 있기만 해도 단단해지는 법이야.' },
    s_entrench: { name: '굳건한 자세', cls: 'sword', type: 'skill', rarity: 'uncommon', cost: 2, hero: 'aria',
                  effects: [{ t: 'doubleBlock' }], up: { cost: 1 }, quote: '한 발도 물러서지 않아.' },
    s_whirl:    { name: '칼날 폭풍', cls: 'sword', type: 'attack', rarity: 'rare', cost: -1, hero: 'kaira',
                  effects: [{ t: 'dmgAll', v: 5, hits: 'X' }], up: { effects: [{ t: 'dmgAll', v: 8, hits: 'X' }] }, quote: '돌고, 돌고, 또 돌아!' },
    s_demon:    { name: '검귀의 각성', cls: 'sword', type: 'power', rarity: 'rare', cost: 3, hero: 'sera',
                  effects: [{ t: 'self', s: 'ritual', v: 2 }], up: { cost: 2 }, quote: '…이제부터 진심이야.' },
    s_barricade:{ name: '불굴의 성채', cls: 'sword', type: 'power', rarity: 'rare', cost: 3, hero: 'aria',
                  effects: [{ t: 'self', s: 'barricade', v: 1 }], up: { cost: 2 }, quote: '이 성벽은 무너지지 않아.' },

    // ── 루나(마법사) 시작 카드
    m_bolt:     { name: '마력탄', cls: 'magic', type: 'attack', rarity: 'starter', cost: 1, hero: 'luna',
                  effects: [{ t: 'dmg', v: 6 }], up: { effects: [{ t: 'dmg', v: 9 }] }, quote: '조준 완료. 발사~' },
    m_ward:     { name: '마력 방벽', cls: 'magic', type: 'skill', rarity: 'starter', cost: 1, hero: 'luna',
                  effects: [{ t: 'block', v: 5 }], up: { effects: [{ t: 'block', v: 8 }] }, quote: '얇아 보여도 튼튼해.' },
    m_meteor:   { name: '별똥별', cls: 'magic', type: 'attack', rarity: 'starter', cost: 2, hero: 'luna',
                  effects: [{ t: 'dmgAll', v: 10 }], up: { effects: [{ t: 'dmgAll', v: 14 }] }, quote: '소원 빌 시간은 없을 거야.' },
    m_focus:    { name: '마나 집중', cls: 'magic', type: 'skill', rarity: 'starter', cost: 0, hero: 'luna', exhaust: true,
                  effects: [{ t: 'draw', v: 2 }], up: { effects: [{ t: 'draw', v: 3 }] }, quote: '흐읍… 좋아, 머리 맑아졌어.' },
    // ── 마법사 계열
    m_fire:     { name: '화염구', cls: 'magic', type: 'attack', rarity: 'common', cost: 1, hero: 'luna',
                  effects: [{ t: 'dmg', v: 9 }], up: { effects: [{ t: 'dmg', v: 12 }] }, quote: '앗 뜨거. 아, 너 말고 나.' },
    m_frost:    { name: '서리 화살', cls: 'magic', type: 'attack', rarity: 'common', cost: 1, hero: 'sion',
                  effects: [{ t: 'dmg', v: 6 }, { t: 'apply', s: 'weak', v: 1 }], up: { effects: [{ t: 'dmg', v: 8 }, { t: 'apply', s: 'weak', v: 2 }] }, quote: '좀 식혀. 열 받은 거 다 보여.' },
    m_chain:    { name: '연쇄 번개', cls: 'magic', type: 'attack', rarity: 'common', cost: 1, hero: 'sion',
                  effects: [{ t: 'dmgRandom', v: 3, hits: 3 }], up: { effects: [{ t: 'dmgRandom', v: 3, hits: 4 }] }, quote: '찌릿찌릿~ 어디로 튈지 나도 몰라!' },
    m_barrier:  { name: '빛의 장막', cls: 'magic', type: 'skill', rarity: 'common', cost: 2, hero: 'elena',
                  effects: [{ t: 'block', v: 12 }], up: { effects: [{ t: 'block', v: 16 }] }, quote: '빛이 당신을 지켜 줄 거예요.' },
    m_wisdom:   { name: '마도서 펼치기', cls: 'magic', type: 'skill', rarity: 'common', cost: 1, hero: 'luna',
                  effects: [{ t: 'draw', v: 3 }], up: { effects: [{ t: 'draw', v: 4 }] }, quote: '답은 다 책에 있어.' },
    m_heal:     { name: '치유의 기도', cls: 'magic', type: 'skill', rarity: 'uncommon', cost: 1, hero: 'elena', exhaust: true,
                  effects: [{ t: 'heal', v: 5 }, { t: 'block', v: 5 }], up: { effects: [{ t: 'heal', v: 8 }, { t: 'block', v: 7 }] }, quote: '아픈 곳, 여기죠? 금방 나아요.' },
    m_brew:     { name: '즉석 조합', cls: 'magic', type: 'skill', rarity: 'uncommon', cost: 0, hero: 'pio', exhaust: true,
                  effects: [{ t: 'energy', v: 1 }, { t: 'draw', v: 1 }], up: { effects: [{ t: 'energy', v: 1 }, { t: 'draw', v: 2 }] }, quote: '이거랑 이거 섞으면… 아마 괜찮을걸?' },
    m_acid:     { name: '산성 플라스크', cls: 'magic', type: 'skill', rarity: 'uncommon', cost: 1, hero: 'pio',
                  effects: [{ t: 'applyAll', s: 'weak', v: 1 }, { t: 'applyAll', s: 'vuln', v: 1 }], up: { effects: [{ t: 'applyAll', s: 'weak', v: 2 }, { t: 'applyAll', s: 'vuln', v: 2 }] }, quote: '냄새는 좀 참아 줘.' },
    m_overload: { name: '마력 폭주', cls: 'magic', type: 'attack', rarity: 'uncommon', cost: 0, hero: 'luna',
                  effects: [{ t: 'dmg', v: 10 }, { t: 'add', id: 'burn', n: 1, to: 'discard' }], up: { effects: [{ t: 'dmg', v: 14 }, { t: 'add', id: 'burn', n: 1, to: 'discard' }] }, quote: '어, 이거 좀 많이 나갔는데?' },
    m_mirror:   { name: '거울 결계', cls: 'magic', type: 'power', rarity: 'uncommon', cost: 1, hero: 'elena',
                  effects: [{ t: 'self', s: 'thorns', v: 3 }], up: { effects: [{ t: 'self', s: 'thorns', v: 5 }] }, quote: '때린 만큼 돌려받는 거예요.' },
    m_mana:     { name: '마나 순환', cls: 'magic', type: 'power', rarity: 'uncommon', cost: 1, hero: 'luna',
                  effects: [{ t: 'self', s: 'drawUp', v: 1 }], up: { cost: 0 }, quote: '숨 쉬듯이 마나를 돌리는 거야.' },
    m_spirit:   { name: '정령 계약', cls: 'magic', type: 'power', rarity: 'rare', cost: 2, hero: 'sion',
                  effects: [{ t: 'self', s: 'energyUp', v: 1 }], up: { cost: 1 }, quote: '바람아, 조금만 도와줘!' },
    m_storm:    { name: '별빛 폭풍', cls: 'magic', type: 'attack', rarity: 'rare', cost: 3, hero: 'luna',
                  effects: [{ t: 'dmgAll', v: 20 }], up: { effects: [{ t: 'dmgAll', v: 27 }] }, quote: '오늘 밤하늘, 전부 너희한테 줄게.' },

    // ── 유키(닌자) 시작 카드
    n_slash:    { name: '쿠나이 베기', cls: 'ninja', type: 'attack', rarity: 'starter', cost: 1, hero: 'yuki',
                  effects: [{ t: 'dmg', v: 6 }], up: { effects: [{ t: 'dmg', v: 9 }] }, quote: '…끝.' },
    n_dodge:    { name: '그림자 회피', cls: 'ninja', type: 'skill', rarity: 'starter', cost: 1, hero: 'yuki',
                  effects: [{ t: 'block', v: 5 }], up: { effects: [{ t: 'block', v: 8 }] }, quote: '거기 없어.' },
    n_venom:    { name: '독침', cls: 'ninja', type: 'skill', rarity: 'starter', cost: 1, hero: 'yuki',
                  effects: [{ t: 'apply', s: 'poison', v: 5 }], up: { effects: [{ t: 'apply', s: 'poison', v: 7 }] }, quote: '따끔했지? 이제부터야.' },
    // ── 닌자 계열
    n_blades:   { name: '표창 난무', cls: 'ninja', type: 'skill', rarity: 'common', cost: 1, hero: 'yuki',
                  effects: [{ t: 'add', id: 'shiv', n: 3, to: 'hand' }], up: { effects: [{ t: 'add', id: 'shiv', n: 4, to: 'hand' }] }, quote: '셋. 아니, 넷까지 갈까.' },
    n_aim:      { name: '조준 사격', cls: 'ninja', type: 'attack', rarity: 'common', cost: 1, hero: 'mir',
                  effects: [{ t: 'dmg', v: 7 }, { t: 'draw', v: 1 }], up: { effects: [{ t: 'dmg', v: 10 }, { t: 'draw', v: 1 }] }, quote: '바람 계산 끝. 쏜다.' },
    n_rain:     { name: '화살비', cls: 'ninja', type: 'attack', rarity: 'common', cost: 1, hero: 'mir',
                  effects: [{ t: 'dmgAll', v: 4, hits: 2 }], up: { effects: [{ t: 'dmgAll', v: 6, hits: 2 }] }, quote: '우산 챙겼어? 없으면 아플 거야.' },
    n_poisonblade:{ name: '독 칼날', cls: 'ninja', type: 'attack', rarity: 'common', cost: 1, hero: 'bell',
                  effects: [{ t: 'dmg', v: 5 }, { t: 'apply', s: 'poison', v: 3 }], up: { effects: [{ t: 'dmg', v: 7 }, { t: 'apply', s: 'poison', v: 4 }] }, quote: '살짝 스치기만 해도 돼~' },
    n_backflip: { name: '공중제비', cls: 'ninja', type: 'skill', rarity: 'common', cost: 1, hero: 'daon',
                  effects: [{ t: 'block', v: 5 }, { t: 'draw', v: 2 }], up: { effects: [{ t: 'block', v: 8 }, { t: 'draw', v: 2 }] }, quote: '한 바퀴 돌고, 착지!' },
    n_cloud:    { name: '독안개', cls: 'ninja', type: 'skill', rarity: 'uncommon', cost: 2, hero: 'bell',
                  effects: [{ t: 'applyAll', s: 'poison', v: 6 }], up: { effects: [{ t: 'applyAll', s: 'poison', v: 9 }] }, quote: '숨 참는 거 잘해? 난 잘하는데.' },
    n_catalyst: { name: '맹독 촉진', cls: 'ninja', type: 'skill', rarity: 'uncommon', cost: 1, hero: 'bell', exhaust: true,
                  effects: [{ t: 'multiplyPoison', v: 2 }], up: { effects: [{ t: 'multiplyPoison', v: 3 }] }, quote: '조금 더 진하게 해 볼까?' },
    n_flurry:   { name: '난무', cls: 'ninja', type: 'attack', rarity: 'uncommon', cost: 2, hero: 'yuki',
                  effects: [{ t: 'dmg', v: 3, hits: 5 }], up: { effects: [{ t: 'dmg', v: 4, hits: 5 }] }, quote: '눈으로 따라올 수 있으면 해 봐.' },
    n_footwork: { name: '무희의 스텝', cls: 'ninja', type: 'power', rarity: 'uncommon', cost: 1, hero: 'daon',
                  effects: [{ t: 'self', s: 'dex', v: 2 }], up: { effects: [{ t: 'self', s: 'dex', v: 3 }] }, quote: '스텝이 꼬이면 지는 거야.' },
    n_afterimage:{ name: '잔상', cls: 'ninja', type: 'power', rarity: 'rare', cost: 1, hero: 'yuki',
                  effects: [{ t: 'self', s: 'afterImage', v: 1 }], up: { cost: 0 }, quote: '지금 본 건 내가 아니야.' },
    n_envenom:  { name: '맹독 바르기', cls: 'ninja', type: 'power', rarity: 'rare', cost: 2, hero: 'bell',
                  effects: [{ t: 'self', s: 'envenom', v: 1 }], up: { cost: 1 }, quote: '칼날마다 정성껏 발라 뒀지.' },
    n_finisher: { name: '그림자 처형', cls: 'ninja', type: 'attack', rarity: 'rare', cost: 1, hero: 'yuki',
                  effects: [{ t: 'dmg', v: 6, hitsFrom: 'atk' }], up: { effects: [{ t: 'dmg', v: 8, hitsFrom: 'atk' }] }, quote: '연습은 끝났어. 이게 본편.' },

    // ── 공용
    x_song:     { name: '응원가', cls: 'neutral', type: 'skill', rarity: 'uncommon', cost: 1, hero: 'lyra', exhaust: true,
                  effects: [{ t: 'self', s: 'str', v: 1 }, { t: 'self', s: 'dex', v: 1 }], up: { cost: 0 }, quote: '힘내라~ 우리 원정대! 라라라~' },
    x_bandage:  { name: '응급 처치', cls: 'neutral', type: 'skill', rarity: 'common', cost: 0, hero: 'elena', exhaust: true,
                  effects: [{ t: 'heal', v: 4 }], up: { effects: [{ t: 'heal', v: 6 }] }, quote: '움직이지 마요. 금방 끝나요.' },
    x_entrance: { name: '극적인 등장', cls: 'neutral', type: 'attack', rarity: 'uncommon', cost: 2, hero: 'daon', exhaust: true, innate: true,
                  effects: [{ t: 'dmgAll', v: 12 }], up: { effects: [{ t: 'dmgAll', v: 16 }] }, quote: '조명! 음악! 그리고… 나!' },
    x_trip:     { name: '발 걸기', cls: 'neutral', type: 'skill', rarity: 'common', cost: 0, hero: 'bell',
                  effects: [{ t: 'apply', s: 'vuln', v: 2 }], up: { effects: [{ t: 'applyAll', s: 'vuln', v: 2 }] }, quote: '어머, 거기 턱 있었는데.' },
    x_lullaby:  { name: '자장가', cls: 'neutral', type: 'skill', rarity: 'common', cost: 1, hero: 'lyra',
                  effects: [{ t: 'applyAll', s: 'weak', v: 1 }, { t: 'block', v: 4 }], up: { effects: [{ t: 'applyAll', s: 'weak', v: 2 }, { t: 'block', v: 6 }] }, quote: '자, 눈 감고… 힘 빼고…' },

    // ── 토큰 / 상태 카드 (보상에 안 나옴)
    shiv:       { name: '표창', cls: 'token', type: 'attack', rarity: 'special', cost: 0, hero: 'yuki', exhaust: true,
                  effects: [{ t: 'dmg', v: 4 }], up: { effects: [{ t: 'dmg', v: 6 }] }, quote: '휙.' },
    burn:       { name: '화상', cls: 'status', type: 'status', rarity: 'special', cost: 0, unplayable: true, hero: null,
                  effects: [], endTurnInHand: 2, text: '사용 불가. 턴 종료 시 손에 있으면 체력 2를 잃어.', quote: '앗 뜨거…' },
    daze:       { name: '현기증', cls: 'status', type: 'status', rarity: 'special', cost: 0, unplayable: true, ethereal: true, hero: null,
                  effects: [], text: '사용 불가.', quote: '세상이 빙글빙글…' },
    wound:      { name: '상처', cls: 'status', type: 'status', rarity: 'special', cost: 0, unplayable: true, hero: null,
                  effects: [], text: '사용 불가.', quote: '욱신거려.' }
  };

  // ───────── 시작 히로인(플레이어블) ─────────
  const STARTERS = {
    sera: { hero: 'sera', title: '붉은 검의 세라', cls: 'sword', hp: 74, gold: 99, relic: 'red_ribbon',
            deck: ['s_strike', 's_strike', 's_strike', 's_strike', 's_strike', 's_guard', 's_guard', 's_guard', 's_guard', 's_bash'],
            pitch: '튼튼하고 단순한 정면 승부. 힘을 쌓아 크게 벤다.', line: '길 막으면 벤다. 안 막으면… 그래도 갈 거야.' },
    luna: { hero: 'luna', title: '별을 읽는 루나', cls: 'magic', hp: 75, gold: 99, relic: 'moon_pendant',
            deck: ['m_bolt', 'm_bolt', 'm_bolt', 'm_bolt', 'm_ward', 'm_ward', 'm_ward', 'm_ward', 'm_meteor', 'm_focus'],
            pitch: '범위 마법과 드로우. 적이 많을수록 신난다.', line: '계산은 끝났어. 이제 예쁘게 터뜨리기만 하면 돼.' },
    yuki: { hero: 'yuki', title: '그림자 걷는 유키', cls: 'ninja', hp: 70, gold: 99, relic: 'shadow_hood',
            deck: ['n_slash', 'n_slash', 'n_slash', 'n_slash', 'n_slash', 'n_dodge', 'n_dodge', 'n_dodge', 'n_dodge', 'n_venom'],
            pitch: '표창과 독으로 천천히, 확실하게. 손이 바쁜 타입.', line: '…시끄러운 건 싫어. 조용히 끝낼게.' }
  };

  // ───────── 적 ─────────
  // hp: [최소, 최대], start: 시작 상태, moves: 행동, ai: 행동 패턴
  // move: name, dmg, hits, block, blockAll, selfSt{}, playerSt{}, addCards[{id,n,to}], heal, summon[], say
  // ai: { type:'random', w:{move:가중치}, maxRun:{move:연속최대}, first } | { type:'cycle', order:[...], first }
  // phases(보스): [{ ai }, { at: 0.5, enter:{ say, clearDebuffs, st:{}, block }, ai }]
  const ENEMIES = {
    slime: { name: '말랑 슬라임', kind: 'monster', hp: [12, 15], colors: ['#8ff0b0', '#2c8a5b'], glyph: '💧',
             desc: '말랑말랑. 생각보다 세게 부딪힌다.',
             moves: { tackle: { name: '몸통박치기', dmg: 5 }, spit: { name: '끈적 점액', dmg: 3, playerSt: { weak: 1 } } },
             ai: { type: 'random', w: { tackle: 6, spit: 4 }, maxRun: { tackle: 2, spit: 1 } } },
    bat:   { name: '흡혈 박쥐', kind: 'monster', hp: [7, 9], colors: ['#9b6bd6', '#2a1840'], glyph: '🦇',
             desc: '여왕의 심부름꾼. 물면 조금 회복한다.',
             moves: { bite: { name: '흡혈', dmg: 3, heal: 2 }, screech: { name: '초음파', playerSt: { weak: 1 } } },
             ai: { type: 'random', w: { bite: 7, screech: 3 }, maxRun: { bite: 2, screech: 1 } } },
    mia:   { name: '견습 마녀 미아', kind: 'rival', hp: [28, 32], colors: ['#b48cff', '#3b2370'], glyph: '미', age: 21,
             desc: '마탑 시험에서 루나에게 진 뒤로 이를 갈고 있다.',
             moves: { curse: { name: '저주 걸기', playerSt: { vuln: 2 }, say: '에헤헤, 실험 대상 발견~' },
                      bolt: { name: '마력탄', dmg: 9 },
                      spark: { name: '불꽃 장난', dmg: 5, addCards: [{ id: 'burn', n: 1, to: 'discard' }] } },
             ai: { type: 'random', first: 'curse', w: { bolt: 5, spark: 3, curse: 2 }, maxRun: { bolt: 2, spark: 1, curse: 1 } } },
    karin: { name: '산적 두목 카린', kind: 'rival', hp: [40, 44], colors: ['#e0a96d', '#5c3a1a'], glyph: '카', age: 27,
             desc: '산길을 꽉 잡고 있는 산적단 두목. 의외로 의리파.',
             moves: { slash: { name: '휘두르기', dmg: 12 },
                      jab: { name: '연속 찌르기', dmg: 5, hits: 2 },
                      threat: { name: '으름장', block: 6, selfSt: { str: 2 }, say: '그 지갑, 두고 가. 좋은 말로 할 때.' } },
             ai: { type: 'random', w: { slash: 4, jab: 4, threat: 2 }, maxRun: { slash: 2, jab: 2, threat: 1 } } },
    rosa:  { name: '가시덩굴 정령 로사', kind: 'rival', hp: [36, 40], colors: ['#7bd36b', '#7a1f3d'], glyph: '로', age: 25,
             desc: '장미 정원의 정령. 함부로 만지면 찔린다.', start: { thorns: 3 },
             moves: { whip: { name: '덩굴 채찍', dmg: 7 },
                      sting: { name: '독 가시', dmg: 4, playerSt: { poison: 3 } },
                      bloom: { name: '광합성', block: 9, selfSt: { str: 1 }, say: '햇볕 좋다~ 너도 좀 쬐고 갈래?' } },
             ai: { type: 'random', w: { whip: 4, sting: 3, bloom: 3 }, maxRun: { whip: 2, sting: 1, bloom: 1 } } },
    knox:  { name: '해골 기사 녹스', kind: 'monster', hp: [46, 50], colors: ['#d8d8d8', '#3c3f4a'], glyph: '💀',
             desc: '여왕의 성문을 지키던 기사. 지금도 근무 중이다.',
             moves: { raise: { name: '방패 세우기', block: 10, dmg: 5 },
                      smash: { name: '대검 일격', dmg: 14 } },
             ai: { type: 'cycle', order: ['raise', 'smash', 'smash'] } },
    veronica: { name: '사냥꾼 베로니카', kind: 'rival', hp: [44, 48], colors: ['#c0a080', '#2f3b2a'], glyph: '베', age: 29,
             desc: '현상금 사냥꾼. 시간을 끌수록 조준이 정확해진다.',
             moves: { ready: { name: '사냥 준비', selfSt: { ritual: 2 }, say: '도망쳐도 돼. 그게 더 재밌거든.' },
                      shot: { name: '석궁 사격', dmg: 6 } },
             ai: { type: 'cycle', first: 'ready', order: ['shot'] } },
    // ── 엘리트
    isabel: { name: '흑장미 결투가 이자벨', kind: 'elite', hp: [84, 88], colors: ['#ff4f81', '#1a0b14'], glyph: '이', age: 26,
             desc: '결투만 아흔아홉 번 이긴 검사. 방패 뒤에 숨는 걸 싫어한다.',
             moves: { duel: { name: '결투 신청', selfSt: { enrage: 1 }, say: '정정당당하게 하자. 방패 뒤에 숨는 건 실례야.' },
                      thrust: { name: '장미 찌르기', dmg: 14 },
                      flurry: { name: '꽃잎 연격', dmg: 6, hits: 2, playerSt: { vuln: 1 } },
                      parry: { name: '우아한 받아치기', block: 10, dmg: 7 } },
             ai: { type: 'random', first: 'duel', w: { thrust: 4, flurry: 4, parry: 2 }, maxRun: { thrust: 2, flurry: 1, parry: 1 } } },
    rena:  { name: '쌍둥이 암살자 레나', kind: 'elite', hp: [36, 40], colors: ['#5ad1ff', '#101c33'], glyph: '레', age: 24,
             desc: '언니. 웃으면서 찌른다.',
             moves: { dagger: { name: '독 단검', dmg: 5, playerSt: { poison: 2 } },
                      ambush: { name: '기습', dmg: 11, say: '뒤, 조심했어야지.' } },
             ai: { type: 'random', first: 'dagger', w: { dagger: 5, ambush: 5 }, maxRun: { dagger: 2, ambush: 1 } } },
    rina:  { name: '쌍둥이 암살자 리나', kind: 'elite', hp: [36, 40], colors: ['#ff8ad8', '#2a1033'], glyph: '리', age: 24,
             desc: '동생. 언니 말이라면 뭐든 한다.',
             moves: { hex: { name: '약화 표창', dmg: 4, playerSt: { weak: 2 }, say: '언니, 이번엔 내가 먼저!' },
                      veil: { name: '그림자 장막', blockAll: 7 },
                      combo: { name: '연타', dmg: 4, hits: 2 } },
             ai: { type: 'random', first: 'hex', w: { veil: 3, combo: 4, hex: 3 }, maxRun: { veil: 1, combo: 2, hex: 1 } } },
    // ── 보스
    belita: { name: '밤의 여왕 벨리타', kind: 'boss', boss: true, hp: [210, 210], colors: ['#ff2e4d', '#14040c'], glyph: '벨', age: 29,
             desc: '달 없는 성의 주인. 우아하고 오만하며, 무엇보다 지루한 걸 못 참는다.',
             intro: '어머, 이렇게 늦은 밤에 손님이라니. 날 지루하게 하지는 마.',
             death: '…재밌었어. 정말, 오랜만에.',
             moves: { kiss: { name: '피의 입맞춤', dmg: 12, heal: 6 },
                      summon: { name: '박쥐 소환', summon: ['bat', 'bat'], block: 8, say: '얘들아, 손님 오셨다.' },
                      gaze: { name: '매혹의 시선', playerSt: { weak: 2 }, addCards: [{ id: 'daze', n: 2, to: 'discard' }], say: '내 눈 보지 마. …아니, 봐.' },
                      fang: { name: '붉은 송곳니', dmg: 7, hits: 2 },
                      storm: { name: '피의 폭풍', dmg: 4, hits: 4 },
                      veil: { name: '핏빛 장막', block: 15, selfSt: { str: 2 }, say: '버텨 봐. 다음 건 아플 거야.' },
                      night: { name: '영원한 밤', dmg: 22 } },
             phases: [
               { ai: { type: 'cycle', order: ['kiss', 'summon', 'gaze', 'fang'] } },
               { at: 0.5, enter: { say: '…드레스에 피가 묻었잖아. 좋아, 이제 좀 진지해져 볼까.', clearDebuffs: true, st: { str: 2 } },
                 ai: { type: 'cycle', order: ['storm', 'veil', 'night'] } }
             ] }
  };

  const ENCOUNTERS = {
    easy:   [['slime', 'slime'], ['mia'], ['bat', 'bat', 'bat']],
    normal: [['karin'], ['rosa'], ['knox'], ['veronica'], ['mia', 'slime'], ['slime', 'slime', 'bat']],
    elite:  [['isabel'], ['rena', 'rina']],
    boss:   [['belita']]
  };

  // ───────── 유물 ─────────
  // 훅 이름은 engine.js에서 relic id로 직접 처리합니다(검색: hasRelic).
  const RELICS = {
    red_ribbon:   { name: '붉은 머리끈', icon: '🎀', starter: true, desc: '전투에서 이기면 체력을 5 회복해.' },
    moon_pendant: { name: '달의 펜던트', icon: '🌙', starter: true, desc: '매 전투 첫 턴에 에너지를 1 더 얻어.' },
    shadow_hood:  { name: '그림자 두건', icon: '🥷', starter: true, desc: '전투 시작 시 표창 2장을 손에 넣어.' },
    guard_charm:  { name: '수호의 부적', icon: '🧿', desc: '전투 시작 시 방어도를 10 얻어.' },
    dragon_heart: { name: '용의 심장', icon: '❤️‍🔥', desc: '전투 시작 시 힘을 1 얻어.' },
    viper_fang:   { name: '독사의 송곳니', icon: '🐍', desc: '전투 시작 시 모든 적에게 취약 1.' },
    firefly:      { name: '반딧불 등불', icon: '🏮', desc: '전투 첫 턴에 카드를 2장 더 뽑아.' },
    iron_brooch:  { name: '철의 브로치', icon: '📿', desc: '턴 종료 시 방어도가 0이면 방어도 6을 얻어.' },
    teacup:       { name: '회복의 찻잔', icon: '🍵', desc: '휴식할 때 체력을 15 더 회복해.' },
    lucky_coin:   { name: '행운의 동전', icon: '🪙', desc: '상점 가격이 20% 싸져.' },
    blood_rose:   { name: '피의 장미', icon: '🌹', desc: '얻을 때 최대 체력 +10, 체력 10 회복.' },
    glowstick:    { name: '응원봉', icon: '🪄', desc: '전투 시작 시 활력 8 (첫 공격 카드 피해 +8).' },
    dancer_fan:   { name: '무희의 부채', icon: '🪭', desc: '한 턴에 공격 카드를 3장 낼 때마다 방어도 4.' },
    sun_pin:      { name: '해바라기 머리핀', icon: '🌻', desc: '3턴마다 에너지를 1 더 얻어.' }
  };

  // ───────── 물약 ─────────
  const POTIONS = {
    heal_p:   { name: '회복 물약', icon: '🧪', anywhere: true, desc: '체력을 20 회복해.', effects: [{ t: 'heal', v: 20 }] },
    str_p:    { name: '힘의 물약', icon: '💪', desc: '힘을 2 얻어.', effects: [{ t: 'self', s: 'str', v: 2 }] },
    fire_p:   { name: '화염병', icon: '🔥', target: true, desc: '적 하나에게 피해 20.', effects: [{ t: 'rawDmg', v: 20 }] },
    block_p:  { name: '방패 물약', icon: '🛡️', desc: '방어도를 12 얻어.', effects: [{ t: 'rawBlock', v: 12 }] },
    energy_p: { name: '에너지 물약', icon: '⚡', desc: '에너지를 2 얻어.', effects: [{ t: 'energy', v: 2 }] },
    poison_p: { name: '독병', icon: '☠️', target: true, desc: '적 하나에게 중독 7.', effects: [{ t: 'apply', s: 'poison', v: 7 }] }
  };

  // ───────── 이벤트 ─────────
  // option.fx: hp, maxHp, heal, gold, relic('random'), card(id|'rare'), potion('random'), upgrade, remove, upgradeRandom
  // option.chance: { p, win:{fx,text}, lose:{fx,text} }, option.need: { gold }
  const EVENTS = {
    spring: { title: '달빛 샘', hero: 'sion',
      text: '숲 한가운데, 달빛이 고인 샘이 있어. 시엘이 쪼그려 앉아 물을 들여다보고 있어.\n"이거 마시면 힘이 난대! …아마도? 근데 좀 차가워 보이긴 해."',
      options: [
        { label: '한 모금만 마신다', hint: '체력 15 회복', fx: { heal: 15 }, text: '시원한 물이 목을 타고 내려가. 몸이 한결 가벼워졌어.' },
        { label: '벌컥벌컥 들이켠다', hint: '최대 체력 +8, 체력 -8', fx: { maxHp: 8, hp: -8 }, text: '으슬으슬 떨리더니, 몸 깊은 곳이 단단해지는 느낌이야.' },
        { label: '수면에 얼굴을 비춰 본다', hint: '카드 1장 강화', fx: { upgrade: 1 }, text: '물에 비친 내 모습이 조금 더 자신 있어 보여.' }
      ] },
    bard: { title: '떠돌이 음유시인', hero: 'lyra',
      text: '모닥불 옆에서 리라가 류트를 튕기고 있어.\n"어, 원정대 맞지? 50골드면 너희 노래 하나 만들어 줄게. 진짜 멋지게!"',
      options: [
        { label: '노래를 의뢰한다', hint: '50골드 → 무작위 유물', need: { gold: 50 }, fx: { gold: -50, relic: 'random' }, text: '"자, 이건 덤이야!" 리라가 노래와 함께 작은 선물을 건네줘.' },
        { label: '같이 부른다', hint: '카드 「응원가」 획득', fx: { card: 'x_song' }, text: '목청껏 같이 불렀더니 리라가 깔깔 웃었어. "너 은근 소질 있다?"' },
        { label: '조용히 듣고 간다', hint: '체력 6 회복', fx: { heal: 6 }, text: '노랫소리를 들으며 잠깐 눈을 붙였어. 개운하다.' }
      ] },
    armory: { title: '버려진 무기고', hero: 'kaira',
      text: '무너진 성채 지하에서 무기고를 찾았어. 카이라가 창끝으로 먼지 쌓인 상자를 툭툭 건드려.\n"쓸 만한 게 있을 것 같긴 한데… 함정 냄새도 나."',
      options: [
        { label: '상자를 뒤진다', hint: '60%: 희귀 카드 / 40%: 체력 -10', chance: { p: 0.6,
            win: { fx: { card: 'rare' }, text: '먼지 밑에서 반짝이는 걸 찾았어! 좋은 물건이야.' },
            lose: { fx: { hp: -10 }, text: '찰칵. 바늘이 튀어나왔어. 아야야…' } } },
        { label: '녹슨 무기를 정리한다', hint: '덱에서 카드 1장 제거, 체력 -5', fx: { remove: 1, hp: -5 }, text: '손을 좀 베였지만, 짐이 가벼워졌어.' },
        { label: '그냥 지나간다', hint: '아무 일도 없음', fx: {}, text: '괜히 건드렸다가 다치면 손해지.' }
      ] },
    fortune: { title: '점술가의 천막', hero: 'bell',
      text: '보랏빛 천막 안에서 벨이 수정구를 굴리고 있어.\n"운세 보고 가. 싸게 해 줄게. 30골드. …진짜 싸게 해 준 거야."',
      options: [
        { label: '점을 본다', hint: '30골드 → 물약 1개 + 무작위 카드 1장 강화', need: { gold: 30 }, fx: { gold: -30, potion: 'random', upgradeRandom: 1 }, text: '"오늘 운세는… 대길! 이거 들고 가." 벨이 윙크했어.' },
        { label: '수정구를 슬쩍 만져 본다', hint: '50%: 75골드 / 50%: 체력 -7', chance: { p: 0.5,
            win: { fx: { gold: 75 }, text: '수정구에서 금화가 우르르 쏟아졌어. 벨 표정이 굳었어.' },
            lose: { fx: { hp: -7 }, text: '찌릿! 손끝이 저려. "그러게 내가 만지지 말랬지~"' } } },
        { label: '정중히 거절한다', hint: '아무 일도 없음', fx: {}, text: '"쳇, 다음엔 꼭 보고 가."' }
      ] }
  };

  // ───────── 이미지 연결 ─────────
  // 키: 히로인 id(sera 등), 적 id(belita 등), 또는 'card:카드id'(특정 카드 전용 일러스트)
  // 값: 이미지 경로(index.html 기준) 또는 data URI
  // 예) ART.sera = 'img/sera.webp';  ART['card:s_heavy'] = 'img/cards/s_heavy.webp';
  const ART = {};

  const DATA = { HEROINES, STATUS, CARDS, STARTERS, ENEMIES, ENCOUNTERS, RELICS, POTIONS, EVENTS, ART,
    TITLE: '미녀 덱: 밤의 여왕', VERSION: '0.1.0' };
  root.BD_DATA = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
