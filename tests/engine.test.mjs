import assert from 'node:assert/strict';
import { makeDeck, captureOptions, newMatch, newRound, play, scoreRound, applyRound } from '../src/engine.js';
import { chooseMove } from '../src/ai.js';

const c = (r, s = 'h') => ({ id: `${r}${s}`, r, s });

// Jeu de 40 cartes
const deck = makeDeck();
assert.equal(deck.length, 40);
assert.equal(new Set(deck.map((x) => x.id)).size, 40);
assert.equal(deck.reduce((s, x) => s + x.r, 0), 4 * 55);

// Prise : la même valeur prime sur la somme
let o = captureOptions(c(5), [c(5, 's'), c(2), c(3)]);
assert.deepEqual(o.map((x) => x.map((y) => y.id)), [['5s']]);
// Somme
o = captureOptions(c(7), [c(3), c(4), c(2), c(5)]);
assert.equal(o.length, 2);
// Pas de prise
assert.equal(captureOptions(c(1), [c(3), c(4)]).length, 0);

// Parties complètes IA contre IA : 40 cartes conservées, points cohérents
let rounds = 0;
for (let g = 0; g < 300; g++) {
  const m = newMatch({ target: 11 });
  while (!m.over) {
    const r = newRound(m);
    let guard = 0;
    while (!r.finished) {
      const mv = chooseMove(r, r.turn, g % 2 ? 'normal' : 'facile');
      play(r, r.turn, mv.cardId, mv.optionIndex);
      assert.ok(++guard <= 40);
    }
    assert.equal(r.piles[0].length + r.piles[1].length, 40, 'toutes les cartes ramassées');
    assert.equal(guard, 36);
    const sc = scoreRound(r);
    const base = sc.lines.filter((l) => l.key !== 'chkobba' && l.winner !== null).length;
    assert.equal(sc.pts[0] + sc.pts[1], base + r.chkobbas[0] + r.chkobbas[1]);
    applyRound(m, sc);
    rounds++;
    assert.ok(m.round < 60);
  }
  assert.ok(m.scores[m.winner] >= 11);
}
console.log(`OK – ${rounds} manches simulées`);

// L'IA « normal » doit battre l'IA « facile » nettement
let wins = 0;
for (let g = 0; g < 200; g++) {
  const m = newMatch({ target: 11, firstPlayer: g % 2 });
  while (!m.over) {
    const r = newRound(m);
    while (!r.finished) {
      const mv = chooseMove(r, r.turn, r.turn === 0 ? 'normal' : 'facile');
      play(r, r.turn, mv.cardId, mv.optionIndex);
    }
    applyRound(m, scoreRound(r));
  }
  if (m.winner === 0) wins++;
}
console.log(`IA normal bat IA facile : ${wins}/200`);
assert.ok(wins > 120);
