// STARFORGE PACT — bootstrap, input and screenshot modes. The game runs
// offline from static files; ?shot=title|play|win|loss renders a fixed state
// for screenshots, ?seed=N deals a fresh deterministic game.
import { aiTakeTurn } from './ai.js';
import { attack, checkEnd, createGame, endTurn, playCard, scriptedTable, startGame } from './engine.js';
import { renderEnd, renderTable, renderTitle } from './render.js';
import { hashSeed } from './rng.js';

const params = new URLSearchParams(location.search);
const seed = params.has('seed') ? Number(params.get('seed')) || 7 : hashSeed(String(Date.now()));
const shot = params.get('shot');

let state = createGame(seed);
if (shot === 'play') state = scriptedTable(seed, 'play');
else if (shot === 'win') state = scriptedTable(seed, 'win');
else if (shot === 'loss') state = scriptedTable(seed, 'loss');

const app = document.getElementById('app');
const statusEl = document.getElementById('status');
let aiRunning = false;

function render() {
  if (state.phase === 'title') renderTitle(app);
  else if (state.phase === 'won') renderEnd(app, state, true);
  else if (state.phase === 'lost') renderEnd(app, state, false);
  else renderTable(app, state);
  const line = state.phase === 'playing'
    ? `Turn ${state.turn}, ${state.active === 'player' ? 'your move' : 'RIVAL thinking'}. Your hull ${state.player.hull}, RIVAL hull ${state.ai.hull}.`
    : state.phase === 'title' ? 'STARFORGE PACT title screen.' : state.phase === 'won' ? 'Victory!' : 'Defeat.';
  statusEl.textContent = line;
}

function runAi() {
  if (aiRunning || state.phase !== 'playing' || state.active !== 'ai') return;
  aiRunning = true;
  const steps = aiTakeTurn(state);
  const step = () => {
    const next = steps.next();
    render();
    if (next.done || state.phase !== 'playing') {
      aiRunning = false;
      render();
      return;
    }
    setTimeout(step, 450);
  };
  setTimeout(step, 500);
}

function playSelectedCard(index) {
  const result = playCard(state, 'player', index);
  if (result.ok) {
    state.selectedHand = -1;
    state.selectedUnit = null;
  }
  render();
}

function onCardClick(cardEl) {
  if (state.phase !== 'playing' || state.active !== 'player') return;
  const index = Number(cardEl.dataset.index);
  if (state.selectedHand === index) {
    playSelectedCard(index);
  } else {
    state.selectedHand = index;
    state.selectedUnit = null;
    render();
  }
}

function onUnitClick(unitEl) {
  if (state.phase !== 'playing' || state.active !== 'player') return;
  const uid = Number(unitEl.dataset.uid);
  const mine = state.player.board.some((u) => u.uid === uid);
  if (mine) {
    state.selectedUnit = state.selectedUnit === uid ? null : uid;
    state.selectedHand = -1;
    render();
    return;
  }
  if (state.selectedUnit !== null) {
    attack(state, 'player', state.selectedUnit, uid);
    state.selectedUnit = null;
    render();
  }
}

function onHeroClick() {
  if (state.phase !== 'playing' || state.active !== 'player') return;
  if (state.selectedUnit !== null) {
    attack(state, 'player', state.selectedUnit, null);
    state.selectedUnit = null;
    render();
  }
}

function endPlayerTurn() {
  if (state.phase !== 'playing' || state.active !== 'player') return;
  state.selectedHand = -1;
  state.selectedUnit = null;
  endTurn(state);
  render();
  runAi();
}

app.addEventListener('click', (event) => {
  const target = event.target;
  if (target.closest('#start-btn') || target.closest('#again-btn')) {
    state = createGame(seed);
    startGame(state);
    render();
    return;
  }
  if (target.closest('#end-btn')) {
    endPlayerTurn();
    return;
  }
  const cardEl = target.closest('.hand .card');
  if (cardEl) {
    onCardClick(cardEl);
    return;
  }
  const unitEl = target.closest('.unit');
  if (unitEl) {
    onUnitClick(unitEl);
    return;
  }
  if (target.closest('.foe-info')) onHeroClick();
});

document.addEventListener('keydown', (event) => {
  if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
    state = createGame(seed);
    startGame(state);
    render();
    return;
  }
  if ((state.phase === 'won' || state.phase === 'lost') && event.key === 'Enter') {
    state = createGame(seed);
    startGame(state);
    render();
    return;
  }
  if (state.phase !== 'playing') return;
  if (event.key >= '1' && event.key <= '7') {
    const index = Number(event.key) - 1;
    if (index < state.player.hand.length) playSelectedCard(index);
  } else if (event.key === 'e' || event.key === 'E') {
    endPlayerTurn();
  } else if (event.key === 'Escape') {
    state.selectedHand = -1;
    state.selectedUnit = null;
    render();
  }
});

render();

// Test hook: the headless play-test drives the same functions the player uses.
window.__pact = {
  get state() { return state; },
  start: () => { state = createGame(seed); startGame(state); render(); },
  playCard: (i) => playSelectedCard(i),
  attack: (uid, target) => { attack(state, 'player', uid, target); render(); },
  endTurn: endPlayerTurn,
  runAiNow: () => {
    // Run the AI synchronously (no animation delays) for testing.
    const steps = aiTakeTurn(state);
    let next = steps.next();
    while (!next.done) next = steps.next();
    render();
  },
};
