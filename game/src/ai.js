// RIVAL, the AI opponent of STARFORGE PACT. It reads the table and counters:
// it plays its biggest affordable units first, breaks SHIELD guards before it
// goes for the hull, and finishes off wounded units it can kill.
import { cardById } from './cards.js';
import { attack, endTurn, playCard } from './engine.js';

export function* aiTakeTurn(state) {
  // Summon: most expensive affordable card first, while the board has room.
  for (;;) {
    const hand = state.ai.hand;
    let best = -1;
    let bestCost = -1;
    for (let i = 0; i < hand.length; i += 1) {
      const card = cardById(hand[i]);
      if (card.cost <= state.ai.energy && card.cost > bestCost && state.ai.board.length < 5) {
        best = i;
        bestCost = card.cost;
      }
    }
    if (best === -1) break;
    const result = playCard(state, 'ai', best);
    if (!result.ok) break;
    yield { type: 'play', card: result.unit.name };
  }
  // Attack: each ready unit picks a target it can read and counter.
  for (const unit of state.ai.board.slice()) {
    if (state.phase !== 'playing') return;
    if (!unit.canAttack) continue;
    const guards = state.player.board.filter((u) => u.keyword === 'SHIELD');
    const killable = state.player.board.filter((u) => u.hp <= unit.atk);
    let targetUid = null;
    if (guards.length > 0) {
      targetUid = guards[0].uid;
    } else if (killable.length > 0) {
      killable.sort((a, b) => b.atk - a.atk);
      targetUid = killable[0].uid;
    } else if (state.player.board.length > 0 && unit.hp > 3) {
      const weakest = state.player.board.slice().sort((a, b) => a.hp - b.hp)[0];
      targetUid = weakest.uid;
    }
    attack(state, 'ai', unit.uid, targetUid);
    yield { type: 'attack', unit: unit.name, target: targetUid };
  }
  endTurn(state);
  yield { type: 'done' };
}
