// DOM rendering for STARFORGE PACT: title screen, duel table, win and loss
// screens. Cards are real DOM, so every value stays legible at thumbnail size.
import { FACTIONS, KEYWORDS, cardById } from './cards.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function cardElement(card, opts = {}) {
  const f = FACTIONS[card.faction];
  const cardEl = el('div', `card fac-${card.faction}${opts.small ? ' small' : ''}${opts.playable === false ? ' dim' : ''}`);
  cardEl.style.setProperty('--fc', f.color);
  cardEl.style.setProperty('--fd', f.dark);
  const cost = el('div', 'card-cost', String(card.cost));
  const art = el('div', 'card-art', f.symbol);
  const name = el('div', 'card-name', card.name);
  const kw = el('div', 'card-keyword', card.keyword || '');
  const stats = el('div', 'card-stats');
  stats.append(el('span', 'atk', `⚔ ${card.atk}`), el('span', 'hp', `♥ ${card.hp}`));
  cardEl.append(cost, art, name, kw, stats);
  cardEl.title = card.keyword ? `${card.keyword}: ${KEYWORDS[card.keyword]}` : card.text;
  return cardEl;
}

export function unitElement(unit) {
  const card = cardById(unit.cardId);
  const f = FACTIONS[card.faction];
  const unitEl = el('div', `unit fac-${card.faction}${unit.canAttack ? ' ready' : ''}`);
  unitEl.style.setProperty('--fc', f.color);
  unitEl.style.setProperty('--fd', f.dark);
  unitEl.dataset.uid = String(unit.uid);
  unitEl.append(
    el('div', 'unit-symbol', f.symbol),
    el('div', 'unit-name', unit.name),
    el('div', 'unit-kw', unit.keyword || ''),
  );
  const stats = el('div', 'unit-stats');
  stats.append(el('span', 'atk', `⚔ ${unit.atk}`), el('span', 'hp', `♥ ${unit.hp}`));
  unitEl.append(stats);
  return unitEl;
}

function hullBar(side, label) {
  const wrap = el('div', 'hull-wrap');
  const name = el('div', 'hull-name', label);
  const bar = el('div', 'hull-bar');
  const fill = el('div', 'hull-fill');
  fill.style.width = `${Math.round((side.hull / side.maxHull) * 100)}%`;
  bar.append(fill);
  const num = el('div', 'hull-num', `${side.hull} / ${side.maxHull} HULL`);
  wrap.append(name, bar, num);
  return wrap;
}

function energyPips(side) {
  const wrap = el('div', 'energy');
  wrap.append(el('span', 'energy-label', 'ENERGY'));
  for (let i = 0; i < side.maxEnergy; i += 1) {
    wrap.append(el('span', `pip${i < side.energy ? ' on' : ''}`, '⬢'));
  }
  wrap.append(el('span', 'energy-num', `${side.energy}/${side.maxEnergy}`));
  return wrap;
}

export function renderTitle(app) {
  app.innerHTML = '';
  const screen = el('div', 'screen title-screen');
  screen.append(
    el('div', 'title-kicker', 'A DECK DUEL AMONG THE STARS'),
    el('h1', 'title', 'STARFORGE'),
    el('h2', 'subtitle', '✦ PACT ✦'),
    el('p', 'tagline', 'Forge your crew. Break their hull. Seal the pact.'),
  );
  const rules = el('div', 'title-rules');
  rules.append(
    el('div', 'rule', '◆ Summon units with energy — it grows every turn'),
    el('div', 'rule', '▲ Attack with your units, or strike the enemy hull'),
    el('div', 'rule', '● SHIELD guards must fall first — SURGE strikes at once'),
    el('div', 'rule', '■ Reduce the RIVAL hull from 30 to 0 to win'),
  );
  screen.append(rules);
  const btn = el('button', 'big-btn', '▶  SEAL THE PACT');
  btn.id = 'start-btn';
  screen.append(btn);
  screen.append(el('p', 'hint', 'Mouse or keys 1–7 to play cards · E to end turn · Enter to start'));
  const sample = el('div', 'title-cards');
  for (const id of ['event-horizon', 'solar-flare', 'blizzard-wyrm']) {
    sample.append(cardElement(cardById(id)));
  }
  screen.append(sample);
  app.append(screen);
}

export function renderTable(app, state) {
  app.innerHTML = '';
  const table = el('div', 'table');

  // Opponent row: portrait, hull, face-down hand.
  const foe = el('div', 'foe-row');
  const foeInfo = el('div', 'foe-info');
  foeInfo.append(el('div', 'portrait rival', '🤖'), el('div', 'foe-name', 'RIVAL // NEBULA-9'));
  foeInfo.append(hullBar(state.ai, 'RIVAL HULL'));
  foe.append(foeInfo);
  const foeHand = el('div', 'hand backs');
  for (let i = 0; i < state.ai.hand.length; i += 1) {
    const back = el('div', 'card-back', '✦');
    foeHand.append(back);
  }
  foe.append(foeHand);
  table.append(foe);

  // Middle: the two boards, with a turn banner between them.
  const mid = el('div', 'mid');
  const aiBoard = el('div', 'board-row');
  for (const u of state.ai.board) aiBoard.append(unitElement(u));
  if (state.ai.board.length === 0) aiBoard.append(el('div', 'board-empty', 'RIVAL field is empty'));
  const banner = el('div', 'banner');
  banner.append(el('span', 'turn-label', `TURN ${state.turn}`));
  banner.append(el('span', 'turn-who', state.active === 'player' ? '— YOUR MOVE —' : '— RIVAL THINKS —'));
  const myBoard = el('div', 'board-row mine');
  for (const u of state.player.board) myBoard.append(unitElement(u));
  if (state.player.board.length === 0) myBoard.append(el('div', 'board-empty', 'Your field is empty — play a card!'));
  mid.append(aiBoard, banner, myBoard);
  table.append(mid);

  // Player row: hull, energy, hand, end-turn button.
  const me = el('div', 'me-row');
  const meInfo = el('div', 'me-info');
  meInfo.append(el('div', 'portrait you', '🧑‍🚀'), el('div', 'foe-name', 'YOU // CAPTAIN'));
  meInfo.append(hullBar(state.player, 'YOUR HULL'));
  meInfo.append(energyPips(state.player));
  me.append(meInfo);
  const hand = el('div', 'hand');
  state.player.hand.forEach((cardId, i) => {
    const card = cardById(cardId);
    const cEl = cardElement(card, { playable: state.active === 'player' && state.player.energy >= card.cost });
    cEl.dataset.index = String(i);
    cEl.dataset.key = String(i + 1);
    if (state.selectedHand === i) cEl.classList.add('selected');
    hand.append(cEl);
  });
  me.append(hand);
  const controls = el('div', 'controls');
  const endBtn = el('button', 'end-btn', 'END TURN ⏎ (E)');
  endBtn.id = 'end-btn';
  endBtn.disabled = state.active !== 'player';
  controls.append(endBtn);
  const logBox = el('div', 'log');
  for (const line of state.log) logBox.append(el('div', 'log-line', line));
  controls.append(logBox);
  me.append(controls);
  table.append(me);

  app.append(table);
}

export function renderEnd(app, state, won) {
  renderTable(app, state);
  const overlay = el('div', 'end-overlay');
  const panel = el('div', won ? 'end-panel win' : 'end-panel loss');
  panel.append(el('div', 'end-kicker', won ? 'THE PACT IS YOURS' : 'THE PACT IS BROKEN'));
  panel.append(el('h1', 'end-title', won ? '★ VICTORY ★' : '✖ DEFEAT ✖'));
  panel.append(el('p', 'end-text', won
    ? 'RIVAL hull shattered. The stars remember your name, Captain.'
    : 'Your hull is gone. The RIVAL sails on — forge a better crew and try again.'));
  panel.append(el('div', 'end-score', `Final hull — You ${state.player.hull} · RIVAL ${state.ai.hull} · Turn ${state.turn}`));
  const btn = el('button', 'big-btn', '↻  PLAY AGAIN');
  btn.id = 'again-btn';
  panel.append(btn);
  panel.append(el('p', 'hint', 'Press Enter to play again'));
  overlay.append(panel);
  app.append(overlay);
}
