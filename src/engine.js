// Moteur de la Chkobba – règles tunisiennes standards
// 40 cartes : 1 à 7, Dame (8), Valet (9), Roi (10) ; 4 couleurs, le carreau = « dinari ».

export const SUITS = ['d', 'h', 's', 'c']; // carreau (dinari), cœur, pique, trèfle
export const SUIT_SYMBOL = { d: '♦', h: '♥', s: '♠', c: '♣' };
export const RANK_LABEL = { 1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: 'D', 9: 'V', 10: 'R' };

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 1; r <= 10; r++) deck.push({ id: `${r}${s}`, r, s });
  return deck;
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const isHaya = (c) => c.r === 7 && c.s === 'd';

// Options de prise pour une carte jouée.
// Règle : s'il existe une carte de même valeur sur la table, on doit prendre une carte de même valeur
// (une seule). Sinon, on doit prendre une combinaison dont la somme est égale à la valeur.
// Retourne une liste d'options, chaque option = tableau de cartes de la table.
export function captureOptions(card, table) {
  const same = table.filter((t) => t.r === card.r);
  if (same.length) return same.map((t) => [t]);
  const opts = [];
  const n = table.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    if ((mask & (mask - 1)) === 0) continue; // au moins 2 cartes
    let sum = 0;
    const pick = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) { sum += table[i].r; pick.push(table[i]); }
    if (sum === card.r) opts.push(pick);
  }
  return opts;
}

export function newMatch({ target = 11, firstPlayer = 0, rnd = Math.random } = {}) {
  return { target, scores: [0, 0], round: 0, firstPlayer, rnd, history: [], over: false, winner: null };
}

// Une manche : 40 cartes, 4 sur la table, 3 par joueur à chaque donne.
export function newRound(match) {
  const rnd = match.rnd || Math.random;
  let deck, table;
  // On redistribue si la table initiale contient 3 cartes ou plus de même valeur (variante courante).
  do {
    deck = shuffle(makeDeck(), rnd);
    table = deck.slice(0, 4);
  } while (hasTriple(table));
  deck = deck.slice(4);
  const starter = (match.firstPlayer + match.round) % 2;
  const r = {
    deck,
    table,
    hands: [[], []],
    piles: [[], []],
    chkobbas: [0, 0],
    turn: starter,
    starter,
    lastTaker: null,
    log: [],
    finished: false,
  };
  deal(r);
  return r;
}

function hasTriple(cards) {
  const c = {};
  for (const x of cards) { c[x.r] = (c[x.r] || 0) + 1; if (c[x.r] >= 3) return true; }
  return false;
}

export function deal(r) {
  for (let k = 0; k < 3; k++) for (let p = 0; p < 2; p++) {
    const i = (r.starter + p) % 2;
    r.hands[i].push(r.deck.shift());
  }
}

// Joue une carte. optionIndex : quelle option de prise (si plusieurs).
// Retourne un événement décrivant le coup.
export function play(r, player, cardId, optionIndex = 0) {
  if (r.finished) throw new Error('manche terminée');
  if (r.turn !== player) throw new Error('pas ton tour');
  const hand = r.hands[player];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error('carte absente');
  const card = hand.splice(idx, 1)[0];
  const opts = captureOptions(card, r.table);
  const ev = { player, card, taken: [], chkobba: false, dealt: false, roundOver: false };
  if (opts.length) {
    const take = opts[Math.min(optionIndex, opts.length - 1)];
    const ids = new Set(take.map((t) => t.id));
    r.table = r.table.filter((t) => !ids.has(t.id));
    r.piles[player].push(card, ...take);
    ev.taken = take;
    r.lastTaker = player;
    const lastCardOfRound = r.deck.length === 0 && r.hands[0].length === 0 && r.hands[1].length === 0;
    if (r.table.length === 0 && !lastCardOfRound) { r.chkobbas[player]++; ev.chkobba = true; }
  } else {
    r.table.push(card);
  }
  r.log.push(ev);
  r.turn = 1 - player;
  if (r.hands[0].length === 0 && r.hands[1].length === 0) {
    if (r.deck.length) { deal(r); ev.dealt = true; }
    else {
      // fin de manche : la table revient au dernier preneur
      if (r.table.length && r.lastTaker !== null) { r.piles[r.lastTaker].push(...r.table); ev.rest = r.table.slice(); ev.restTo = r.lastTaker; r.table = []; }
      r.finished = true;
      ev.roundOver = true;
    }
  }
  return ev;
}

// Comptage d'une manche
export function scoreRound(r) {
  const [a, b] = r.piles;
  const lines = [];
  const pts = [0, 0];
  const cmp = (x, y, key, label, detail) => {
    let w = null;
    if (x > y) w = 0; else if (y > x) w = 1;
    if (w !== null) pts[w]++;
    lines.push({ key, label, values: [x, y], winner: w, detail });
  };
  cmp(a.length, b.length, 'karta', 'Karta (cartes)');
  const dn = (p) => p.filter((c) => c.s === 'd').length;
  cmp(dn(a), dn(b), 'dinari', 'Dinari (carreaux)');
  const haya = [a.some(isHaya) ? 1 : 0, b.some(isHaya) ? 1 : 0];
  cmp(haya[0], haya[1], 'haya', 'Haya (7 de carreau)');
  // Bermila : le plus de 7 ; à égalité, le plus de 6
  const cnt = (p, r) => p.filter((c) => c.r === r).length;
  let s7 = [cnt(a, 7), cnt(b, 7)];
  if (s7[0] !== s7[1]) cmp(s7[0], s7[1], 'bermila', 'Bermila (les 7)');
  else {
    const s6 = [cnt(a, 6), cnt(b, 6)];
    cmp(s6[0], s6[1], 'bermila', 'Bermila (7 à égalité → les 6)');
  }
  for (let p = 0; p < 2; p++) pts[p] += r.chkobbas[p];
  lines.push({ key: 'chkobba', label: 'Chkobba', values: r.chkobbas.slice(), winner: null });
  return { pts, lines };
}

export function applyRound(match, roundScore) {
  match.scores[0] += roundScore.pts[0];
  match.scores[1] += roundScore.pts[1];
  match.round++;
  match.history.push(roundScore);
  const [x, y] = match.scores;
  if ((x >= match.target || y >= match.target) && x !== y) {
    match.over = true;
    match.winner = x > y ? 0 : 1;
  }
  return match;
}
