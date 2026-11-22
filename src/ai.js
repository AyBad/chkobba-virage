import { captureOptions, isHaya } from './engine.js';

const cardValue = (c) => 1 + (c.s === 'd' ? 1.4 : 0) + (c.r === 7 ? 2.5 : 0) + (c.r === 6 ? 0.8 : 0) + (isHaya(c) ? 25 : 0);

// Risque qu'une table laisse une chkobba à l'adversaire
function sweepRisk(table) {
  if (!table.length) return 0;
  if (table.length === 1) return 14; // une seule carte : l'adversaire la prend avec la même valeur
  const sum = table.reduce((s, c) => s + c.r, 0);
  return sum <= 10 ? 11 : 0;
}

// Retourne { cardId, optionIndex }
export function chooseMove(r, player, level = 'normal', rnd = Math.random) {
  const hand = r.hands[player];
  const lastOfRound = r.deck.length === 0 && r.hands[0].length + r.hands[1].length === 1;
  const moves = [];
  for (const card of hand) {
    const opts = captureOptions(card, r.table);
    if (opts.length) {
      opts.forEach((take, i) => {
        const ids = new Set(take.map((t) => t.id));
        const rest = r.table.filter((t) => !ids.has(t.id));
        let score = cardValue(card) + take.reduce((s, c) => s + cardValue(c), 0);
        if (!rest.length && !lastOfRound) score += 30;
        score -= sweepRisk(rest);
        moves.push({ cardId: card.id, optionIndex: i, score });
      });
    } else {
      const rest = [...r.table, card];
      let score = -cardValue(card) * 1.6 - sweepRisk(rest);
      // garder les cartes hautes qui « couvrent » la table est utile : on préfère poser une carte qu'on peut reprendre
      if (hand.some((h) => h !== card && h.r === card.r)) score += 2;
      moves.push({ cardId: card.id, optionIndex: 0, score });
    }
  }
  if (level === 'facile') {
    // joue souvent au hasard
    if (rnd() < 0.55) return moves[Math.floor(rnd() * moves.length)];
  }
  const noise = level === 'facile' ? 6 : level === 'normal' ? 1.5 : 0;
  moves.forEach((m) => (m.score += (rnd() - 0.5) * noise));
  moves.sort((a, b) => b.score - a.score);
  return moves[0];
}
