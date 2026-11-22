// The card pool of STARFORGE PACT. Four original factions, each told apart by
// colour AND shape, never by text alone: VOID ◆ violet, SOLAR ▲ amber,
// FROST ● cyan, TERRA ■ green. Keywords: SURGE attacks the turn it is played,
// SHIELD must be attacked before anything else, BLAST hits the enemy hull on
// play, DRAIN heals its owner for the damage it deals.
export const FACTIONS = {
  void: { name: 'VOID', symbol: '◆', color: '#b06cff', glow: '#7a2fd0', dark: '#2c1445' },
  solar: { name: 'SOLAR', symbol: '▲', color: '#ff9a3c', glow: '#c85f00', dark: '#452505' },
  frost: { name: 'FROST', symbol: '●', color: '#4fd8ff', glow: '#0e7ea8', dark: '#082f3d' },
  terra: { name: 'TERRA', symbol: '■', color: '#7ee081', glow: '#2f8f3a', dark: '#122f16' },
};

export const KEYWORDS = {
  SURGE: 'Attacks the turn it is played',
  SHIELD: 'Enemies must attack this first',
  BLAST: 'Deal 2 damage to the enemy hull when played',
  DRAIN: 'Heals your hull for the damage it deals',
};

export const CARDS = [
  { id: 'sun-lance', name: 'Sun Lance', faction: 'solar', cost: 1, atk: 2, hp: 1, keyword: null, text: 'A spear of captured dawn.' },
  { id: 'frost-sprite', name: 'Frost Sprite', faction: 'frost', cost: 1, atk: 1, hp: 2, keyword: null, text: 'It giggles as the air freezes.' },
  { id: 'void-stalker', name: 'Void Stalker', faction: 'void', cost: 2, atk: 3, hp: 2, keyword: null, text: 'It hunts between the stars.' },
  { id: 'moss-golem', name: 'Moss Golem', faction: 'terra', cost: 2, atk: 2, hp: 4, keyword: null, text: 'Old stone, patient roots.' },
  { id: 'thorn-brute', name: 'Thorn Brute', faction: 'terra', cost: 3, atk: 4, hp: 2, keyword: 'SURGE', text: 'Bursts from the soil swinging.' },
  { id: 'null-wraith', name: 'Null Wraith', faction: 'void', cost: 3, atk: 4, hp: 3, keyword: 'SURGE', text: 'It arrives before it leaves.' },
  { id: 'dawn-paladin', name: 'Dawn Paladin', faction: 'solar', cost: 3, atk: 3, hp: 4, keyword: 'SHIELD', text: 'Her oath is a wall of light.' },
  { id: 'void-leech', name: 'Void Leech', faction: 'void', cost: 3, atk: 3, hp: 3, keyword: 'DRAIN', text: 'It drinks starlight and wounds.' },
  { id: 'solar-flare', name: 'Solar Flare', faction: 'solar', cost: 4, atk: 5, hp: 3, keyword: 'BLAST', text: 'A sun, briefly, in your hand.' },
  { id: 'glacial-warden', name: 'Glacial Warden', faction: 'frost', cost: 4, atk: 3, hp: 6, keyword: 'SHIELD', text: 'Winter stands guard here.' },
  { id: 'event-horizon', name: 'Event Horizon', faction: 'void', cost: 5, atk: 6, hp: 6, keyword: 'SHIELD', text: 'Nothing returns from its edge.' },
  { id: 'blizzard-wyrm', name: 'Blizzard Wyrm', faction: 'frost', cost: 6, atk: 7, hp: 5, keyword: null, text: 'The storm, given teeth.' },
];

export function cardById(id) {
  return CARDS.find((c) => c.id === id);
}

// A 24-card deck: two copies of each card, shuffled with the game's RNG.
export function buildDeck(rng) {
  const ids = [];
  for (const c of CARDS) ids.push(c.id, c.id);
  const order = ids.slice();
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
