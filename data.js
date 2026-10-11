/* 미녀 덱: 밤의 여왕 — 게임 데이터 (v1.0)
 * 카드, 히로인, 적, 유물, 물약, 이벤트, 업적, 갤러리를 모두 여기서 정의합니다.
 * 엔진(engine.js)은 이 데이터만 읽어서 동작합니다. 모든 캐릭터는 성인(20대 이상) 설정입니다.
 */
(function (root) {
  'use strict';

  // ───────── 히로인(카드 일러스트 주인공) ─────────
  // look: 일러스트 프롬프트용 외형(같은 히로인은 모든 카드에서 같은 얼굴/의상)
  const HEROINES = {
    sera:  { name: '세라',   job: '검사',     age: 24, colors: ['#ff5f6d', '#8e1b3a'], bio: '붉은 머리끈을 질끈 묶은 떠돌이 검사. 말보다 칼이 먼저 나가는 타입.',
             look: 'crimson red long hair in a high ponytail with a red ribbon, amber eyes, confident smirk, red and black fantasy swordswoman coat with silver pauldron, longsword' },
    luna:  { name: '루나',   job: '마법사',   age: 22, colors: ['#8e7bff', '#2b2269'], bio: '마탑 최연소 수석 졸업생. 잠이 많고, 계산은 정확하다.',
             look: 'silver lavender wavy hair with a crescent moon hairpin, violet eyes, sleepy gentle smile, deep purple star-embroidered mage robe with gold trim, wooden staff with a star crystal' },
    yuki:  { name: '유키',   job: '닌자',     age: 23, colors: ['#3fd1c0', '#123a4a'], bio: '말수가 적은 그림자 무사. 표창 솜씨만큼은 업계 최고.',
             look: 'short black bob hair with teal inner color, cool teal eyes, calm expression, sleek dark navy kunoichi outfit with teal scarf and armored sleeves, kunai' },
    aria:  { name: '아리아', job: '성기사',   age: 27, colors: ['#ffd36e', '#a5741b'], bio: '성기사단 부단장. 방패 하나로 마을 하나를 지켜낸 적이 있다.',
             look: 'golden blonde hair in a braided crown, blue eyes, warm determined smile, white and gold paladin plate armor with blue cape, large round holy shield' },
    kaira: { name: '카이라', job: '창술사',   age: 28, colors: ['#ff9a3c', '#7a3010'], bio: '사막 출신 용병. 시원시원한 성격에 창끝은 더 시원하다.',
             look: 'tan skin, wild orange hair, green eyes, bold grin, desert mercenary leather armor with orange sash and gold bangles, long spear' },
    sion:  { name: '시엘',   job: '정령사',   age: 21, colors: ['#7fe3ff', '#1b5a8a'], bio: '바람 정령과 계약한 정령사. 호기심이 많아 늘 사고를 친다.',
             look: 'light sky-blue twin tails, curious cyan eyes, cheerful face, flowing white and sky-blue spirit caller dress with feather accessories, small wind spirits around her' },
    elena: { name: '엘레나', job: '사제',     age: 26, colors: ['#f4f1ff', '#8aa0d8'], bio: '조용한 미소의 사제. 화나면 제일 무섭다는 소문이 있다.',
             look: 'long straight platinum white hair, soft grey eyes, serene smile, elegant white and pale-blue priestess vestments with a silver halo ornament, prayer book' },
    pio:   { name: '피오',   job: '연금술사', age: 25, colors: ['#c6f06a', '#4b6b12'], bio: '폭발은 예술이라고 믿는 연금술사. 앞머리가 자주 그을린다.',
             look: 'messy lime-green short hair with goggles on head, yellow eyes, mischievous grin, olive alchemist coat with many potion vials on a belt' },
    mir:   { name: '미르',   job: '궁수',     age: 25, colors: ['#7ddc8a', '#1f5b33'], bio: '숲의 궁수. 백 걸음 밖 사과도 꿰뚫는다.',
             look: 'long dark green hair with leaf hair ornaments, emerald eyes, focused look, forest ranger outfit with green cloak and leather bracers, elegant longbow' },
    bell:  { name: '벨',     job: '도적',     age: 24, colors: ['#c27bff', '#3a1458'], bio: '독과 자물쇠의 달인. 웃는 얼굴로 지갑을 털어 간다.',
             look: 'purple side-swept hair with one braid, magenta eyes, playful wink, stylish violet rogue outfit with short cape, belts and twin daggers' },
    daon:  { name: '다온',   job: '무희',     age: 23, colors: ['#ff8fc8', '#7a2152'], bio: '칼춤을 추는 무희. 무대든 전장이든 스텝은 같다고.',
             look: 'pink hair in a high bun with flowing ribbons, rose eyes, graceful smile, elegant pink and gold sword-dancer costume with long sleeves and silk scarves, twin fans' },
    lyra:  { name: '리라',   job: '음유시인', age: 22, colors: ['#ffb38a', '#8a3c5c'], bio: '원정대 소식을 노래로 퍼뜨리는 음유시인. 응원 담당.',
             look: 'peach-orange wavy hair with a feathered beret, warm brown eyes, bright smile, cozy bard outfit with coral vest and cape, lute' }
  };

  // ───────── 상태 효과 ─────────
  const STATUS = {
    str:       { name: '힘',     icon: '💪', type: 'buff',   desc: v => `공격 피해가 ${v} 증가해.` },
    dex:       { name: '민첩',   icon: '🍃', type: 'buff',   desc: v => `카드로 얻는 방어도가 ${v} 증가해.` },
    weak:      { name: '약화',   icon: '🥀', type: 'debuff', turns: true, desc: v => `주는 공격 피해가 25% 줄어. (${v}턴)` },
    vuln:      { name: '취약',   icon: '💔', type: 'debuff', turns: true, desc: v => `받는 공격 피해가 50% 늘어. (${v}턴)` },
    poison:    { name: '중독',   icon: '☠️', type: 'debuff', desc: v => `턴 시작 시 체력을 ${v} 잃고, 수치가 1 줄어.` },
    thorns:    { name: '가시',   icon: '🌹', type: 'buff',   desc: v => `공격받을 때마다 공격자에게 피해 ${v}.` },
    regen:     { name: '재생',   icon: '🌿', type: 'buff',   desc: v => `턴 종료 시 체력 ${v} 회복, 수치가 1 줄어.` },
    ritual:    { name: '각성',   icon: '🔥', type: 'buff',   desc: v => `턴 시작 시 힘을 ${v} 얻어.`, power: true },
    metal:     { name: '철벽',   icon: '🛡️', type: 'buff',   desc: v => `턴 종료 시 방어도를 ${v} 얻어.`, power: true },
    drawUp:    { name: '마나 순환', icon: '📖', type: 'buff', desc: v => `턴 시작 시 카드를 ${v}장 더 뽑아.`, power: true },
    energyUp:  { name: '정령 계약', icon: '🌬️', type: 'buff', desc: v => `턴 시작 시 에너지를 ${v} 더 얻어.`, power: true },
    envenom:   { name: '맹독',   icon: '🐍', type: 'buff',   desc: v => `공격으로 체력 피해를 줄 때마다 중독 ${v} 부여.`, power: true },
    afterImage:{ name: '잔상',   icon: '👥', type: 'buff',   desc: v => `카드를 낼 때마다 방어도 ${v}.`, power: true },
    barricade: { name: '불굴',   icon: '🏰', type: 'buff',   desc: () => `방어도가 턴이 바뀌어도 사라지지 않아.`, power: true, flag: true },
    arcane:    { name: '마력 공명', icon: '🔮', type: 'buff', desc: v => `스킬 카드를 낼 때마다 무작위 적에게 피해 ${v}.`, power: true },
    toxin:     { name: '독 연구', icon: '🧪', type: 'buff',  desc: v => `중독을 부여할 때 ${v} 더 부여해.`, power: true },
    bladeDance:{ name: '칼날 무희', icon: '🪭', type: 'buff', desc: v => `표창 피해가 ${v} 증가해.`, power: true },
    shivGen:   { name: '무한 표창', icon: '🌀', type: 'buff', desc: v => `턴 시작 시 표창 ${v}장을 손에 넣어.`, power: true },
    trance:    { name: '검무',   icon: '💃', type: 'buff',   desc: v => `공격 카드를 낼 때마다 방어도 ${v}.`, power: true },
    rupture:   { name: '피의 각오', icon: '🩸', type: 'buff', desc: v => `카드 효과로 체력을 잃을 때마다 힘 ${v}.`, power: true },
    sanctuary: { name: '성역',   icon: '⛪', type: 'buff',   desc: v => `턴 시작 시 방어도 ${v}.`, power: true },
    retribution:{ name: '응보',  icon: '⚖️', type: 'buff',   desc: v => `적의 공격을 방어도로 전부 막으면 그 적에게 피해 ${v}.`, power: true },
    grace:     { name: '은총',   icon: '🕊️', type: 'buff',   desc: v => `체력을 회복할 때마다 모든 적에게 피해 ${v}.`, power: true },
    permafrost:{ name: '영구 동토', icon: '❄️', type: 'buff', desc: v => `턴 시작 시 모든 적에게 약화 ${v}.`, power: true },
    pyro:      { name: '연소 촉매', icon: '🌋', type: 'buff', desc: v => `「화상」을 뽑을 때마다 모든 적에게 피해 ${v}.`, power: true },
    blessing:  { name: '성녀의 축복', icon: '😇', type: 'buff', desc: v => `턴 시작 시 체력 ${v} 회복.`, power: true },
    enrage:    { name: '분노',   icon: '😤', type: 'buff',   desc: v => `상대가 스킬 카드를 쓸 때마다 힘을 ${v} 얻어.` },
    vigor:     { name: '활력',   icon: '✨', type: 'buff',   desc: v => `다음 공격 카드의 피해가 ${v} 증가해. (1회)` },
    curl:      { name: '웅크리기', icon: '🐚', type: 'buff', desc: v => `처음 피해를 받으면 방어도 ${v}를 얻어. (1회)` }
  };

  // ───────── 조합(아키타입) ─────────
  const ARCH = {
    str: { name: '힘 축적', icon: '💪' }, guard: { name: '방패·반격', icon: '🛡️' }, multi: { name: '연타', icon: '⚔️' }, blood: { name: '피의 각오', icon: '🩸' },
    spell: { name: '마나 순환', icon: '📖' }, aoe: { name: '광역 마법', icon: '☄️' }, frost: { name: '서리 제어', icon: '❄️' }, burn: { name: '화상 폭주', icon: '🔥' },
    poison: { name: '맹독', icon: '☠️' }, shiv: { name: '표창', icon: '🌀' }, evade: { name: '회피·민첩', icon: '🍃' }, combo: { name: '연계', icon: '🔗' },
    aegis: { name: '수호', icon: '🏰' }, heal: { name: '치유', icon: '🌿' }, judge: { name: '응보', icon: '⚖️' }, smite: { name: '신벌', icon: '✝️' }
  };
  const CLASS_ARCH = { sword: ['str', 'guard', 'multi', 'blood'], magic: ['spell', 'aoe', 'frost', 'burn'], ninja: ['poison', 'shiv', 'evade', 'combo'], holy: ['aegis', 'heal', 'judge', 'smite'] };

  // ───────── 카드 ─────────
  // type: attack | skill | power | status · cls: sword | magic | ninja | holy | neutral | token | status
  // rarity: starter | common | uncommon | rare | legend(업적 해금) | special · cost -1 = X
  // effects: dmg{v,hits,hitsFrom:'atk'|'skill',strMult,bonusIfWeak}, dmgAll{v,hits|'X'}, dmgRandom{v,hits}, dmgBlock, dmgBlockAll,
  //   dmgPoison{m}, dmgAllThorns{m}, block{v}, blockDex{m}, doubleBlock, draw{v}, energy{v}, energyIfAtk{n,v}, apply{s,v}, applyAll{s,v},
  //   self{s,v}, doubleStr, heal{v}, loseHp{v}, add{id,n,to}, upgradeHand{v}, multiplyPoison{v}, exhaustBurns{v}, cleanse
  // up: 강화 시 덮어쓸 값 (모든 수집 카드에 있음) · tags: 조합 · icon: 일러스트가 없을 때 쓰는 문양
  const CARDS = {};
  function C(id, name, cls, type, rarity, cost, hero, tags, icon, effects, up, extra) {
    CARDS[id] = Object.assign({ name, cls, type, rarity, cost, hero, tags, icon, effects, up }, extra || {});
  }
  const dmg = (v, o) => Object.assign({ t: 'dmg', v }, o || {});
  const blk = v => ({ t: 'block', v });
  const self = (s, v) => ({ t: 'self', s, v });
  const app = (s, v) => ({ t: 'apply', s, v });
  const appAll = (s, v) => ({ t: 'applyAll', s, v });
  const draw = v => ({ t: 'draw', v });

  // ── 세라(검사)
  C('s_strike', '베기', 'sword', 'attack', 'starter', 1, 'sera', [], '🗡️', [dmg(6)], { effects: [dmg(9)] }, { quote: '가볍게 한 번!' });
  C('s_guard', '막기', 'sword', 'skill', 'starter', 1, 'sera', [], '🛡️', [blk(5)], { effects: [blk(8)] }, { quote: '그 정도론 안 뚫려.' });
  C('s_bash', '붉은 일섬', 'sword', 'attack', 'starter', 2, 'sera', ['str'], '💥', [dmg(8), app('vuln', 2)], { effects: [dmg(10), app('vuln', 3)] }, { quote: '빈틈, 보였어.' });
  C('s_twin', '쌍검 연격', 'sword', 'attack', 'common', 1, 'sera', ['multi', 'str'], '⚔️', [dmg(5, { hits: 2 })], { effects: [dmg(7, { hits: 2 })] }, { quote: '하나, 둘. 리듬 타는 거야.' });
  C('s_shieldbash', '방패 강타', 'sword', 'attack', 'common', 1, 'aria', ['guard'], '🔰', [{ t: 'dmgBlock' }], { cost: 0 }, { quote: '방패도 무기라는 거, 몰랐어?' });
  C('s_holyshield', '성스러운 방패', 'sword', 'skill', 'common', 1, 'aria', ['guard'], '🛡️', [blk(7)], { effects: [blk(10)] }, { quote: '내 뒤에 있어. 괜찮아.' });
  C('s_sweep', '회전 베기', 'sword', 'attack', 'common', 1, 'kaira', ['multi'], '🌪️', [{ t: 'dmgAll', v: 8 }], { effects: [{ t: 'dmgAll', v: 11 }] }, { quote: '다 같이 덤벼. 그게 편해.' });
  C('s_armaments', '무기 손질', 'sword', 'skill', 'common', 1, 'kaira', ['guard'], '🔧', [blk(5), { t: 'upgradeHand', v: 1 }], { effects: [blk(5), { t: 'upgradeHand', v: 'all' }] }, { quote: '날은 세워 둬야 제맛이지.' });
  C('s_heavyblade', '대검 내려찍기', 'sword', 'attack', 'common', 2, 'sera', ['str'], '🪓', [dmg(14, { strMult: 3 })], { effects: [dmg(14, { strMult: 5 })] }, { quote: '힘은 이렇게 쓰는 거야.' });
  C('s_triple', '세 갈래 베기', 'sword', 'attack', 'common', 1, 'kaira', ['multi'], '🔱', [dmg(4, { hits: 3 })], { effects: [dmg(5, { hits: 3 })] }, { quote: '창끝이 셋으로 보이지?' });
  C('s_bloodoath', '피의 맹세', 'sword', 'skill', 'common', 0, 'sera', ['blood'], '🩸', [{ t: 'loseHp', v: 3 }, { t: 'energy', v: 2 }], { effects: [{ t: 'loseHp', v: 2 }, { t: 'energy', v: 2 }] }, { quote: '조금 아픈 건 괜찮아. 이길 수만 있다면.' });
  C('s_reckless', '무모한 돌진', 'sword', 'attack', 'common', 1, 'kaira', ['blood'], '🐗', [dmg(12), { t: 'loseHp', v: 2 }], { effects: [dmg(16), { t: 'loseHp', v: 2 }] }, { quote: '생각은 달리면서 할게!' });
  C('s_heavy', '혼신의 일격', 'sword', 'attack', 'uncommon', 2, 'sera', ['str'], '☄️', [dmg(18)], { effects: [dmg(24)] }, { quote: '이거 하나에 다 걸었어.' });
  C('s_warcry', '전투의 함성', 'sword', 'skill', 'uncommon', 1, 'kaira', ['str'], '📣', [self('str', 2), draw(1)], { effects: [self('str', 3), draw(1)] }, { exhaust: true, quote: '자, 기합 넣고 간다!' });
  C('s_inflame', '불꽃 검기', 'sword', 'power', 'uncommon', 1, 'sera', ['str'], '🔥', [self('str', 2)], { effects: [self('str', 3)] }, { quote: '칼끝이 뜨거워지는 거 느껴져?' });
  C('s_metal', '철벽 수호', 'sword', 'power', 'uncommon', 1, 'aria', ['guard'], '⛓️', [self('metal', 3)], { effects: [self('metal', 4)] }, { quote: '서 있기만 해도 단단해지는 법이야.' });
  C('s_entrench', '굳건한 자세', 'sword', 'skill', 'uncommon', 2, 'aria', ['guard'], '🧱', [{ t: 'doubleBlock' }], { cost: 1 }, { quote: '한 발도 물러서지 않아.' });
  C('s_trance', '검무 몰입', 'sword', 'power', 'uncommon', 1, 'kaira', ['multi'], '💃', [self('trance', 1)], { effects: [self('trance', 2)] }, { quote: '창이 춤추면, 몸도 따라 춤춰.' });
  C('s_rupture', '피의 각오', 'sword', 'power', 'uncommon', 1, 'sera', ['blood', 'str'], '❤️‍🔥', [self('rupture', 1)], { effects: [self('rupture', 2)] }, { quote: '상처 하나마다 칼이 더 무거워져.' });
  C('s_bloodblade', '혈검', 'sword', 'attack', 'uncommon', 2, 'sera', ['blood'], '🩸', [{ t: 'loseHp', v: 4 }, dmg(22)], { effects: [{ t: 'loseHp', v: 4 }, dmg(29)] }, { quote: '내 피로 벼린 칼날이야.' });
  C('s_counter', '반격 자세', 'sword', 'skill', 'uncommon', 1, 'aria', ['guard'], '🦔', [blk(8), self('thorns', 3)], { effects: [blk(11), self('thorns', 4)] }, { quote: '때려 봐. 후회할걸?' });
  C('s_whirl', '칼날 폭풍', 'sword', 'attack', 'rare', -1, 'kaira', ['multi'], '🌀', [{ t: 'dmgAll', v: 5, hits: 'X' }], { effects: [{ t: 'dmgAll', v: 8, hits: 'X' }] }, { quote: '돌고, 돌고, 또 돌아!' });
  C('s_demon', '검귀의 각성', 'sword', 'power', 'rare', 3, 'sera', ['str'], '👹', [self('ritual', 2)], { cost: 2 }, { quote: '…이제부터 진심이야.' });
  C('s_barricade', '불굴의 성채', 'sword', 'power', 'rare', 3, 'aria', ['guard'], '🏰', [self('barricade', 1)], { cost: 2 }, { quote: '이 성벽은 무너지지 않아.' });
  C('s_thousand', '천 개의 칼날', 'sword', 'attack', 'rare', 2, 'kaira', ['multi', 'str'], '✴️', [dmg(2, { hits: 7 })], { effects: [dmg(2, { hits: 9 })] }, { quote: '셀 수 있으면 세어 봐.' });
  C('s_limit', '한계 돌파', 'sword', 'skill', 'rare', 1, 'sera', ['str'], '⏫', [{ t: 'doubleStr' }], { exhaust: false }, { exhaust: true, quote: '여기서부터가 진짜 나야.' });

  // ── 루나(마법사)
  C('m_bolt', '마력탄', 'magic', 'attack', 'starter', 1, 'luna', [], '✨', [dmg(6)], { effects: [dmg(9)] }, { quote: '조준 완료. 발사~' });
  C('m_ward', '마력 방벽', 'magic', 'skill', 'starter', 1, 'luna', [], '🔷', [blk(5)], { effects: [blk(8)] }, { quote: '얇아 보여도 튼튼해.' });
  C('m_meteor', '별똥별', 'magic', 'attack', 'starter', 2, 'luna', ['aoe'], '🌠', [{ t: 'dmgAll', v: 10 }], { effects: [{ t: 'dmgAll', v: 14 }] }, { quote: '소원 빌 시간은 없을 거야.' });
  C('m_focus', '마나 집중', 'magic', 'skill', 'starter', 0, 'luna', ['spell'], '💠', [draw(2)], { effects: [draw(3)] }, { exhaust: true, quote: '흐읍… 좋아, 머리 맑아졌어.' });
  C('m_fire', '화염구', 'magic', 'attack', 'common', 1, 'luna', ['burn'], '🔥', [dmg(9)], { effects: [dmg(12)] }, { quote: '앗 뜨거. 아, 너 말고 나.' });
  C('m_frost', '서리 화살', 'magic', 'attack', 'common', 1, 'sion', ['frost'], '🧊', [dmg(6), app('weak', 1)], { effects: [dmg(8), app('weak', 2)] }, { quote: '좀 식혀. 열 받은 거 다 보여.' });
  C('m_chain', '연쇄 번개', 'magic', 'attack', 'common', 1, 'sion', ['aoe'], '⚡', [{ t: 'dmgRandom', v: 3, hits: 3 }], { effects: [{ t: 'dmgRandom', v: 3, hits: 4 }] }, { quote: '찌릿찌릿~ 어디로 튈지 나도 몰라!' });
  C('m_barrier', '빛의 장막', 'magic', 'skill', 'common', 2, 'elena', ['spell'], '🌈', [blk(12)], { effects: [blk(16)] }, { quote: '빛이 당신을 지켜 줄 거예요.' });
  C('m_wisdom', '마도서 펼치기', 'magic', 'skill', 'common', 1, 'luna', ['spell'], '📖', [draw(3)], { effects: [draw(4)] }, { quote: '답은 다 책에 있어.' });
  C('m_blizzard', '눈보라', 'magic', 'attack', 'common', 2, 'sion', ['frost', 'aoe'], '🌨️', [{ t: 'dmgAll', v: 8 }, appAll('weak', 1)], { effects: [{ t: 'dmgAll', v: 11 }, appAll('weak', 2)] }, { quote: '다들 감기 조심해~' });
  C('m_icelance', '얼음 창', 'magic', 'attack', 'common', 1, 'sion', ['frost'], '❄️', [dmg(7, { bonusIfWeak: 7 })], { effects: [dmg(9, { bonusIfWeak: 9 })] }, { quote: '얼어붙은 상대는 맞히기 쉽거든.' });
  C('m_inferno', '업화', 'magic', 'attack', 'common', 1, 'luna', ['burn', 'aoe'], '🌋', [{ t: 'dmgAll', v: 7 }, { t: 'add', id: 'burn', n: 1, to: 'discard' }], { effects: [{ t: 'dmgAll', v: 10 }, { t: 'add', id: 'burn', n: 1, to: 'discard' }] }, { quote: '조금 탄 냄새가 나도 모른 척해 줘.' });
  C('m_heal', '치유의 기도', 'magic', 'skill', 'uncommon', 1, 'elena', ['spell'], '💖', [{ t: 'heal', v: 5 }, blk(5)], { effects: [{ t: 'heal', v: 8 }, blk(7)] }, { exhaust: true, quote: '아픈 곳, 여기죠? 금방 나아요.' });
  C('m_brew', '즉석 조합', 'magic', 'skill', 'uncommon', 0, 'pio', ['spell'], '⚗️', [{ t: 'energy', v: 1 }, draw(1)], { effects: [{ t: 'energy', v: 1 }, draw(2)] }, { exhaust: true, quote: '이거랑 이거 섞으면… 아마 괜찮을걸?' });
  C('m_acid', '산성 플라스크', 'magic', 'skill', 'uncommon', 1, 'pio', ['frost'], '🧫', [appAll('weak', 1), appAll('vuln', 1)], { effects: [appAll('weak', 2), appAll('vuln', 2)] }, { quote: '냄새는 좀 참아 줘.' });
  C('m_overload', '마력 폭주', 'magic', 'attack', 'uncommon', 0, 'luna', ['burn'], '💢', [dmg(10), { t: 'add', id: 'burn', n: 1, to: 'discard' }], { effects: [dmg(14), { t: 'add', id: 'burn', n: 1, to: 'discard' }] }, { quote: '어, 이거 좀 많이 나갔는데?' });
  C('m_mirror', '거울 결계', 'magic', 'power', 'uncommon', 1, 'elena', ['frost'], '🪞', [self('thorns', 3)], { effects: [self('thorns', 5)] }, { quote: '때린 만큼 돌려받는 거예요.' });
  C('m_mana', '마나 순환', 'magic', 'power', 'uncommon', 1, 'luna', ['spell'], '♻️', [self('drawUp', 1)], { cost: 0 }, { quote: '숨 쉬듯이 마나를 돌리는 거야.' });
  C('m_arcane', '마력 공명', 'magic', 'power', 'uncommon', 1, 'luna', ['spell'], '🔮', [self('arcane', 3)], { effects: [self('arcane', 4)] }, { quote: '주문 하나에 별 하나씩.' });
  C('m_chainspell', '주문 연쇄', 'magic', 'attack', 'uncommon', 1, 'luna', ['spell'], '📿', [dmg(5, { hitsFrom: 'skill' })], { effects: [dmg(7, { hitsFrom: 'skill' })] }, { quote: '외운 만큼 쏟아진다!' });
  C('m_pyro', '연소 촉매', 'magic', 'power', 'uncommon', 1, 'pio', ['burn'], '🧨', [self('pyro', 5)], { effects: [self('pyro', 8)] }, { quote: '불붙으면 더 신나는 법이지!' });
  C('m_ember', '재 속의 불씨', 'magic', 'attack', 'uncommon', 1, 'pio', ['burn'], '🕯️', [{ t: 'exhaustBurns', v: 10 }, draw(1)], { effects: [{ t: 'exhaustBurns', v: 14 }, draw(1)] }, { quote: '타고 남은 것도 다 쓸모가 있어.' });
  C('m_spirit', '정령 계약', 'magic', 'power', 'rare', 2, 'sion', ['spell'], '🌬️', [self('energyUp', 1)], { cost: 1 }, { quote: '바람아, 조금만 도와줘!' });
  C('m_storm', '별빛 폭풍', 'magic', 'attack', 'rare', 3, 'luna', ['aoe'], '🌌', [{ t: 'dmgAll', v: 20 }], { effects: [{ t: 'dmgAll', v: 27 }] }, { quote: '오늘 밤하늘, 전부 너희한테 줄게.' });
  C('m_permafrost', '영구 동토', 'magic', 'power', 'rare', 2, 'sion', ['frost'], '🏔️', [self('permafrost', 1)], { cost: 1 }, { quote: '여기선 아무도 힘 못 써.' });
  C('m_starfall', '유성우', 'magic', 'attack', 'rare', 2, 'luna', ['aoe'], '🌟', [{ t: 'dmgRandom', v: 6, hits: 5 }], { effects: [{ t: 'dmgRandom', v: 8, hits: 5 }] }, { quote: '하나쯤은 맞겠지?' });

  // ── 유키(닌자)
  C('n_slash', '쿠나이 베기', 'ninja', 'attack', 'starter', 1, 'yuki', [], '🔪', [dmg(6)], { effects: [dmg(9)] }, { quote: '…끝.' });
  C('n_dodge', '그림자 회피', 'ninja', 'skill', 'starter', 1, 'yuki', [], '💨', [blk(5)], { effects: [blk(8)] }, { quote: '거기 없어.' });
  C('n_venom', '독침', 'ninja', 'skill', 'starter', 1, 'yuki', ['poison'], '💉', [app('poison', 5)], { effects: [app('poison', 7)] }, { quote: '따끔했지? 이제부터야.' });
  C('n_blades', '표창 난무', 'ninja', 'skill', 'common', 1, 'yuki', ['shiv'], '✴️', [{ t: 'add', id: 'shiv', n: 3, to: 'hand' }], { effects: [{ t: 'add', id: 'shiv', n: 4, to: 'hand' }] }, { quote: '셋. 아니, 넷까지 갈까.' });
  C('n_aim', '조준 사격', 'ninja', 'attack', 'common', 1, 'mir', ['combo'], '🏹', [dmg(7), draw(1)], { effects: [dmg(10), draw(1)] }, { quote: '바람 계산 끝. 쏜다.' });
  C('n_rain', '화살비', 'ninja', 'attack', 'common', 1, 'mir', ['combo'], '🌧️', [{ t: 'dmgAll', v: 4, hits: 2 }], { effects: [{ t: 'dmgAll', v: 6, hits: 2 }] }, { quote: '우산 챙겼어? 없으면 아플 거야.' });
  C('n_poisonblade', '독 칼날', 'ninja', 'attack', 'common', 1, 'bell', ['poison'], '🗡️', [dmg(5), app('poison', 3)], { effects: [dmg(7), app('poison', 4)] }, { quote: '살짝 스치기만 해도 돼~' });
  C('n_backflip', '공중제비', 'ninja', 'skill', 'common', 1, 'daon', ['evade'], '🤸', [blk(5), draw(2)], { effects: [blk(8), draw(2)] }, { quote: '한 바퀴 돌고, 착지!' });
  C('n_cloak', '그림자 장막', 'ninja', 'skill', 'common', 1, 'yuki', ['evade'], '🌫️', [blk(7), draw(1)], { effects: [blk(10), draw(1)] }, { quote: '어둠은 내 편이야.' });
  C('n_combo', '연환 베기', 'ninja', 'attack', 'common', 0, 'yuki', ['combo'], '🔗', [dmg(4), { t: 'energyIfAtk', n: 3, v: 1 }], { effects: [dmg(6), { t: 'energyIfAtk', n: 3, v: 1 }] }, { quote: '흐름 끊지 마.' });
  C('n_shuriken', '표창 비', 'ninja', 'skill', 'common', 1, 'mir', ['shiv'], '🎯', [{ t: 'add', id: 'shiv', n: 2, to: 'hand' }, draw(1)], { effects: [{ t: 'add', id: 'shiv', n: 3, to: 'hand' }, draw(1)] }, { quote: '화살 대신 표창. 가끔은 기분 전환!' });
  C('n_cloud', '독안개', 'ninja', 'skill', 'uncommon', 2, 'bell', ['poison'], '☁️', [appAll('poison', 6)], { effects: [appAll('poison', 9)] }, { quote: '숨 참는 거 잘해? 난 잘하는데.' });
  C('n_catalyst', '맹독 촉진', 'ninja', 'skill', 'uncommon', 1, 'bell', ['poison'], '⚗️', [{ t: 'multiplyPoison', v: 2 }], { effects: [{ t: 'multiplyPoison', v: 3 }] }, { exhaust: true, quote: '조금 더 진하게 해 볼까?' });
  C('n_flurry', '난무', 'ninja', 'attack', 'uncommon', 2, 'yuki', ['combo'], '🌪️', [dmg(3, { hits: 5 })], { effects: [dmg(4, { hits: 5 })] }, { quote: '눈으로 따라올 수 있으면 해 봐.' });
  C('n_footwork', '무희의 스텝', 'ninja', 'power', 'uncommon', 1, 'daon', ['evade'], '👠', [self('dex', 2)], { effects: [self('dex', 3)] }, { quote: '스텝이 꼬이면 지는 거야.' });
  C('n_toxin', '맹독 연구', 'ninja', 'power', 'uncommon', 1, 'bell', ['poison'], '🧪', [self('toxin', 1)], { effects: [self('toxin', 2)] }, { quote: '연구 결과, 더 아프게 할 수 있어.' });
  C('n_burst', '독 폭발', 'ninja', 'attack', 'uncommon', 1, 'bell', ['poison'], '💥', [{ t: 'dmgPoison', m: 1 }], { cost: 0 }, { quote: '쌓인 만큼, 한 번에!' });
  C('n_bladedance', '칼날 무희', 'ninja', 'power', 'uncommon', 1, 'daon', ['shiv'], '🪭', [self('bladeDance', 2)], { effects: [self('bladeDance', 3)] }, { quote: '부채 사이로 칼날이 춤춰.' });
  C('n_mirage', '환영 분신', 'ninja', 'skill', 'uncommon', 1, 'daon', ['evade'], '👯', [{ t: 'blockDex', m: 4 }, blk(3)], { effects: [{ t: 'blockDex', m: 6 }, blk(3)] }, { quote: '진짜 나는 어느 쪽게?' });
  C('n_afterimage', '잔상', 'ninja', 'power', 'rare', 1, 'yuki', ['evade'], '👥', [self('afterImage', 1)], { cost: 0 }, { quote: '지금 본 건 내가 아니야.' });
  C('n_envenom', '맹독 바르기', 'ninja', 'power', 'rare', 2, 'bell', ['poison'], '🐍', [self('envenom', 1)], { cost: 1 }, { quote: '칼날마다 정성껏 발라 뒀지.' });
  C('n_finisher', '그림자 처형', 'ninja', 'attack', 'rare', 1, 'yuki', ['combo', 'shiv'], '🌑', [dmg(6, { hitsFrom: 'atk' })], { effects: [dmg(8, { hitsFrom: 'atk' })] }, { quote: '연습은 끝났어. 이게 본편.' });
  C('n_shivgen', '무한 표창', 'ninja', 'power', 'rare', 2, 'yuki', ['shiv'], '♾️', [self('shivGen', 1)], { cost: 1 }, { quote: '떨어질 일은 없어.' });
  C('n_assassinate', '암살', 'ninja', 'attack', 'rare', 2, 'bell', ['combo'], '🎭', [dmg(24)], { effects: [dmg(32)] }, { exhaust: true, quote: '쉿. 금방 끝나.' });

  // ── 아리아(성기사) — 해금 히로인
  C('h_strike', '성검 베기', 'holy', 'attack', 'starter', 1, 'aria', [], '⚔️', [dmg(6)], { effects: [dmg(9)] }, { quote: '정의는 늦지 않아.' });
  C('h_guard', '수호 방패', 'holy', 'skill', 'starter', 1, 'aria', [], '🛡️', [blk(5)], { effects: [blk(8)] }, { quote: '여기서부턴 못 지나가.' });
  C('h_smite', '천벌', 'holy', 'attack', 'starter', 2, 'aria', ['smite'], '✝️', [dmg(7), blk(7)], { effects: [dmg(10), blk(10)] }, { quote: '빛이 너를 심판한다.' });
  C('h_bulwark', '성벽', 'holy', 'skill', 'common', 2, 'aria', ['aegis'], '🧱', [blk(14)], { effects: [blk(18)] }, { quote: '무너질 생각이 없어.' });
  C('h_prayer', '기도', 'holy', 'skill', 'common', 1, 'elena', ['heal'], '🙏', [{ t: 'heal', v: 4 }, self('regen', 2)], { effects: [{ t: 'heal', v: 6 }, self('regen', 3)] }, { exhaust: true, quote: '잠깐만 눈 감아요.' });
  C('h_cleanse', '정화', 'holy', 'skill', 'common', 0, 'elena', ['heal'], '💧', [{ t: 'cleanse' }, blk(3)], { effects: [{ t: 'cleanse' }, blk(6)] }, { quote: '나쁜 기운, 저리 가.' });
  C('h_retort', '응징', 'holy', 'attack', 'common', 1, 'aria', ['judge'], '🌹', [dmg(6), self('thorns', 1)], { effects: [dmg(8), self('thorns', 2)] }, { quote: '받은 만큼은 돌려줘야지.' });
  C('h_light', '빛의 창', 'holy', 'attack', 'common', 1, 'elena', ['smite'], '🔆', [dmg(7), blk(4)], { effects: [dmg(10), blk(5)] }, { quote: '빛은 창이 되기도 해요.' });
  C('h_vow', '맹세', 'holy', 'skill', 'common', 1, 'aria', ['aegis'], '🤞', [blk(6), app('weak', 1)], { effects: [blk(8), app('weak', 2)] }, { quote: '내 이름을 걸고.' });
  C('h_sanctuary', '성역', 'holy', 'power', 'uncommon', 2, 'aria', ['aegis'], '⛪', [self('sanctuary', 3)], { effects: [self('sanctuary', 5)] }, { quote: '이곳은 신의 땅이야.' });
  C('h_retribution', '응보의 맹세', 'holy', 'power', 'uncommon', 1, 'aria', ['judge', 'aegis'], '⚖️', [self('retribution', 5)], { effects: [self('retribution', 8)] }, { quote: '막아 낸 만큼 되갚는다.' });
  C('h_grace', '은총', 'holy', 'power', 'uncommon', 1, 'elena', ['heal'], '🕊️', [self('grace', 3)], { effects: [self('grace', 5)] }, { quote: '치유의 빛은 적에겐 따가워요.' });
  C('h_regen', '생명의 샘', 'holy', 'skill', 'uncommon', 1, 'elena', ['heal'], '⛲', [self('regen', 6)], { effects: [self('regen', 9)] }, { exhaust: true, quote: '천천히, 하지만 확실히.' });
  C('h_bastion', '굳건한 신념', 'holy', 'skill', 'uncommon', 1, 'aria', ['aegis'], '🗿', [blk(9), self('dex', 1)], { effects: [blk(12), self('dex', 1)] }, { quote: '흔들리지 않아.' });
  C('h_judge', '심판의 빛', 'holy', 'attack', 'uncommon', 2, 'aria', ['smite', 'aegis'], '🌞', [{ t: 'dmgBlockAll' }], { cost: 1 }, { quote: '내 방패가 곧 내 검이야.' });
  C('h_martyr', '희생', 'holy', 'skill', 'uncommon', 0, 'elena', ['judge'], '🥀', [{ t: 'loseHp', v: 3 }, self('thorns', 4)], { effects: [{ t: 'loseHp', v: 3 }, self('thorns', 6)] }, { quote: '아픔은 제가 가져갈게요.' });
  C('h_divine', '신의 방패', 'holy', 'skill', 'rare', 2, 'aria', ['aegis'], '💠', [blk(30)], { effects: [blk(40)] }, { exhaust: true, quote: '이건 신께서 주신 방패야.' });
  C('h_bless', '성녀의 축복', 'holy', 'power', 'rare', 2, 'elena', ['heal'], '😇', [self('blessing', 2)], { effects: [self('blessing', 3)] }, { quote: '당신이 다치지 않기를.' });
  C('h_wrath', '신의 분노', 'holy', 'attack', 'rare', 2, 'aria', ['smite'], '⚡', [dmg(20), app('vuln', 2)], { effects: [dmg(26), app('vuln', 3)] }, { quote: '참는 것도 여기까지야.' });
  C('h_judgement', '최후의 심판', 'holy', 'attack', 'rare', 2, 'aria', ['judge'], '🔱', [{ t: 'dmgAllThorns', m: 3 }], { effects: [{ t: 'dmgAllThorns', m: 4 }] }, { quote: '가시 하나하나가 심판이야.' });

  // ── 공용
  C('x_bandage', '응급 처치', 'neutral', 'skill', 'common', 0, 'elena', ['heal'], '🩹', [{ t: 'heal', v: 4 }], { effects: [{ t: 'heal', v: 6 }] }, { exhaust: true, quote: '움직이지 마요. 금방 끝나요.' });
  C('x_trip', '발 걸기', 'neutral', 'skill', 'common', 0, 'bell', ['frost'], '🦶', [app('vuln', 2)], { effects: [appAll('vuln', 2)] }, { quote: '어머, 거기 턱 있었는데.' });
  C('x_lullaby', '자장가', 'neutral', 'skill', 'common', 1, 'lyra', ['frost'], '🎶', [appAll('weak', 1), blk(4)], { effects: [appAll('weak', 2), blk(6)] }, { quote: '자, 눈 감고… 힘 빼고…' });
  C('x_dash', '질주', 'neutral', 'attack', 'common', 2, 'daon', ['guard'], '🏃', [dmg(10), blk(10)], { effects: [dmg(13), blk(13)] }, { quote: '스텝 한 번에 공격과 회피!' });
  C('x_flash', '섬광탄', 'neutral', 'skill', 'common', 1, 'pio', ['frost'], '💡', [appAll('weak', 1), draw(1)], { effects: [appAll('weak', 2), draw(1)] }, { quote: '눈 감아! …아, 늦었다.' });
  C('x_cheer', '격려', 'neutral', 'skill', 'common', 1, 'lyra', ['guard'], '📯', [blk(6), draw(1)], { effects: [blk(9), draw(1)] }, { quote: '할 수 있어! 내가 보장해!' });
  C('x_song', '응원가', 'neutral', 'skill', 'uncommon', 1, 'lyra', ['str'], '🎵', [self('str', 1), self('dex', 1)], { cost: 0 }, { exhaust: true, quote: '힘내라~ 우리 원정대! 라라라~' });
  C('x_entrance', '극적인 등장', 'neutral', 'attack', 'uncommon', 2, 'daon', ['aoe'], '🎆', [{ t: 'dmgAll', v: 12 }], { effects: [{ t: 'dmgAll', v: 16 }] }, { exhaust: true, innate: true, quote: '조명! 음악! 그리고… 나!' });
  C('x_panacea', '만능약', 'neutral', 'skill', 'uncommon', 0, 'pio', ['heal'], '🍶', [{ t: 'cleanse' }, draw(1)], { effects: [{ t: 'cleanse' }, draw(2)] }, { exhaust: true, quote: '뭐든 낫게 해 주는 약! …아마도.' });
  C('x_ballad', '영웅의 발라드', 'neutral', 'power', 'rare', 2, 'lyra', ['str'], '🎻', [self('ritual', 1)], { cost: 1 }, { quote: '이 노래가 끝날 때쯤, 넌 전설이야.' });

  // ── 업적 해금 전용 카드 (legend)
  C('ex_crimson', '진홍의 일섬', 'sword', 'attack', 'legend', 2, 'sera', ['str'], '🌹', [dmg(30), app('vuln', 2)], { effects: [dmg(40), app('vuln', 2)] }, { quote: '이게 내 전부야. 잘 봐 둬.', unlock: 'big_hit' });
  C('ex_nova', '초신성', 'magic', 'attack', 'legend', 3, 'luna', ['aoe', 'spell'], '💫', [{ t: 'dmgAll', v: 30 }], { effects: [{ t: 'dmgAll', v: 40 }] }, { exhaust: true, quote: '별이 태어나는 순간을 보여 줄게.', unlock: 'chain10' });
  C('ex_venom', '천 개의 독침', 'ninja', 'skill', 'legend', 2, 'yuki', ['poison'], '🦂', [appAll('poison', 12)], { effects: [appAll('poison', 16)] }, { quote: '피할 곳은 없어.', unlock: 'poison30' });
  C('ex_aegis', '절대 성역', 'holy', 'skill', 'legend', 2, 'aria', ['aegis'], '👼', [blk(20), self('sanctuary', 5)], { effects: [blk(26), self('sanctuary', 6)] }, { quote: '여기 있는 한, 아무도 못 다쳐.', unlock: 'block50' });
  C('ex_encore', '앙코르', 'neutral', 'skill', 'legend', 0, 'lyra', ['spell'], '🎤', [draw(2), { t: 'energy', v: 2 }], { effects: [draw(3), { t: 'energy', v: 2 }] }, { exhaust: true, quote: '한 곡 더! 한 곡 더!', unlock: 'elite10' });

  // ── 토큰 / 상태 카드 (보상에 안 나옴)
  C('shiv', '표창', 'token', 'attack', 'special', 0, 'yuki', ['shiv'], '✴️', [dmg(4)], { effects: [dmg(6)] }, { exhaust: true, quote: '휙.' });
  C('burn', '화상', 'status', 'status', 'special', 0, null, [], '🔥', [], null, { unplayable: true, endTurnInHand: 2, text: '사용 불가. 턴 종료 시 손에 있으면 체력 2를 잃어.', quote: '앗 뜨거…' });
  C('daze', '현기증', 'status', 'status', 'special', 0, null, [], '💫', [], null, { unplayable: true, ethereal: true, text: '사용 불가.', quote: '세상이 빙글빙글…' });
  C('wound', '상처', 'status', 'status', 'special', 0, null, [], '🩹', [], null, { unplayable: true, text: '사용 불가.', quote: '욱신거려.' });
  C('slimed', '끈적이', 'status', 'status', 'special', 1, null, [], '🟢', [], null, { exhaust: true, text: '아무 효과 없음.', quote: '으, 끈적끈적해.' });

  // ───────── 시작 히로인(플레이어블) ─────────
  const STARTERS = {
    sera: { hero: 'sera', title: '붉은 검의 세라', cls: 'sword', hp: 80, gold: 99, relic: 'red_ribbon',
            deck: ['s_strike', 's_strike', 's_strike', 's_strike', 's_strike', 's_guard', 's_guard', 's_guard', 's_guard', 's_bash'],
            pitch: '튼튼하고 단순한 정면 승부. 힘을 쌓아 크게 벤다.', line: '길 막으면 벤다. 안 막으면… 그래도 갈 거야.' },
    luna: { hero: 'luna', title: '별을 읽는 루나', cls: 'magic', hp: 76, gold: 99, relic: 'moon_pendant',
            deck: ['m_bolt', 'm_bolt', 'm_bolt', 'm_bolt', 'm_ward', 'm_ward', 'm_ward', 'm_ward', 'm_meteor', 'm_focus'],
            pitch: '범위 마법과 드로우. 적이 많을수록 신난다.', line: '계산은 끝났어. 이제 예쁘게 터뜨리기만 하면 돼.' },
    yuki: { hero: 'yuki', title: '그림자 걷는 유키', cls: 'ninja', hp: 76, gold: 99, relic: 'shadow_hood',
            deck: ['n_slash', 'n_slash', 'n_slash', 'n_slash', 'n_slash', 'n_dodge', 'n_dodge', 'n_dodge', 'n_dodge', 'n_venom'],
            pitch: '표창과 독으로 천천히, 확실하게. 손이 바쁜 타입.', line: '…시끄러운 건 싫어. 조용히 끝낼게.' },
    aria: { hero: 'aria', title: '빛의 방패 아리아', cls: 'holy', hp: 72, gold: 99, relic: 'holy_sigil', locked: true,
            unlockText: '2막 보스 「밤의 여왕 벨리타」를 한 번 쓰러뜨리면 합류해.',
            deck: ['h_strike', 'h_strike', 'h_strike', 'h_strike', 'h_guard', 'h_guard', 'h_guard', 'h_guard', 'h_guard', 'h_smite'],
            pitch: '방어도를 쌓고 그대로 되돌려 주는 수호 기사. 회복과 반격도 특기.', line: '뒤는 내가 지킬게. 앞만 봐.' }
  };

  // ───────── 막(Act) ─────────
  const ACTS = [
    null,
    { name: '1막 · 어스름 숲', short: '어스름 숲', bg: ['#1d3324', '#140b1f'], floors: 10 },
    { name: '2막 · 달 없는 성', short: '달 없는 성', bg: ['#3a1230', '#140b1f'], floors: 10 },
    { name: '3막 · 별의 첨탑', short: '별의 첨탑', bg: ['#14224a', '#0a0716'], floors: 10 },
    { name: '종막 · 황혼의 옥좌', short: '황혼의 옥좌', bg: ['#4a2a10', '#0a0716'], floors: 1 }
  ];

  // ───────── 적 ─────────
  // move: name, dmg, hits, block, blockAll, selfSt{}, playerSt{}, addCards[{id,n,to}], heal, summon[], say
  // ai: { type:'random', w:{move:가중치}, maxRun:{move:연속최대}, first } | { type:'cycle', order:[...], first }
  // phases(보스): [{ ai }, { at: 0.5, enter:{ say, clearDebuffs, st:{}, block }, ai }]
  const ENEMIES = {
    // ── 1막
    slime: { name: '말랑 슬라임', kind: 'monster', act: 1, hp: [12, 15], colors: ['#8ff0b0', '#2c8a5b'], glyph: '💧', desc: '말랑말랑. 생각보다 세게 부딪힌다.',
             moves: { tackle: { name: '몸통박치기', dmg: 5 }, spit: { name: '끈적 점액', dmg: 3, playerSt: { weak: 1 } } },
             ai: { type: 'random', w: { tackle: 6, spit: 4 }, maxRun: { tackle: 2, spit: 1 } } },
    bat:   { name: '흡혈 박쥐', kind: 'monster', act: 1, hp: [7, 9], colors: ['#9b6bd6', '#2a1840'], glyph: '🦇', desc: '여왕의 심부름꾼. 물면 조금 회복한다.',
             moves: { bite: { name: '흡혈', dmg: 3, heal: 2 }, screech: { name: '초음파', playerSt: { weak: 1 } } },
             ai: { type: 'random', w: { bite: 7, screech: 3 }, maxRun: { bite: 2, screech: 1 } } },
    wolf:  { name: '그림자 늑대', kind: 'monster', act: 1, hp: [20, 24], colors: ['#6b6f8a', '#1a1b2a'], glyph: '🐺', desc: '무리를 지어 다니는 숲의 사냥꾼.',
             moves: { bite: { name: '물어뜯기', dmg: 7 }, howl: { name: '울부짖기', selfSt: { str: 1 }, block: 4 } },
             ai: { type: 'random', w: { bite: 7, howl: 3 }, maxRun: { bite: 2, howl: 1 } } },
    pixie: { name: '장난꾸러기 요정 픽시', kind: 'rival', act: 1, hp: [22, 26], colors: ['#ffd1f0', '#7a3f8a'], glyph: '픽', age: 120, ageText: '요정 나이 120세 (인간으로 치면 20대)', desc: '꽃가루를 뿌리며 원정대를 놀리는 숲의 요정.',
             moves: { dust: { name: '꽃가루', playerSt: { weak: 1 }, addCards: [{ id: 'daze', n: 1, to: 'discard' }], say: '에취! 아니 너 말고 나~' }, poke: { name: '콕콕 찌르기', dmg: 4, hits: 2 }, giggle: { name: '깔깔 웃기', block: 6, heal: 4 } },
             ai: { type: 'random', first: 'dust', w: { poke: 5, giggle: 2, dust: 3 }, maxRun: { poke: 2, giggle: 1, dust: 1 } } },
    mia:   { name: '견습 마녀 미아', kind: 'rival', act: 1, hp: [28, 32], colors: ['#b48cff', '#3b2370'], glyph: '미', age: 21, desc: '마탑 시험에서 루나에게 진 뒤로 이를 갈고 있다.',
             moves: { curse: { name: '저주 걸기', playerSt: { vuln: 2 }, say: '에헤헤, 실험 대상 발견~' }, bolt: { name: '마력탄', dmg: 9 }, spark: { name: '불꽃 장난', dmg: 5, addCards: [{ id: 'burn', n: 1, to: 'discard' }] } },
             ai: { type: 'random', first: 'curse', w: { bolt: 5, spark: 3, curse: 2 }, maxRun: { bolt: 2, spark: 1, curse: 1 } } },
    karin: { name: '산적 두목 카린', kind: 'rival', act: 1, hp: [40, 44], colors: ['#e0a96d', '#5c3a1a'], glyph: '카', age: 27, desc: '산길을 꽉 잡고 있는 산적단 두목. 의외로 의리파.',
             moves: { slash: { name: '휘두르기', dmg: 12 }, jab: { name: '연속 찌르기', dmg: 5, hits: 2 }, threat: { name: '으름장', block: 6, selfSt: { str: 2 }, say: '그 지갑, 두고 가. 좋은 말로 할 때.' } },
             ai: { type: 'random', w: { slash: 4, jab: 4, threat: 2 }, maxRun: { slash: 2, jab: 2, threat: 1 } } },
    rosa:  { name: '가시덩굴 정령 로사', kind: 'rival', act: 1, hp: [36, 40], colors: ['#7bd36b', '#7a1f3d'], glyph: '로', age: 25, desc: '장미 정원의 정령. 함부로 만지면 찔린다.', start: { thorns: 3 },
             moves: { whip: { name: '덩굴 채찍', dmg: 7 }, sting: { name: '독 가시', dmg: 4, playerSt: { poison: 3 } }, bloom: { name: '광합성', block: 9, selfSt: { str: 1 }, say: '햇볕 좋다~ 너도 좀 쬐고 갈래?' } },
             ai: { type: 'random', w: { whip: 4, sting: 3, bloom: 3 }, maxRun: { whip: 2, sting: 1, bloom: 1 } } },
    isabel: { name: '흑장미 결투가 이자벨', kind: 'elite', act: 1, hp: [74, 78], colors: ['#ff4f81', '#1a0b14'], glyph: '이', age: 26, desc: '결투만 아흔아홉 번 이긴 검사. 방패 뒤에 숨는 걸 싫어한다.',
             moves: { duel: { name: '결투 신청', selfSt: { enrage: 1 }, say: '정정당당하게 하자. 방패 뒤에 숨는 건 실례야.' }, thrust: { name: '장미 찌르기', dmg: 12 }, flurry: { name: '꽃잎 연격', dmg: 6, hits: 2, playerSt: { vuln: 1 } }, parry: { name: '우아한 받아치기', block: 10, dmg: 7 } },
             ai: { type: 'random', first: 'duel', w: { thrust: 4, flurry: 4, parry: 2 }, maxRun: { thrust: 2, flurry: 1, parry: 1 } } },
    mossgolem: { name: '이끼 골렘', kind: 'elite', act: 1, hp: [86, 90], colors: ['#7aa35a', '#24331a'], glyph: '🗿', desc: '천 년 동안 숲을 지킨 돌거인. 느리지만 한 방이 무겁다.', start: { curl: 12 },
             moves: { charge: { name: '힘 모으기', block: 12, selfSt: { str: 3 }, say: '…우우웅.' }, slam: { name: '대지 강타', dmg: 18 }, spores: { name: '포자 뿌리기', dmg: 6, addCards: [{ id: 'slimed', n: 2, to: 'discard' }] } },
             ai: { type: 'cycle', order: ['charge', 'slam', 'spores'] } },
    morgana: { name: '숲의 마녀 모르가나', kind: 'boss', boss: true, act: 1, hp: [108, 108], colors: ['#59d38c', '#0d2a1a'], glyph: '모', age: 28,
             desc: '어스름 숲의 주인. 덩굴과 독초로 숲에 들어온 자를 길 잃게 만든다.',
             intro: '길을 잃었니? 걱정 마. 영원히 여기 있게 해 줄 테니까.', death: '…숲이, 너희에게 길을 열어 주는구나.',
             moves: { vines: { name: '휘감는 덩굴', dmg: 8, playerSt: { weak: 1 } }, brew: { name: '독초 달이기', playerSt: { poison: 3 }, block: 8 }, call: { name: '숲의 부름', summon: ['slime', 'slime'], say: '얘들아, 놀아 줘.' },
                      thorn: { name: '가시 폭풍', dmg: 4, hits: 4 }, bloom: { name: '만개', selfSt: { str: 2, regen: 4 }, block: 12, say: '꽃은 지는 게 아니라, 다시 피는 거야.' }, crush: { name: '고목 짓누르기', dmg: 16 } },
             phases: [ { ai: { type: 'cycle', order: ['vines', 'brew', 'call', 'thorn'] } },
                       { at: 0.5, enter: { say: '숲을 화나게 했구나. 이제 진짜 숲을 보여 줄게.', clearDebuffs: true }, ai: { type: 'cycle', first: 'bloom', order: ['crush', 'thorn', 'vines', 'bloom'] } } ] },

    // ── 2막
    knox:  { name: '해골 기사 녹스', kind: 'monster', act: 2, hp: [52, 56], colors: ['#d8d8d8', '#3c3f4a'], glyph: '💀', desc: '여왕의 성문을 지키던 기사. 지금도 근무 중이다.',
             moves: { raise: { name: '방패 세우기', block: 10, dmg: 6 }, smash: { name: '대검 일격', dmg: 15 } }, ai: { type: 'cycle', order: ['raise', 'smash', 'smash'] } },
    veronica: { name: '사냥꾼 베로니카', kind: 'rival', act: 2, hp: [50, 54], colors: ['#c0a080', '#2f3b2a'], glyph: '베', age: 29, desc: '현상금 사냥꾼. 시간을 끌수록 조준이 정확해진다.',
             moves: { ready: { name: '사냥 준비', selfSt: { ritual: 2 }, say: '도망쳐도 돼. 그게 더 재밌거든.' }, shot: { name: '석궁 사격', dmg: 7 } }, ai: { type: 'cycle', first: 'ready', order: ['shot'] } },
    chloe: { name: '인형술사 클로에', kind: 'rival', act: 2, hp: [46, 50], colors: ['#f4b6c2', '#4a2033'], glyph: '클', age: 24, desc: '실 끝으로 인형을 춤추게 하는 인형술사. 인형이 다치면 진심으로 화낸다.',
             moves: { dance: { name: '인형극 개막', summon: ['puppet'], say: '자, 인사해. 오늘의 주인공이야.' }, thread: { name: '실 조이기', dmg: 8, playerSt: { weak: 1 } }, pierce: { name: '바늘 세례', dmg: 3, hits: 4 } },
             ai: { type: 'random', first: 'dance', w: { dance: 2, thread: 4, pierce: 4 }, maxRun: { dance: 1, thread: 2, pierce: 1 } } },
    puppet: { name: '꼭두각시 인형', kind: 'monster', act: 2, hp: [14, 16], colors: ['#ffe0c2', '#6b4a3a'], glyph: '🪆', desc: '클로에의 인형. 표정이 묘하게 진지하다.',
             moves: { kick: { name: '발차기', dmg: 6 }, guard: { name: '주인 지키기', blockAll: 6 } }, ai: { type: 'random', w: { kick: 6, guard: 4 }, maxRun: { kick: 2, guard: 1 } } },
    nina:  { name: '흡혈 메이드 니나', kind: 'rival', act: 2, hp: [48, 52], colors: ['#ff8a9a', '#2a0f18'], glyph: '니', age: 25, desc: '벨리타 성의 수석 메이드. 손님 접대는 완벽하게, 퇴치도 완벽하게.',
             moves: { tray: { name: '은쟁반 강타', dmg: 11 }, tea: { name: '독이 든 홍차', playerSt: { poison: 4, weak: 1 }, say: '차 한 잔 하고 가세요. 꼭.' }, sip: { name: '흡혈', dmg: 7, heal: 7 } },
             ai: { type: 'random', first: 'tea', w: { tray: 4, sip: 4, tea: 2 }, maxRun: { tray: 2, sip: 1, tea: 1 } } },
    gargoyle: { name: '가고일', kind: 'monster', act: 2, hp: [38, 42], colors: ['#9aa0a8', '#2a2d33'], glyph: '🗽', desc: '성벽 위의 석상. 밤이 되면 날개를 편다.', start: { thorns: 2 },
             moves: { dive: { name: '급강하', dmg: 10 }, stone: { name: '석화', block: 14 }, claw: { name: '할퀴기', dmg: 5, hits: 2 } }, ai: { type: 'cycle', order: ['dive', 'stone', 'claw'] } },
    rena:  { name: '쌍둥이 암살자 레나', kind: 'elite', act: 2, hp: [48, 52], colors: ['#5ad1ff', '#101c33'], glyph: '레', age: 24, desc: '언니. 웃으면서 찌른다.',
             moves: { dagger: { name: '독 단검', dmg: 6, playerSt: { poison: 3 } }, ambush: { name: '기습', dmg: 13, say: '뒤, 조심했어야지.' } }, ai: { type: 'random', first: 'dagger', w: { dagger: 5, ambush: 5 }, maxRun: { dagger: 2, ambush: 1 } } },
    rina:  { name: '쌍둥이 암살자 리나', kind: 'elite', act: 2, hp: [48, 52], colors: ['#ff8ad8', '#2a1033'], glyph: '리', age: 24, desc: '동생. 언니 말이라면 뭐든 한다.',
             moves: { hex: { name: '약화 표창', dmg: 5, playerSt: { weak: 2 }, say: '언니, 이번엔 내가 먼저!' }, veil: { name: '그림자 장막', blockAll: 8 }, combo: { name: '연타', dmg: 5, hits: 2 } }, ai: { type: 'random', first: 'hex', w: { veil: 3, combo: 4, hex: 3 }, maxRun: { veil: 1, combo: 2, hex: 1 } } },
    elisa: { name: '백작부인 엘리자', kind: 'elite', act: 2, hp: [130, 136], colors: ['#c43a5a', '#1a0610'], glyph: '엘', age: 29, desc: '벨리타의 오랜 라이벌. 피의 장미 정원을 가꾼다.',
             moves: { rose: { name: '피의 장미', dmg: 9, hits: 2 }, drain: { name: '생명 흡수', dmg: 12, heal: 10 }, pride: { name: '귀족의 긍지', block: 16, selfSt: { str: 3 }, say: '무릎 꿇어. 그게 예의야.' } },
             ai: { type: 'cycle', first: 'pride', order: ['rose', 'drain', 'rose', 'pride'] } },
    belita: { name: '밤의 여왕 벨리타', kind: 'boss', boss: true, act: 2, hp: [195, 195], colors: ['#ff2e4d', '#14040c'], glyph: '벨', age: 29,
             desc: '달 없는 성의 주인. 우아하고 오만하며, 무엇보다 지루한 걸 못 참는다.',
             intro: '어머, 이렇게 늦은 밤에 손님이라니. 날 지루하게 하지는 마.', death: '…재밌었어. 정말, 오랜만에.',
             moves: { kiss: { name: '피의 입맞춤', dmg: 13, heal: 8 }, summon: { name: '박쥐 소환', summon: ['bat', 'bat'], block: 10, say: '얘들아, 손님 오셨다.' },
                      gaze: { name: '매혹의 시선', playerSt: { weak: 2 }, addCards: [{ id: 'daze', n: 2, to: 'discard' }], say: '내 눈 보지 마. …아니, 봐.' }, fang: { name: '붉은 송곳니', dmg: 8, hits: 2 },
                      storm: { name: '피의 폭풍', dmg: 5, hits: 4 }, veil: { name: '핏빛 장막', block: 18, selfSt: { str: 2 }, say: '버텨 봐. 다음 건 아플 거야.' }, night: { name: '영원한 밤', dmg: 22 } },
             phases: [ { ai: { type: 'cycle', order: ['kiss', 'summon', 'gaze', 'fang'] } },
                       { at: 0.5, enter: { say: '…드레스에 피가 묻었잖아. 좋아, 이제 좀 진지해져 볼까.', clearDebuffs: true, st: { str: 2 } }, ai: { type: 'cycle', order: ['storm', 'veil', 'night'] } } ] },

    // ── 3막
    starling: { name: '별빛 정령', kind: 'monster', act: 3, hp: [34, 38], colors: ['#bfe3ff', '#20306a'], glyph: '⭐', desc: '첨탑 주위를 떠도는 별의 조각. 반짝이며 터진다.',
             moves: { beam: { name: '별빛 광선', dmg: 11 }, twinkle: { name: '반짝임', blockAll: 7, playerSt: { vuln: 1 } } }, ai: { type: 'random', w: { beam: 6, twinkle: 4 }, maxRun: { beam: 2, twinkle: 1 } } },
    stargolem: { name: '별 골렘', kind: 'monster', act: 3, hp: [80, 86], colors: ['#8fa0ff', '#1a1f44'], glyph: '🤖', desc: '첨탑을 지키는 성운 덩어리 거인.', start: { metal: 4 },
             moves: { charge: { name: '성운 충전', selfSt: { str: 3 } }, crush: { name: '중력 붕괴', dmg: 18 }, quake: { name: '진동', dmg: 7, hits: 2 } }, ai: { type: 'cycle', order: ['charge', 'crush', 'quake'] } },
    kage:  { name: '그림자 검객 카게', kind: 'rival', act: 3, hp: [62, 66], colors: ['#7c7c9c', '#0d0d1a'], glyph: '카', age: 27, desc: '유키의 옛 동문. 같은 유파, 다른 길.',
             moves: { iai: { name: '발도술', dmg: 16, say: '…베었다.' }, shadow: { name: '그림자 숨기', block: 15, selfSt: { str: 2 } }, cuts: { name: '연속 베기', dmg: 6, hits: 3 } },
             ai: { type: 'random', first: 'shadow', w: { iai: 4, cuts: 4, shadow: 2 }, maxRun: { iai: 1, cuts: 2, shadow: 1 } } },
    eve:   { name: '타락 성기사 이브', kind: 'rival', act: 3, hp: [68, 72], colors: ['#9a7cff', '#1c0f33'], glyph: '이', age: 28, desc: '아리아의 옛 동료. 별의 목소리를 듣고 첨탑으로 떠났다.',
             moves: { judge: { name: '검은 심판', dmg: 16, playerSt: { vuln: 1 } }, pray: { name: '어둠의 기도', block: 18, heal: 10, say: '이것도 기도야. 방향만 다를 뿐.' }, smite: { name: '타락한 일격', dmg: 9, hits: 2 } },
             ai: { type: 'random', w: { judge: 4, smite: 4, pray: 2 }, maxRun: { judge: 1, smite: 2, pray: 1 } } },
    shard: { name: '별 조각', kind: 'monster', act: 3, hp: [18, 20], colors: ['#fff3a8', '#6a5a10'], glyph: '✦', desc: '셀레스가 떨어뜨린 별의 파편.',
             moves: { zap: { name: '섬광', dmg: 7 }, glow: { name: '증폭', selfSt: { str: 2 } } }, ai: { type: 'random', w: { zap: 7, glow: 3 }, maxRun: { zap: 2, glow: 1 } } },
    sena:  { name: '쌍성의 무녀 세나', kind: 'elite', act: 3, hp: [150, 156], colors: ['#ffe6a0', '#5a3a0a'], glyph: '세', age: 26, desc: '두 개의 별을 섬기는 무녀. 춤 한 번에 별이 하나 떨어진다.',
             moves: { dance: { name: '쌍성의 춤', dmg: 8, hits: 3 }, seal: { name: '봉인 부적', playerSt: { weak: 2, vuln: 2 }, block: 12, say: '움직이지 마세요. 별자리가 흐트러져요.' }, fall: { name: '낙성', dmg: 28 } },
             ai: { type: 'cycle', first: 'seal', order: ['dance', 'fall', 'seal'] } },
    drake: { name: '성룡 아스테르', kind: 'elite', act: 3, hp: [170, 176], colors: ['#7fd6ff', '#0a2a44'], glyph: '🐉', desc: '별을 먹고 자란 어린 용. 어려도 용은 용이다.',
             moves: { breath: { name: '별빛 숨결', dmg: 14, addCards: [{ id: 'burn', n: 2, to: 'discard' }] }, tail: { name: '꼬리 휘두르기', dmg: 10, hits: 2 }, roar: { name: '포효', selfSt: { str: 4 }, playerSt: { weak: 1 } } },
             ai: { type: 'cycle', order: ['roar', 'breath', 'tail', 'breath'] } },
    celes: { name: '별을 삼킨 마녀 셀레스', kind: 'boss', boss: true, act: 3, hp: [196, 196], colors: ['#a0b8ff', '#0a0f2a'], glyph: '셀', age: 27,
             desc: '하늘의 별을 하나씩 삼켜 힘을 얻은 대마녀. 별이 다 사라지면 세상도 끝난다고 믿는다.',
             intro: '별은 아름답지. 그러니까 내가 갖는 거야.', death: '…아, 별이… 이렇게 따뜻했구나.',
             moves: { comet: { name: '혜성 낙하', dmg: 18 }, shards: { name: '별 부수기', summon: ['shard', 'shard'], block: 15, say: '반짝반짝, 예쁘지?' }, gravity: { name: '중력장', playerSt: { weak: 2, vuln: 2 }, addCards: [{ id: 'burn', n: 2, to: 'discard' }] },
                      rain: { name: '별의 비', dmg: 5, hits: 5 }, eclipse: { name: '일식', block: 25, selfSt: { str: 3 }, say: '빛이 사라지면 남는 건 나뿐이야.' }, supernova: { name: '초신성', dmg: 32 } },
             phases: [ { ai: { type: 'cycle', order: ['shards', 'comet', 'gravity', 'rain'] } },
                       { at: 0.5, enter: { say: '삼킨 별들이 울고 있어. …시끄러워. 전부 터뜨려 줄게.', clearDebuffs: true, st: { str: 2 } }, ai: { type: 'cycle', order: ['eclipse', 'rain', 'supernova', 'comet'] } } ] },

    // ── 종막
    nyx:   { name: '황혼의 여신 닉스', kind: 'boss', boss: true, final: true, act: 4, hp: [340, 340], colors: ['#ffb36b', '#1a0a2a'], glyph: '닉', age: 29, ageText: '여신 (겉모습 20대 후반)',
             desc: '낮과 밤 사이를 다스리는 황혼의 여신. 이 모든 원정을 지켜보며 기다리고 있었다.',
             intro: '드디어 왔구나. 숲도, 성도, 별도 넘어서. …그럼 마지막 시험이야.', death: '…훌륭해. 황혼은 끝났어. 이제 너희의 아침이야.',
             moves: { dusk: { name: '황혼의 칼날', dmg: 14, hits: 2 }, veil: { name: '노을 장막', block: 25, selfSt: { str: 2 } }, judge: { name: '시간의 심판', playerSt: { weak: 2, vuln: 2 }, addCards: [{ id: 'wound', n: 2, to: 'draw' }] },
                      eclipse: { name: '일몰', dmg: 26 }, star: { name: '저녁별', dmg: 7, hits: 5 }, rebirth: { name: '여명의 서약', heal: 40, block: 30, say: '아직이야. 황혼은 길거든.' }, end: { name: '세계의 끝', dmg: 40 } },
             phases: [ { ai: { type: 'cycle', order: ['dusk', 'judge', 'veil', 'eclipse'] } },
                       { at: 0.66, enter: { say: '좋아. 그럼 밤을 보여 줄게.', clearDebuffs: true, st: { str: 2 } }, ai: { type: 'cycle', order: ['star', 'veil', 'dusk', 'eclipse'] } },
                       { at: 0.33, enter: { say: '마지막 빛까지 다 쓸게. 받아 줘.', clearDebuffs: true, st: { str: 3 } }, ai: { type: 'cycle', first: 'rebirth', order: ['end', 'star', 'veil', 'dusk'] } } ] }
  };

  const ENCOUNTERS = {
    1: { easy: [['slime', 'slime'], ['mia'], ['bat', 'bat', 'bat'], ['wolf'], ['pixie']],
         normal: [['karin'], ['rosa'], ['mia', 'slime'], ['slime', 'slime', 'bat'], ['wolf', 'wolf'], ['pixie', 'bat'], ['wolf', 'slime']],
         elite: [['isabel'], ['mossgolem']], boss: [['morgana']] },
    2: { easy: [['knox'], ['veronica'], ['gargoyle'], ['nina']],
         normal: [['knox'], ['veronica'], ['chloe'], ['nina'], ['gargoyle', 'bat', 'bat'], ['knox', 'bat'], ['chloe', 'puppet']],
         elite: [['rena', 'rina'], ['elisa']], boss: [['belita']] },
    3: { easy: [['starling', 'starling'], ['kage'], ['eve']],
         normal: [['stargolem'], ['kage'], ['eve'], ['starling', 'starling', 'shard'], ['kage', 'shard'], ['eve', 'starling']],
         elite: [['sena'], ['drake']], boss: [['celes']] },
    4: { easy: [], normal: [], elite: [], boss: [['nyx']] }
  };

  // ───────── 유물 ─────────
  const RELICS = {
    red_ribbon:   { name: '붉은 머리끈', icon: '🎀', starter: true, desc: '전투에서 이기면 체력을 8 회복해.' },
    moon_pendant: { name: '달의 펜던트', icon: '🌙', starter: true, desc: '매 전투 첫 턴에 에너지 1, 카드 1장을 더 얻어.' },
    shadow_hood:  { name: '그림자 두건', icon: '🥷', starter: true, desc: '전투 시작 시 표창 3장을 손에 넣어.' },
    holy_sigil:   { name: '성기사의 인장', icon: '🔰', starter: true, desc: '전투 시작 시 방어도 4, 가시 1.' },
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
    sun_pin:      { name: '해바라기 머리핀', icon: '🌻', desc: '3턴마다 에너지를 1 더 얻어.' },
    whetstone:    { name: '숫돌', icon: '🪨', desc: '얻을 때 덱의 무작위 공격 카드 2장을 강화해.' },
    war_paint:    { name: '전투 화장', icon: '💄', desc: '얻을 때 덱의 무작위 스킬 카드 2장을 강화해.' },
    potion_belt:  { name: '물약 벨트', icon: '🎒', desc: '물약 칸이 2개 늘어나.' },
    silk_glove:   { name: '비단 장갑', icon: '🧤', desc: '전투 시작 시 민첩 1.' },
    thorn_crown:  { name: '가시 왕관', icon: '👑', desc: '전투 시작 시 가시 3.' },
    skewer:       { name: '고기 꼬치', icon: '🍢', desc: '전투가 끝났을 때 체력이 절반 이하면 12 회복.' },
    ink_quill:    { name: '마법 깃펜', icon: '🪶', desc: '카드를 10장 낼 때마다 에너지 1.' },
    mirror_shard: { name: '거울 조각', icon: '🔍', desc: '전투 시작 시 모든 적에게 약화 1.' },
    gold_tooth:   { name: '금니', icon: '🦷', desc: '전투에서 이길 때마다 골드 +10.' },
    crystal_ball: { name: '수정구', icon: '🔮', desc: '카드 보상 선택지가 1장 늘어나.' },
    ivy_crown:    { name: '담쟁이 관', icon: '🌿', desc: '새 막에 들어설 때마다 최대 체력 +8.' },
    venom_vial:   { name: '독병 목걸이', icon: '🧪', desc: '전투 시작 시 독 연구 1 (중독 부여 +1).' },
    shuriken_pouch:{ name: '표창 주머니', icon: '🥏', desc: '한 턴에 공격 카드를 3장 낼 때마다 힘 1.' },
    holy_water:   { name: '성수', icon: '💧', desc: '전투 시작 시 재생 4.' },
    bookmark:     { name: '책갈피', icon: '🔖', desc: '한 턴에 스킬 카드를 3장 낼 때마다 카드 1장 뽑기.' },
    vip_card:     { name: '단골 카드', icon: '💳', desc: '카드 제거 비용이 50골드로 고정돼.' },
    oath_ring:    { name: '맹세의 반지', icon: '💍', desc: '휴식에서 카드를 강화하면 체력 8 회복.' },
    b_crown:      { name: '여왕의 왕관', icon: '👸', boss: true, desc: '매 턴 에너지 +1. 카드 보상 선택지가 1장 줄어.' },
    b_ember:      { name: '영원의 불씨', icon: '🕯️', boss: true, desc: '매 턴 에너지 +1. 휴식에서 회복할 수 없어.' },
    b_hourglass:  { name: '별의 모래시계', icon: '⏳', boss: true, desc: '매 턴 카드를 1장 더 뽑아.' },
    b_phoenix:    { name: '불사조 깃털', icon: '🔥', boss: true, desc: '쓰러지면 최대 체력 50%로 한 번 되살아나.' },
    b_giant:      { name: '거인의 심장', icon: '💗', boss: true, desc: '얻을 때 최대 체력 +30, 체력 모두 회복.' },
    b_mask:       { name: '여신의 가면', icon: '🎭', boss: true, desc: '매 턴 에너지 +1. 전투 시작 시 손에 「현기증」 2장.' }
  };

  // ───────── 물약 ─────────
  const POTIONS = {
    heal_p:   { name: '회복 물약', icon: '🧪', anywhere: true, desc: '체력을 20 회복해.', effects: [{ t: 'heal', v: 20 }] },
    str_p:    { name: '힘의 물약', icon: '💪', desc: '힘을 2 얻어.', effects: [{ t: 'self', s: 'str', v: 2 }] },
    dex_p:    { name: '민첩 물약', icon: '🍃', desc: '민첩을 2 얻어.', effects: [{ t: 'self', s: 'dex', v: 2 }] },
    fire_p:   { name: '화염병', icon: '🔥', target: true, desc: '적 하나에게 피해 20.', effects: [{ t: 'rawDmg', v: 20 }] },
    bomb_p:   { name: '폭탄', icon: '💣', desc: '모든 적에게 피해 12.', effects: [{ t: 'rawDmgAll', v: 12 }] },
    block_p:  { name: '방패 물약', icon: '🛡️', desc: '방어도를 12 얻어.', effects: [{ t: 'rawBlock', v: 12 }] },
    energy_p: { name: '에너지 물약', icon: '⚡', desc: '에너지를 2 얻어.', effects: [{ t: 'energy', v: 2 }] },
    draw_p:   { name: '지혜의 물약', icon: '📘', desc: '카드를 3장 뽑아.', effects: [{ t: 'draw', v: 3 }] },
    poison_p: { name: '독병', icon: '☠️', target: true, desc: '적 하나에게 중독 8.', effects: [{ t: 'apply', s: 'poison', v: 8 }] },
    weak_p:   { name: '약화 가루', icon: '🌫️', desc: '모든 적에게 약화 2.', effects: [{ t: 'applyAll', s: 'weak', v: 2 }] },
    regen_p:  { name: '재생 물약', icon: '🌿', desc: '재생 6을 얻어.', effects: [{ t: 'self', s: 'regen', v: 6 }] },
    fairy_p:  { name: '병 속의 요정', icon: '🧚', passive: true, desc: '쓰러질 때 자동으로 최대 체력 30%로 되살아나. (직접 사용 불가)', effects: [] }
  };

  // ───────── 이벤트 ─────────
  // fx: hp, maxHp, heal, healPct, gold, relic('random'), card(id|'rare'|'random'), potion, potion2, upgrade, remove, upgradeRandom,
  //     wound(상처 n장), transform(n), dup(1), fight([적]), losePotion · chance:{p,win,lose} · need:{gold} · needPotion · acts:[막]
  const EVENTS = {
    spring: { title: '달빛 샘', hero: 'sion', acts: [1, 2],
      text: '숲 한가운데, 달빛이 고인 샘이 있어. 시엘이 쪼그려 앉아 물을 들여다보고 있어.\n"이거 마시면 힘이 난대! …아마도? 근데 좀 차가워 보이긴 해."',
      options: [
        { label: '한 모금만 마신다', hint: '체력 15 회복', fx: { heal: 15 }, text: '시원한 물이 목을 타고 내려가. 몸이 한결 가벼워졌어.' },
        { label: '벌컥벌컥 들이켠다', hint: '최대 체력 +8, 체력 -8', fx: { maxHp: 8, hp: -8 }, text: '으슬으슬 떨리더니, 몸 깊은 곳이 단단해지는 느낌이야.' },
        { label: '수면에 얼굴을 비춰 본다', hint: '카드 1장 강화', fx: { upgrade: 1 }, text: '물에 비친 내 모습이 조금 더 자신 있어 보여.' } ] },
    bard: { title: '떠돌이 음유시인', hero: 'lyra',
      text: '모닥불 옆에서 리라가 류트를 튕기고 있어.\n"어, 원정대 맞지? 50골드면 너희 노래 하나 만들어 줄게. 진짜 멋지게!"',
      options: [
        { label: '노래를 의뢰한다', hint: '50골드 → 무작위 유물', need: { gold: 50 }, fx: { gold: -50, relic: 'random' }, text: '"자, 이건 덤이야!" 리라가 노래와 함께 작은 선물을 건네줘.' },
        { label: '같이 부른다', hint: '카드 「응원가」 획득', fx: { card: 'x_song' }, text: '목청껏 같이 불렀더니 리라가 깔깔 웃었어. "너 은근 소질 있다?"' },
        { label: '조용히 듣고 간다', hint: '체력 6 회복', fx: { heal: 6 }, text: '노랫소리를 들으며 잠깐 눈을 붙였어. 개운하다.' } ] },
    armory: { title: '버려진 무기고', hero: 'kaira',
      text: '무너진 성채 지하에서 무기고를 찾았어. 카이라가 창끝으로 먼지 쌓인 상자를 툭툭 건드려.\n"쓸 만한 게 있을 것 같긴 한데… 함정 냄새도 나."',
      options: [
        { label: '상자를 뒤진다', hint: '60%: 희귀 카드 / 40%: 체력 -10', chance: { p: 0.6, win: { fx: { card: 'rare' }, text: '먼지 밑에서 반짝이는 걸 찾았어! 좋은 물건이야.' }, lose: { fx: { hp: -10 }, text: '찰칵. 바늘이 튀어나왔어. 아야야…' } } },
        { label: '녹슨 무기를 정리한다', hint: '덱에서 카드 1장 제거, 체력 -5', fx: { remove: 1, hp: -5 }, text: '손을 좀 베였지만, 짐이 가벼워졌어.' },
        { label: '그냥 지나간다', hint: '아무 일도 없음', fx: {}, text: '괜히 건드렸다가 다치면 손해지.' } ] },
    fortune: { title: '점술가의 천막', hero: 'bell',
      text: '보랏빛 천막 안에서 벨이 수정구를 굴리고 있어.\n"운세 보고 가. 싸게 해 줄게. 30골드. …진짜 싸게 해 준 거야."',
      options: [
        { label: '점을 본다', hint: '30골드 → 물약 1개 + 무작위 카드 1장 강화', need: { gold: 30 }, fx: { gold: -30, potion: 'random', upgradeRandom: 1 }, text: '"오늘 운세는… 대길! 이거 들고 가." 벨이 윙크했어.' },
        { label: '수정구를 슬쩍 만져 본다', hint: '50%: 75골드 / 50%: 체력 -7', chance: { p: 0.5, win: { fx: { gold: 75 }, text: '수정구에서 금화가 우르르 쏟아졌어. 벨 표정이 굳었어.' }, lose: { fx: { hp: -7 }, text: '찌릿! 손끝이 저려. "그러게 내가 만지지 말랬지~"' } } },
        { label: '정중히 거절한다', hint: '아무 일도 없음', fx: {}, text: '"쳇, 다음엔 꼭 보고 가."' } ] },
    lab: { title: '피오의 실험실', hero: 'pio',
      text: '연기가 폴폴 나는 천막. 피오가 고글을 올리며 반겨.\n"딱 좋은 때 왔어! 새 물약 시음해 볼 사람~?"',
      options: [
        { label: '시음한다', hint: '50%: 최대 체력 +10 / 50%: 체력 -8', chance: { p: 0.5, win: { fx: { maxHp: 10 }, text: '몸이 후끈해지더니 기운이 넘쳐! "봐, 성공이잖아!"' }, lose: { fx: { hp: -8 }, text: '펑! 앞머리가 그을렸어. 피오가 슬쩍 눈을 피해.' } } },
        { label: '물약을 사 간다', hint: '40골드 → 물약 2개', need: { gold: 40 }, fx: { gold: -40, potion: 'random', potion2: 'random' }, text: '"단골 할인이야! 다음에도 와~"' },
        { label: '실험을 도와준다', hint: '무작위 카드 1장 변환', fx: { transform: 1 }, text: '조수 노릇을 하다 보니, 가방 속 카드 한 장이 묘하게 변해 있었어.' } ] },
    dojo: { title: '숲속 수련장', hero: 'kaira', acts: [1, 2],
      text: '나무 인형이 줄지어 선 수련장. 카이라가 창을 빙글 돌려.\n"한 판 붙고 갈래? 몸 좀 풀자고."',
      options: [
        { label: '대련한다', hint: '체력 -6, 카드 2장 무작위 강화', fx: { hp: -6, upgradeRandom: 2 }, text: '실컷 굴렀더니 몸이 기억하는 게 생겼어.' },
        { label: '기술을 배운다', hint: '카드 1장 강화', fx: { upgrade: 1 }, text: '"그 동작, 이렇게 하면 더 빨라." 카이라가 웃었어.' },
        { label: '구경만 한다', hint: '체력 5 회복', fx: { heal: 5 }, text: '시원한 바람을 맞으며 쉬었어.' } ] },
    shrine: { title: '잊힌 성소', hero: 'elena',
      text: '덩굴에 덮인 작은 성소. 엘레나가 먼지를 털고 조용히 무릎을 꿇어.\n"여기엔 아직 빛이 남아 있어요."',
      options: [
        { label: '함께 기도한다', hint: '체력 25% 회복', fx: { healPct: 0.25 }, text: '따뜻한 빛이 상처를 감싸 줬어.' },
        { label: '봉헌한다', hint: '75골드 → 카드 1장 제거 + 체력 10 회복', need: { gold: 75 }, fx: { gold: -75, heal: 10, remove: 1 }, text: '마음이 가벼워졌어. 짐도.' },
        { label: '제단을 뒤진다', hint: '유물 획득, 덱에 「상처」 2장', fx: { relic: 'random', wound: 2 }, text: '손에 반짝이는 게 잡혔어. 동시에 묘한 한기가 스며들었어.' } ] },
    duel: { title: '결투 신청', hero: 'sera', acts: [1],
      text: '길 한가운데 흑장미 결투가 이자벨이 서 있어.\n"지나가고 싶으면 날 이겨. 이기면 내 보물을 줄게."',
      options: [
        { label: '결투를 받는다', hint: '엘리트 전투 → 유물 보상', fx: { fight: ['isabel'] }, text: '"좋아. 정정당당하게."' },
        { label: '돌아간다', hint: '아무 일도 없음', fx: {}, text: '"겁쟁이." 등 뒤로 웃음소리가 들려.' } ] },
    mirror: { title: '거울의 방', hero: 'luna', acts: [2, 3],
      text: '사방이 거울인 방. 루나가 하품을 하며 거울을 톡톡 두드려.\n"이 거울, 비친 걸 하나 더 만들어 준대. 신기하지?"',
      options: [
        { label: '카드를 비춰 본다', hint: '덱의 카드 1장 복제', fx: { dup: 1 }, text: '거울 속에서 똑같은 카드가 툭 떨어졌어.' },
        { label: '거울을 깬다', hint: '「상처」 1장, 120골드', fx: { wound: 1, gold: 120 }, text: '쨍그랑! 파편 사이로 금화가 쏟아졌어.' },
        { label: '그냥 나간다', hint: '아무 일도 없음', fx: {}, text: '거울 속 내가 손을 흔들었어. …기분 탓이겠지.' } ] },
    tea: { title: '메이드의 다과회', hero: 'daon', acts: [2],
      text: '성 정원에 차려진 다과회. 다온이 찻잔을 들고 손짓해.\n"여기 니나 씨가 차려 둔 건데, 주인이 없네? 우리끼리 먹자!"',
      options: [
        { label: '케이크를 먹는다', hint: '최대 체력 +5, 체력 10 회복', fx: { maxHp: 5, heal: 10 }, text: '달콤해! 힘이 솟아.' },
        { label: '은식기를 챙긴다', hint: '골드 +60, 50%로 니나와 전투', chance: { p: 0.5, win: { fx: { gold: 60 }, text: '아무도 모르게 챙겼어. 다온이 엄지를 척.' }, lose: { fx: { gold: 60, fight: ['nina'] }, text: '"…손님, 그건 제 거예요."' } } },
        { label: '춤을 춘다', hint: '카드 「극적인 등장」 획득', fx: { card: 'x_entrance' }, text: '다온과 한 곡 추고 나니, 무대 체질이 된 것 같아.' } ] },
    library: { title: '금지된 서고', hero: 'luna', acts: [2, 3],
      text: '천장까지 닿는 책장. 루나 눈이 반짝 빛나.\n"…잠깐만. 진짜 잠깐만 읽고 갈게. 한 시간만."',
      options: [
        { label: '마도서를 읽는다', hint: '무작위 카드 1장 획득', fx: { card: 'random' }, text: '책장 사이에서 쓸 만한 비법을 찾았어.' },
        { label: '밤새 읽는다', hint: '체력 -10, 희귀 카드 1장', fx: { hp: -10, card: 'rare' }, text: '눈은 퀭하지만 머릿속은 반짝반짝해.' },
        { label: '쪽잠을 잔다', hint: '체력 20 회복', fx: { heal: 20 }, text: '책 냄새를 맡으며 푹 잤어.' } ] },
    merchant: { title: '수상한 행상인', hero: 'bell',
      text: '복면을 쓴 행상인… 아니, 벨이잖아?\n"쉿, 비밀 장사야. 특별한 물건 있어. 비싸지만."',
      options: [
        { label: '특별한 물건을 산다', hint: '100골드 → 유물', need: { gold: 100 }, fx: { gold: -100, relic: 'random' }, text: '"좋은 선택이야. 진짜로."' },
        { label: '카드를 판다', hint: '카드 1장 제거, 골드 +40', fx: { gold: 40, remove: 1 }, text: '"이거 꽤 쓸만한데? 고마워~"' },
        { label: '지나친다', hint: '아무 일도 없음', fx: {}, text: '"다음엔 꼭 사 줘~"' } ] },
    stargazer: { title: '별 관측소', hero: 'mir', acts: [3],
      text: '첨탑 중턱의 관측소. 미르가 망원경 너머를 가리켜.\n"저 별, 우리를 보고 있어. 소원 하나 빌어 볼래?"',
      options: [
        { label: '힘을 빈다', hint: '무작위 카드 2장 강화', fx: { upgradeRandom: 2 }, text: '별빛이 카드에 스며들었어.' },
        { label: '건강을 빈다', hint: '최대 체력 +6, 체력 전부 회복', fx: { maxHp: 6, healPct: 1 }, text: '온몸이 따뜻해졌어.' },
        { label: '재물을 빈다', hint: '골드 +100, 「상처」 1장', fx: { gold: 100, wound: 1 }, text: '별똥별과 함께 금화가 떨어졌어. 좀 아팠어.' } ] },
    fallen: { title: '쓰러진 기사', hero: 'aria', acts: [3],
      text: '계단에 쓰러진 기사. 아리아가 달려가 부축해.\n"괜찮아요? …다행이다. 숨은 쉬어요."',
      options: [
        { label: '치료해 준다', hint: '체력 -8, 유물 획득', fx: { hp: -8, relic: 'random' }, text: '"고마워… 이거, 받아 줘." 기사가 작은 부적을 건넸어.' },
        { label: '물약을 나눠 준다', hint: '물약 1개를 잃고 카드 2장 강화', needPotion: true, fx: { losePotion: 1, upgradeRandom: 2 }, text: '"…은혜는 잊지 않겠어." 기사의 축복이 느껴져.' },
        { label: '갈 길을 간다', hint: '아무 일도 없음', fx: {}, text: '미안해요. 우리도 급해서.' } ] },
    campfire: { title: '원정대 야영', hero: 'lyra',
      text: '모닥불 앞에 동료들이 모였어. 리라가 류트를 꺼내.\n"오늘은 노래 대신 이야기 하나 할까? 원하는 걸로!"',
      options: [
        { label: '용기의 이야기', hint: '카드 1장 강화', fx: { upgrade: 1 }, text: '이야기를 듣고 나니 손끝에 힘이 들어가.' },
        { label: '휴식의 이야기', hint: '체력 30% 회복', fx: { healPct: 0.3 }, text: '어느새 다 같이 꾸벅꾸벅 졸고 있었어.' },
        { label: '이별의 이야기', hint: '카드 1장 제거', fx: { remove: 1 }, text: '놓아줘야 할 것을 놓아줬어.' } ] },
    gamble: { title: '도박사의 탁자', hero: 'bell', acts: [2, 3],
      text: '반짝이는 주사위 탁자. 벨이 주사위를 굴리며 씩 웃어.\n"한 판에 50골드. 이기면 두 배~"',
      options: [
        { label: '한 판 한다', hint: '50골드 → 50%: 150골드', need: { gold: 50 }, chance: { p: 0.5, win: { fx: { gold: 100 }, text: '6, 6! 금화가 쏟아져!' }, lose: { fx: { gold: -50 }, text: '1, 2… "아쉽네~" 벨이 금화를 쓸어 갔어.' } } },
        { label: '판을 엎는다', hint: '쌍둥이 암살자와 전투 (엘리트)', fx: { fight: ['rena', 'rina'] }, text: '"어머, 그렇게 나오시겠다?"' },
        { label: '구경만 한다', hint: '아무 일도 없음', fx: {}, text: '보는 것만으로도 손에 땀이 나.' } ] }
  };

  // ───────── 업적 ─────────
  const ACHIEVEMENTS = {
    first_win:  { name: '첫 번째 아침', icon: '🌅', desc: '원정을 처음으로 클리어.' },
    win_sera:   { name: '붉은 검의 전설', icon: '🗡️', desc: '세라로 클리어.' },
    win_luna:   { name: '별을 읽는 자', icon: '🌙', desc: '루나로 클리어.' },
    win_yuki:   { name: '그림자의 끝', icon: '🌑', desc: '유키로 클리어.' },
    win_aria:   { name: '빛의 방패', icon: '🛡️', desc: '아리아로 클리어.' },
    boss_morgana:{ name: '숲을 지나서', icon: '🌲', desc: '숲의 마녀 모르가나 처치.' },
    boss_belita:{ name: '밤의 끝', icon: '🦇', desc: '밤의 여왕 벨리타 처치. → 아리아 합류' },
    boss_celes: { name: '별을 되찾다', icon: '⭐', desc: '별을 삼킨 마녀 셀레스 처치.' },
    boss_nyx:   { name: '황혼 너머', icon: '🌇', desc: '황혼의 여신 닉스 처치.' },
    big_hit:    { name: '혼신의 일격', icon: '💥', desc: '한 번에 피해 40 이상. → 「진홍의 일섬」 해금', card: 'ex_crimson' },
    chain10:    { name: '멈추지 않는 손', icon: '🃏', desc: '한 턴에 카드 10장 사용. → 「초신성」 해금', card: 'ex_nova' },
    poison30:   { name: '독의 대가', icon: '☠️', desc: '적 하나에 중독 30 이상. → 「천 개의 독침」 해금', card: 'ex_venom' },
    block50:    { name: '난공불락', icon: '🏰', desc: '방어도 50 이상 달성. → 「절대 성역」 해금', card: 'ex_aegis' },
    elite10:    { name: '엘리트 사냥꾼', icon: '😈', desc: '엘리트 누적 10회 처치. → 「앙코르」 해금', card: 'ex_encore' },
    kills100:   { name: '백 번의 승리', icon: '⚔️', desc: '적 누적 100 처치.' },
    rich:       { name: '부자 원정대', icon: '💰', desc: '골드 400 이상 보유.' },
    relics12:   { name: '수집가', icon: '🏺', desc: '한 원정에서 유물 12개 보유.' },
    thin_deck:  { name: '미니멀리스트', icon: '✂️', desc: '덱 15장 이하로 3막 보스 처치.' },
    no_dmg_elite:{ name: '완벽한 결투', icon: '✨', desc: '엘리트를 체력 손실 없이 처치.' },
    asc1:       { name: '첫 승천', icon: '🔺', desc: '승천 1 이상으로 클리어.' },
    asc5:       { name: '높은 곳으로', icon: '⛰️', desc: '승천 5 이상으로 클리어.' },
    asc10:      { name: '정점', icon: '🏔️', desc: '승천 10으로 클리어.' },
    collector:  { name: '도감 마스터', icon: '📚', desc: '카드 80종 이상 발견.' }
  };

  // ───────── 갤러리(특별 일러스트) ─────────
  const GALLERY = {
    g_sera:   { title: '붉은 새벽', hero: 'sera', how: '세라로 클리어', cap: '모든 싸움이 끝난 새벽, 세라는 처음으로 칼을 내려놓고 웃었다.' },
    g_luna:   { title: '별 헤는 밤', hero: 'luna', how: '루나로 클리어', cap: '되찾은 별을 하나하나 세다가, 루나는 그대로 잠들었다.' },
    g_yuki:   { title: '그림자의 휴식', hero: 'yuki', how: '유키로 클리어', cap: '처음으로 아무도 쫓지 않는 밤. 유키는 달을 오래 올려다봤다.' },
    g_aria:   { title: '지켜 낸 아침', hero: 'aria', how: '아리아로 클리어', cap: '방패에 비친 아침 햇살이 이렇게 눈부신 줄 몰랐다.' },
    g_morgana:{ title: '숲의 마녀', enemy: 'morgana', how: '모르가나 처치', cap: '숲은 다시 길을 열었다. 모르가나는 꽃 한 송이를 남겼다.' },
    g_belita: { title: '여왕의 무도회', enemy: 'belita', how: '벨리타 처치', cap: '"다음엔 손님이 아니라 친구로 와." 여왕은 그렇게 말했다.' },
    g_celes:  { title: '별의 귀환', enemy: 'celes', how: '셀레스 처치', cap: '셀레스가 품었던 별들이 하늘로 돌아갔다.' },
    g_nyx:    { title: '황혼의 끝', enemy: 'nyx', how: '닉스 처치', cap: '노을 너머에서 여신은 원정대에게 첫 아침을 선물했다.' },
    g_party:  { title: '원정대 단체 사진', hero: 'lyra', how: '히로인 4명 모두로 클리어', cap: '리라가 "하나, 둘, 셋!"을 외치자 모두가 웃었다.' },
    g_asc5:   { title: '정상의 바람', hero: 'kaira', how: '승천 5 이상으로 클리어', cap: '첨탑 꼭대기, 바람마저 축하해 주는 것 같았다.' },
    g_asc10:  { title: '전설의 원정대', hero: 'elena', how: '승천 10으로 클리어', cap: '이 원정은 노래가 되어 오래도록 불렸다.' },
    g_elite:  { title: '라이벌들의 다과회', hero: 'daon', how: '엘리트 누적 10회 처치', cap: '싸웠던 상대들과 차 한 잔. 생각보다 다들 좋은 사람이었다.' }
  };

  // ───────── 승천(난이도) ─────────
  const ASCENSION = [
    '기본 난이도',
    '엘리트 체력 +15%',
    '일반 적 체력 +10%',
    '보스 체력 +10%',
    '적 공격 피해 +10%',
    '막 사이 회복 감소 (잃은 체력의 75%만)',
    '시작 최대 체력 -6',
    '시작 덱에 「상처」 1장',
    '상점 가격 +15%',
    '전투 골드 보상 -25%',
    '보스 시작 시 힘 +2'
  ];

  // ───────── 이미지 연결 ─────────
  // 실제 일러스트는 artmap.js(자동 생성, tools/ingest_art.py)가 window.BD_ARTMAP에 채웁니다.
  // 키: 'card:id', 'hero:id', 'enemy:id', 'gallery:id', 'event:id'
  const ART = root.BD_ARTMAP || {};

  for (const k of Object.keys(CARDS)) CARDS[k].id = k;
  const DATA = { HEROINES, STATUS, ARCH, CLASS_ARCH, CARDS, STARTERS, ACTS, ENEMIES, ENCOUNTERS, RELICS, POTIONS, EVENTS, ACHIEVEMENTS, GALLERY, ASCENSION, ART,
    TITLE: '미녀 덱: 밤의 여왕', VERSION: '1.0.0' };
  root.BD_DATA = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
