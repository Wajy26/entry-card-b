// The rules engine of STARFORGE PACT: a two-player deck duel with no hidden
// state beyond the decks. Pure functions over a plain state object, so the
// browser game and the headless play-test drive the exact same rules.
import { buildDeck, cardById } from './cards.js';
import { makeRng, shuffle } from './rng.js';

export const MAX_HULL = 30;
export const MAX_BOARD = 5;
export const MAX_HAND = 7;
export const MAX_ENERGY = 10;

let nextUid = 1;

export function newSide(rng) {
  return {
    hull: MAX_HULL,
    maxHull: MAX_HULL,
    energy: 0,
    maxEnergy: 0,
    deck: buildDeck(rng),
    hand: [],
    board: [],
  };
}

export function createGame(seed) {
  const rng = makeRng(seed);
  const state = {
    seed,
    rng,
    phase: 'title',
    turn: 0,
    active: 'player',
    player: newSide(rng),
    ai: newSide(rng),
    log: [],
    selectedHand: -1,
    selectedUnit: null,
    winner: null,
  };
  return state;
}

export function logLine(state, text) {
  state.log.unshift(text);
  if (state.log.length > 6) state.log.length = 6;
}

function drawCards(state, side, count) {
  const s = state[side];
  for (let i = 0; i < count; i += 1) {
    if (s.deck.length === 0) {
      s.deck = shuffle(buildDeck(state.rng).slice(0, 24), state.rng);
      logLine(state, `${side === 'player' ? 'You' : 'RIVAL'} reshuffle the star deck.`);
    }
    if (s.hand.length >= MAX_HAND) break;
    s.hand.push(s.deck.pop());
  }
}

export function startGame(state) {
  state.phase = 'playing';
  state.turn = 1;
  state.active = 'player';
  drawCards(state, 'player', 3);
  drawCards(state, 'ai', 3);
  beginTurn(state, 'player');
  logLine(state, 'The pact is sealed. Your move, Captain.');
}

export function beginTurn(state, side) {
  const s = state[side];
  s.maxEnergy = Math.min(MAX_ENERGY, state.turn);
  s.energy = s.maxEnergy;
  for (const u of s.board) u.canAttack = true;
  drawCards(state, side, 2);
}

function makeUnit(card) {
  return {
    uid: nextUid,
    cardId: card.id,
    name: card.name,
    faction: card.faction,
    atk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    keyword: card.keyword,
    canAttack: card.keyword === 'SURGE',
  };
}

export function playCard(state, side, handIndex) {
  if (state.phase !== 'playing' || state.active !== side) return { ok: false, why: 'not your turn' };
  const s = state[side];
  const cardId = s.hand[handIndex];
  if (!cardId) return { ok: false, why: 'no such card' };
  const card = cardById(cardId);
  if (s.energy < card.cost) return { ok: false, why: 'not enough energy' };
  if (s.board.length >= MAX_BOARD) return { ok: false, why: 'board is full' };
  s.hand.splice(handIndex, 1);
  s.energy -= card.cost;
  const unit = makeUnit(card);
  nextUid += 1;
  s.board.push(unit);
  const who = side === 'player' ? 'You summon' : 'RIVAL summons';
  logLine(state, `${who} ${card.name} (${card.atk}/${card.hp}).`);
  if (card.keyword === 'BLAST') {
    damageHull(state, side === 'player' ? 'ai' : 'player', 2);
    logLine(state, `${card.name} blasts the enemy hull for 2!`);
  }
  checkEnd(state);
  return { ok: true, unit };
}

export function damageHull(state, side, amount) {
  const s = state[side];
  s.hull = Math.max(0, s.hull - amount);
}

export function healHull(state, side, amount) {
  const s = state[side];
  s.hull = Math.min(s.maxHull, s.hull + amount);
}

function removeDead(state, side) {
  const s = state[side];
  const before = s.board.length;
  s.board = s.board.filter((u) => u.hp > 0);
  if (s.board.length < before) logLine(state, `${before - s.board.length} unit${before - s.board.length > 1 ? 's fall' : ' falls'}.`);
}

export function attack(state, side, attackerUid, targetUid) {
  if (state.phase !== 'playing' || state.active !== side) return { ok: false, why: 'not your turn' };
  const me = state[side];
  const foe = state[side === 'player' ? 'ai' : 'player'];
  const attacker = me.board.find((u) => u.uid === attackerUid);
  if (!attacker) return { ok: false, why: 'no such unit' };
  if (!attacker.canAttack) return { ok: false, why: 'unit already attacked' };
  if (targetUid === null) {
    if (foe.board.some((u) => u.keyword === 'SHIELD')) return { ok: false, why: 'a SHIELD guard blocks the way' };
    damageHull(state, side === 'player' ? 'ai' : 'player', attacker.atk);
    if (attacker.keyword === 'DRAIN') healHull(state, side, attacker.atk);
    attacker.canAttack = false;
    logLine(state, `${attacker.name} strikes the enemy hull for ${attacker.atk}!`);
  } else {
    const target = foe.board.find((u) => u.uid === targetUid);
    if (!target) return { ok: false, why: 'no such target' };
    if (foe.board.some((u) => u.keyword === 'SHIELD' && u.uid !== targetUid)) {
      return { ok: false, why: 'a SHIELD guard must be attacked first' };
    }
    target.hp -= attacker.atk;
    attacker.hp -= target.atk;
    if (attacker.keyword === 'DRAIN') healHull(state, side, attacker.atk);
    attacker.canAttack = false;
    logLine(state, `${attacker.name} hits ${target.name} for ${attacker.atk}.`);
  }
  removeDead(state, 'player');
  removeDead(state, 'ai');
  checkEnd(state);
  return { ok: true };
}

export function endTurn(state) {
  if (state.phase !== 'playing') return { ok: false };
  state.active = state.active === 'player' ? 'ai' : 'player';
  if (state.active === 'player') state.turn += 1;
  beginTurn(state, state.active);
  return { ok: true };
}

export function checkEnd(state) {
  if (state.phase !== 'playing') return;
  if (state.ai.hull <= 0) {
    state.phase = 'won';
    state.winner = 'player';
    logLine(state, 'RIVAL hull shattered. Victory!');
  } else if (state.player.hull <= 0) {
    state.phase = 'lost';
    state.winner = 'ai';
    logLine(state, 'Your hull is gone. The pact is broken.');
  }
}

// A fixed, readable mid-game table used by the ?shot=play / win / loss
// screenshots so every render shows the same duel.
export function scriptedTable(seed, outcome) {
  const state = createGame(seed);
  state.phase = 'playing';
  state.turn = 4;
  state.active = 'player';
  const place = (side, cardId, hpOverride) => {
    const card = cardById(cardId);
    const unit = makeUnit(card);
    nextUid += 1;
    if (hpOverride !== undefined) unit.hp = hpOverride;
    unit.canAttack = true;
    state[side].board.push(unit);
    return unit;
  };
  state.player.hull = outcome === 'loss' ? 0 : 24;
  state.ai.hull = outcome === 'win' ? 0 : 19;
  state.player.energy = 6;
  state.player.maxEnergy = 6;
  state.ai.energy = 4;
  state.ai.maxEnergy = 4;
  state.player.hand = ['solar-flare', 'dawn-paladin', 'void-leech', 'sun-lance', 'blizzard-wyrm'];
  state.ai.hand = ['moss-golem', 'null-wraith', 'frost-sprite', 'thorn-brute', 'glacial-warden'];
  place('player', 'dawn-paladin');
  place('player', 'void-stalker');
  place('player', 'moss-golem', 3);
  place('ai', 'glacial-warden');
  place('ai', 'null-wraith');
  state.log = [
    'RIVAL summons Null Wraith (4/3).',
    'You summon Dawn Paladin (3/4).',
    'Solar Flare blasts the enemy hull for 2!',
    'Turn 4 — the pact is sealed. Your move, Captain.',
  ];
  if (outcome === 'win') {
    state.phase = 'won';
    state.winner = 'player';
  } else if (outcome === 'loss') {
    state.phase = 'lost';
    state.winner = 'ai';
  }
  return state;
}
