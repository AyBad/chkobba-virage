import './style.css';
import { App } from '@capacitor/app';
import { CLUBS, clubById } from './clubs.js';
import { SUIT_SYMBOL, RANK_LABEL, captureOptions, newMatch, newRound, play, scoreRound, applyRound, isHaya } from './engine.js';
import { chooseMove } from './ai.js';
import * as audio from './audio.js';
import { runIntro } from './intro.js';
import { drawTifo } from './tifo.js';
import { store, save, dailyMissions, track, claim, tifoRevealed, TIFO_CELLS, TABLES, BACKS, resetAll } from './store.js';

const app = document.getElementById('app');
const S = () => store();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
audio.setSoundEnabled(S().settings.sound);

function myClub() { return clubById(S().profile?.club || 'tunis-ro'); }
function setTheme(club) {
  const r = document.documentElement.style;
  r.setProperty('--c1', club.c1);
  r.setProperty('--c2', club.c2);
  r.setProperty('--ink', club.ink);
}

// ================= Animation d'ouverture (à chaque lancement) =================
function showIntro() {
  const club = myClub();
  setTheme(club);
  app.innerHTML = `
    <div class="intro">
      <canvas id="introCanvas"></canvas>
      <div class="intro-ui" id="introUi">
        <button class="btn-enter" id="enterBtn">Entrer au virage</button>
        <div class="intro-hint">Touchez pour ouvrir les portes du stade 🔊</div>
      </div>
      <button class="intro-skip" id="skipBtn">Passer ›</button>
    </div>`;
  const ui = document.getElementById('introUi');
  const ctl = runIntro(document.getElementById('introCanvas'), club, {
    onTitle: () => ui.classList.add('show'),
  });
  const enter = () => {
    audio.unlock();
    audio.stadiumIntro(club);
    ctl.stop();
    S().profile ? showHome() : showOnboarding();
  };
  document.getElementById('enterBtn').onclick = (e) => { e.stopPropagation(); enter(); };
  document.getElementById('skipBtn').onclick = (e) => { e.stopPropagation(); ctl.skip(); };
  document.querySelector('.intro').addEventListener('click', () => {
    audio.unlock();
    if (ui.classList.contains('show')) enter(); else ctl.skip();
  });
}

// ================= Première ouverture : pseudo, club, groupe =================
function showOnboarding(step = 0, draft = { pseudo: '', club: CLUBS[0].id, group: '' }) {
  setTheme(clubById(draft.club));
  if (step === 0) {
    app.innerHTML = `
      <div class="screen onboard">
        <div class="ob-step">1 / 3</div>
        <h1>Ton nom en tribune</h1>
        <p class="muted">C'est le nom que verront les autres supporters.</p>
        <input id="pseudo" maxlength="18" placeholder="Ex. : Hamma du virage" value="${esc(draft.pseudo)}" autocomplete="off" />
        <button class="btn primary" id="next">Suivant</button>
      </div>`;
    const inp = document.getElementById('pseudo');
    inp.focus();
    document.getElementById('next').onclick = () => {
      const v = inp.value.trim();
      if (!v) { inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); return; }
      draft.pseudo = v;
      showOnboarding(1, draft);
    };
  } else if (step === 1) {
    app.innerHTML = `
      <div class="screen onboard">
        <div class="ob-step">2 / 3</div>
        <h1>Ton club</h1>
        <p class="muted">Tes cartes, ta table et ton chant prennent ses couleurs.</p>
        <div class="club-grid">
          ${CLUBS.map((c) => `
            <button class="club-pick ${c.id === draft.club ? 'sel' : ''}" data-club="${c.id}" style="--a:${c.c1};--b:${c.c2}">
              <span class="scarf"></span><b>${esc(c.name)}</b>
            </button>`).join('')}
        </div>
        <div class="row">
          <button class="btn ghost" id="listen">🔊 Écouter le chant</button>
          <button class="btn primary" id="next">Suivant</button>
        </div>
        <p class="tiny muted">Clubs fictifs décrits par leur ville et leurs couleurs. Les noms et logos officiels viendront après accord des ayants droit.</p>
      </div>`;
    app.querySelectorAll('.club-pick').forEach((b) => b.onclick = () => {
      draft.club = b.dataset.club;
      audio.sfx('tap');
      showOnboarding(1, draft);
    });
    document.getElementById('listen').onclick = () => { audio.unlock(); audio.previewChant(clubById(draft.club)); };
    document.getElementById('next').onclick = () => { audio.stopAll(); showOnboarding(2, draft); };
  } else {
    const club = clubById(draft.club);
    const suggestions = [`Ultras ${club.city}`, `Curva ${club.city}`, `Les Fous du ${club.city}`, `Brigade ${club.c1 === '#141414' ? 'Noire' : 'Rouge'}`];
    app.innerHTML = `
      <div class="screen onboard">
        <div class="ob-step">3 / 3</div>
        <h1>Ton groupe de virage</h1>
        <p class="muted">Crée ton groupe : ses victoires rempliront votre tifo.</p>
        <input id="group" maxlength="22" placeholder="Nom du groupe" value="${esc(draft.group || suggestions[0])}" />
        <div class="chips">${suggestions.map((s) => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        <button class="btn primary big" id="done">Entrer dans le virage</button>
      </div>`;
    app.querySelectorAll('.chip').forEach((b) => b.onclick = () => { document.getElementById('group').value = b.dataset.s; });
    document.getElementById('done').onclick = () => {
      const g = document.getElementById('group').value.trim() || suggestions[0];
      S().profile = { pseudo: draft.pseudo, club: draft.club, group: { name: g, motto: 'Toujours debout' }, created: Date.now() };
      S().stats.points += 30; // cadeau de bienvenue : les 2 premières cases du tifo
      save();
      audio.tableEntrance(club);
      showHome();
    };
  }
}

// ================= Accueil =================
function header(title, back = true) {
  return `<header class="topbar">${back ? '<button class="icon-btn" data-go="home">‹</button>' : '<span></span>'}<h2>${esc(title)}</h2><span></span></header>`;
}

function showHome() {
  const p = S().profile;
  const club = myClub();
  setTheme(club);
  const st = S().stats;
  const missions = dailyMissions();
  const ready = missions.filter((m) => m.value >= m.goal && !m.claimed).length;
  app.innerHTML = `
    <div class="screen home">
      <div class="banner">
        <div class="banner-stripes"></div>
        <div class="banner-txt">
          <div class="small">${esc(club.name)}</div>
          <div class="gname">${esc(p.group.name)}</div>
          <div class="small">Capo : ${esc(p.pseudo)}</div>
        </div>
        <button class="icon-btn settings" data-go="settings">⚙︎</button>
      </div>
      <div class="kpis">
        <div><b>${st.wins}</b><span>victoires</span></div>
        <div><b>${st.chkobbas}</b><span>chkobba</span></div>
        <div><b>${st.points}</b><span>points virage</span></div>
      </div>
      <button class="btn play" data-go="play">
        <span>JOUER</span><small>Contre l'IA · ${S().settings.target} points · ${S().settings.level}</small>
      </button>
      <div class="tiles">
        <button class="tile" data-go="tifo"><span class="ico">🎨</span><b>Le tifo</b><small>${tifoRevealed()}/${TIFO_CELLS} cases</small></button>
        <button class="tile" data-go="missions"><span class="ico">🎯</span><b>Missions</b><small>${ready ? `${ready} à récupérer` : 'du jour'}</small>${ready ? '<i class="dot"></i>' : ''}</button>
        <button class="tile" data-go="chants"><span class="ico">📣</span><b>Chants</b><small>du virage</small></button>
        <button class="tile" data-go="vestiaire"><span class="ico">🧣</span><b>Vestiaire</b><small>tables et dos</small></button>
        <button class="tile soon"><span class="ico">⚔️</span><b>Derby en ligne</b><small>bientôt</small></button>
        <button class="tile" data-go="rules"><span class="ico">📖</span><b>Règles</b><small>Chkobba tunisienne</small></button>
      </div>
    </div>`;
}

app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (!b) return;
  audio.unlock();
  audio.sfx('tap');
  const go = b.dataset.go;
  if (go !== 'play') audio.stopAll();
  ({ home: showHome, play: startMatch, tifo: showTifo, missions: showMissions, chants: showChants, rules: showRules, settings: showSettings, vestiaire: showVestiaire })[go]?.();
});

// ================= Partie =================
let G = null; // état de la partie en cours

function rivalClub() {
  const mine = myClub();
  const others = CLUBS.filter((c) => c.id !== mine.id);
  return others[Math.floor(Math.random() * others.length)];
}

function startMatch() {
  const rival = rivalClub();
  G = {
    match: newMatch({ target: S().settings.target, firstPlayer: Math.random() < 0.5 ? 0 : 1 }),
    round: null,
    rival,
    busy: false,
    preview: null,
    timer: null,
    left: 0,
    lostRound: false,
    matchStats: { chkobbas: 0, hayas: 0, bermilas: 0 },
  };
  audio.tableEntrance(myClub());
  nextRound();
}

function nextRound() {
  G.round = newRound(G.match);
  G.busy = false;
  renderGame();
  audio.sfx('deal');
  dealAnim();
  if (G.round.turn === 1) aiTurn(); else startTimer();
}

function cardHTML(c, extra = '') {
  const red = c.s === 'd' || c.s === 'h';
  return `<div class="card ${red ? 'red' : ''} ${isHaya(c) ? 'haya' : ''} ${extra}" data-id="${c.id}">
      <span class="cr">${RANK_LABEL[c.r]}<i>${SUIT_SYMBOL[c.s]}</i></span>
      <span class="cv">${c.r > 7 ? c.r : ''}</span>
      <span class="cs">${SUIT_SYMBOL[c.s]}</span>
    </div>`;
}
const backHTML = (extra = '') => `<div class="card back back-${S().settings.back} ${extra}"></div>`;

function renderGame() {
  const r = G.round, m = G.match, club = myClub();
  const pv = G.preview;
  const takenIds = new Set(pv ? pv.take.map((c) => c.id) : []);
  let table = r.table.map((c) => cardHTML(c, takenIds.has(c.id) ? 'taken' : ''));
  if (pv) table.push(cardHTML(pv.card, `incoming ${pv.player ? 'from-top' : 'from-bottom'}`));
  const hand = r.hands[0].filter((c) => !(pv && pv.player === 0 && pv.card.id === c.id));
  const oppN = r.hands[1].length - (pv && pv.player === 1 ? 1 : 0);
  const myTurn = r.turn === 0 && !G.busy && !pv;
  app.innerHTML = `
    <div class="game table-${S().settings.table}">
      <div class="g-top">
        <button class="icon-btn" id="quit">✕</button>
        <div class="scoreboard">
          <div class="team me" style="--a:${club.c1};--b:${club.c2}"><span class="sw"></span><b>${m.scores[0]}</b></div>
          <div class="target">→ ${m.target}<small>manche ${m.round + 1}</small></div>
          <div class="team opp" style="--a:${G.rival.c1};--b:${G.rival.c2}"><b>${m.scores[1]}</b><span class="sw"></span></div>
        </div>
        <button class="icon-btn" id="mute">${audio.soundEnabled() ? '🔊' : '🔇'}</button>
      </div>
      <div class="opp-zone">
        <div class="who"><span class="sw" style="--a:${G.rival.c1};--b:${G.rival.c2}"></span>${esc(G.rival.name)} <small>· IA</small></div>
        <div class="opp-hand">${Array.from({ length: Math.max(0, oppN) }, () => backHTML('small')).join('')}</div>
        <div class="pile-info">🂠 ${r.piles[1].length} ${r.chkobbas[1] ? `<span class="chk-badge">${r.chkobbas[1]}× chkobba</span>` : ''}</div>
      </div>
      <div class="felt">
        <div class="deck-info">${r.deck.length ? `${backHTML('mini')}<span>${r.deck.length}</span>` : '<span class="last">dernière donne</span>'}</div>
        <div class="table-cards">${table.join('') || '<div class="empty">Table vide</div>'}</div>
      </div>
      <div class="me-zone">
        <div class="pile-info">🂠 ${r.piles[0].length} ${r.chkobbas[0] ? `<span class="chk-badge">${r.chkobbas[0]}× chkobba</span>` : ''}
          <span class="turn ${myTurn ? 'on' : ''}">${myTurn ? 'À toi de jouer' : r.turn === 1 ? `${esc(G.rival.name)} réfléchit…` : ''}</span>
          ${myTurn && S().settings.timer ? `<span class="timer" id="timer">${G.left}</span>` : ''}
        </div>
        <div class="hand ${myTurn ? 'active' : ''}">${hand.map((c) => cardHTML(c, 'in-hand')).join('')}</div>
        <div class="who me"><span class="sw" style="--a:${club.c1};--b:${club.c2}"></span>${esc(S().profile.pseudo)} · ${esc(S().profile.group.name)}</div>
      </div>
      <div id="sheet"></div>
      <div id="fx"></div>
    </div>`;
  document.getElementById('quit').onclick = () => {
    if (confirmBox('Quitter la partie ? Elle sera perdue.')) { stopTimer(); audio.stopAll(); G = null; showHome(); }
  };
  document.getElementById('mute').onclick = () => {
    S().settings.sound = !S().settings.sound; save();
    audio.setSoundEnabled(S().settings.sound);
    renderGame();
  };
  if (myTurn) app.querySelectorAll('.hand .card').forEach((el) => el.onclick = () => onPick(el.dataset.id));
}

function confirmBox(msg) { return window.confirm(msg); }

function dealAnim() {
  app.querySelectorAll('.hand .card, .opp-hand .card').forEach((el, i) => {
    el.style.animationDelay = `${i * 60}ms`;
    el.classList.add('deal');
  });
}

function startTimer() {
  stopTimer();
  const secs = S().settings.timer;
  if (!secs) return;
  G.left = secs;
  const el = () => document.getElementById('timer');
  if (el()) el().textContent = G.left;
  G.timer = setInterval(() => {
    if (!G) return stopTimer();
    G.left--;
    const t = el();
    if (t) { t.textContent = G.left; t.classList.toggle('hurry', G.left <= 5); }
    if (G.left <= 5 && G.left > 0) audio.sfx('tick');
    if (G.left <= 0) {
      stopTimer();
      const mv = chooseMove(G.round, 0, 'normal');
      toast('Temps écoulé : coup joué automatiquement');
      doMove(0, mv.cardId, mv.optionIndex);
    }
  }, 1000);
}
function stopTimer() { if (G?.timer) { clearInterval(G.timer); G.timer = null; } }

function onPick(id) {
  if (G.busy || G.round.turn !== 0) return;
  const card = G.round.hands[0].find((c) => c.id === id);
  const opts = captureOptions(card, G.round.table);
  audio.sfx('tap');
  if (opts.length <= 1) { stopTimer(); doMove(0, id, 0); return; }
  // plusieurs prises possibles : le joueur choisit
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `
    <div class="sheet-bg"></div>
    <div class="sheet-box">
      <h3>Que prends-tu avec ${RANK_LABEL[card.r]}${SUIT_SYMBOL[card.s]} ?</h3>
      ${opts.map((o, i) => `<button class="opt" data-i="${i}">${o.map((c) => cardHTML(c, 'mini-card')).join('<span class="plus">+</span>')}</button>`).join('')}
      <button class="btn ghost" id="cancelOpt">Choisir une autre carte</button>
    </div>`;
  sheet.querySelectorAll('.opt').forEach((b) => b.onclick = () => { sheet.innerHTML = ''; stopTimer(); doMove(0, id, +b.dataset.i); });
  document.getElementById('cancelOpt').onclick = () => { sheet.innerHTML = ''; };
  sheet.querySelector('.sheet-bg').onclick = () => { sheet.innerHTML = ''; };
}

async function doMove(player, cardId, optionIndex) {
  if (!G) return;
  G.busy = true;
  const r = G.round;
  const card = r.hands[player].find((c) => c.id === cardId);
  const opts = captureOptions(card, r.table);
  const take = opts.length ? opts[Math.min(optionIndex, opts.length - 1)] : [];
  // 1) la carte arrive sur la table, les cartes prises s'allument
  G.preview = { player, card, take };
  renderGame();
  audio.sfx(take.length ? 'take' : 'drop');
  await sleep(take.length ? 750 : 500);
  if (!G) return;
  G.preview = null;
  const ev = play(r, player, cardId, optionIndex);
  const club = player === 0 ? myClub() : G.rival;
  if (player === 0) {
    if ([card, ...take].some(isHaya)) { G.matchStats.hayas++; }
  }
  renderGame();
  if (ev.chkobba) {
    if (player === 0) G.matchStats.chkobbas++;
    await chkobbaFx(player, club);
  } else if (take.some(isHaya) || (take.length && isHaya(card))) {
    audio.sfx('haya');
    burst(player === 0 ? 'La Haya !' : 'Il prend la Haya…', player === 0 ? 'good' : 'bad');
    await sleep(700);
  }
  if (!G) return;
  if (ev.dealt) { audio.sfx('deal'); renderGame(); dealAnim(); await sleep(400); }
  if (ev.roundOver) {
    if (ev.rest?.length) {
      toast(`Les ${ev.rest.length} carte(s) restante(s) vont à ${ev.restTo === 0 ? 'toi' : G.rival.name}`);
      await sleep(900);
    }
    return endRound();
  }
  G.busy = false;
  renderGame();
  if (r.turn === 1) aiTurn(); else startTimer();
}

async function aiTurn() {
  G.busy = true;
  renderGame();
  await sleep(650 + Math.random() * 600);
  if (!G) return;
  const mv = chooseMove(G.round, 1, S().settings.level);
  doMove(1, mv.cardId, mv.optionIndex);
}

async function chkobbaFx(player, club) {
  const fx = document.getElementById('fx');
  if (player === 0) audio.chkobba(club); else audio.sfx('ooh');
  fx.innerHTML = `
    <div class="chk-fx ${player === 0 ? 'good' : 'bad'}" style="--a:${club.c1};--b:${club.c2}">
      <div class="flash"></div>
      <div class="chk-word">CHKOBBA!</div>
      <div class="chk-sub">${player === 0 ? 'Le virage explose !' : `${esc(club.name)} nettoie la table`}</div>
      ${player === 0 ? confettiHTML(60, club) : ''}
    </div>`;
  if (navigator.vibrate && player === 0) try { navigator.vibrate([60, 40, 120]); } catch (e) {}
  await sleep(player === 0 ? 1900 : 1200);
  fx.innerHTML = '';
}

function confettiHTML(n, club) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const col = i % 3 === 0 ? '#ffd23f' : i % 2 ? club.c1 : club.c2;
    s += `<i class="conf" style="left:${Math.random() * 100}%;background:${col};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.4 + Math.random() * 1.4}s;transform:rotate(${Math.random() * 360}deg)"></i>`;
  }
  return s;
}

function burst(text, kind) {
  const fx = document.getElementById('fx');
  if (!fx) return;
  const d = document.createElement('div');
  d.className = `burst ${kind}`;
  d.textContent = text;
  fx.appendChild(d);
  setTimeout(() => d.remove(), 1200);
}

function toast(msg) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2400);
}

function endRound() {
  stopTimer();
  const sc = scoreRound(G.round);
  applyRound(G.match, sc);
  if (sc.pts[1] > sc.pts[0]) G.lostRound = true;
  const berm = sc.lines.find((l) => l.key === 'bermila');
  if (berm?.winner === 0) G.matchStats.bermilas++;
  const m = G.match;
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `
    <div class="sheet-bg"></div>
    <div class="sheet-box score">
      <h3>Fin de la manche ${m.round}</h3>
      <table>
        <tr><th></th><th>Toi</th><th>${esc(G.rival.name)}</th></tr>
        ${sc.lines.map((l) => `<tr><td>${esc(l.label)}</td>
          <td class="${l.winner === 0 || (l.key === 'chkobba' && l.values[0]) ? 'win' : ''}">${l.values[0]}${l.winner === 0 ? ' ✓' : ''}</td>
          <td class="${l.winner === 1 || (l.key === 'chkobba' && l.values[1]) ? 'win' : ''}">${l.values[1]}${l.winner === 1 ? ' ✓' : ''}</td></tr>`).join('')}
        <tr class="tot"><td>Points de la manche</td><td>+${sc.pts[0]}</td><td>+${sc.pts[1]}</td></tr>
        <tr class="tot"><td>Score</td><td>${m.scores[0]}</td><td>${m.scores[1]}</td></tr>
      </table>
      <button class="btn primary" id="cont">${m.over ? 'Voir le résultat' : 'Manche suivante'}</button>
    </div>`;
  document.getElementById('cont').onclick = () => (m.over ? endMatch() : nextRound());
}

function endMatch() {
  const m = G.match, club = myClub();
  const won = m.winner === 0;
  const st = S().stats;
  const before = tifoRevealed();
  let gained = (won ? 30 : 10) + G.matchStats.chkobbas * 5 + G.matchStats.hayas * 3;
  st.games++;
  st.chkobbas += G.matchStats.chkobbas;
  st.hayas += G.matchStats.hayas;
  st.points += gained;
  track('games');
  track('chkobbas', G.matchStats.chkobbas);
  track('hayas', G.matchStats.hayas);
  track('bermilas', G.matchStats.bermilas);
  if (won) {
    st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak);
    track('wins');
    if (!G.lostRound) track('cleanWins');
  } else st.streak = 0;
  save();
  const after = tifoRevealed();
  won ? audio.victory(club) : audio.defeat();
  app.innerHTML = `
    <div class="screen result ${won ? 'won' : 'lost'}">
      ${won ? `<div class="fx-layer">${confettiHTML(90, club)}</div><div class="flares"><i></i><i></i><i></i><i></i></div>` : ''}
      <div class="res-title">${won ? 'VICTOIRE !' : 'Défaite'}</div>
      <div class="res-score">${m.scores[0]} – ${m.scores[1]}</div>
      <div class="res-sub">${won ? `Le virage de ${esc(S().profile.group.name)} chante pour toi` : `${esc(G.rival.name)} l'emporte. Le virage attend sa revanche.`}</div>
      <div class="res-card">
        <div>+${gained} points virage</div>
        ${G.matchStats.chkobbas ? `<div>${G.matchStats.chkobbas} chkobba</div>` : ''}
        ${after > before ? `<div class="hl">🎨 ${after - before} nouvelle(s) case(s) du tifo</div>` : ''}
        ${won && st.streak > 1 ? `<div>🔥 ${st.streak} victoires d'affilée</div>` : ''}
      </div>
      <div class="col">
        <button class="btn primary big" data-go="play">Revanche</button>
        <div class="row">
          ${after > before ? '<button class="btn ghost" data-go="tifo">Voir le tifo</button>' : ''}
          <button class="btn ghost" data-go="home">Accueil</button>
        </div>
      </div>
    </div>`;
  G = null;
}

// ================= Tifo =================
function showTifo() {
  const p = S().profile, club = myClub();
  const n = tifoRevealed();
  app.innerHTML = `
    <div class="screen">
      ${header('Le tifo du groupe')}
      <p class="muted center">Chaque partie rapporte des points virage. Tous les 15 points, une case du tifo de <b>${esc(p.group.name)}</b> se révèle.</p>
      <div class="tifo-wrap"><canvas id="tifo"></canvas></div>
      <div class="progress"><i style="width:${n}%"></i></div>
      <p class="center"><b>${n} / ${TIFO_CELLS}</b> cases ${n >= TIFO_CELLS ? '— tifo complet, champion du virage !' : ''}</p>
    </div>`;
  requestAnimationFrame(() => drawTifo(document.getElementById('tifo'), club, p.group.name, n));
}

// ================= Missions =================
function showMissions() {
  const ms = dailyMissions();
  app.innerHTML = `
    <div class="screen">
      ${header('Missions du jour')}
      <div class="list">
        ${ms.map((m) => `
          <div class="mission ${m.claimed ? 'done' : ''}">
            <div class="m-txt"><b>${esc(m.label)}</b><div class="progress"><i style="width:${(m.value / m.goal) * 100}%"></i></div><small>${m.value}/${m.goal} · +${m.reward} points</small></div>
            ${m.claimed ? '<span class="ok">✓</span>' : `<button class="btn small ${m.value >= m.goal ? 'primary' : 'ghost'}" data-claim="${m.id}" ${m.value >= m.goal ? '' : 'disabled'}>Récupérer</button>`}
          </div>`).join('')}
      </div>
      <p class="muted center tiny">Nouvelles missions chaque jour.</p>
    </div>`;
  app.querySelectorAll('[data-claim]').forEach((b) => b.onclick = () => {
    const pts = claim(b.dataset.claim);
    if (pts) { audio.sfx('haya'); toast(`+${pts} points virage`); showMissions(); }
  });
}

// ================= Chants =================
function showChants() {
  const mine = myClub();
  app.innerHTML = `
    <div class="screen">
      ${header('Les chants du virage')}
      <p class="muted">Chants originaux composés pour le jeu. Ton chant retentit à l'entrée sur la table, sur chaque Chkobba et à la victoire.</p>
      <div class="list">
        ${CLUBS.map((c) => `
          <div class="chant-row ${c.id === mine.id ? 'mine' : ''}">
            <span class="sw" style="--a:${c.c1};--b:${c.c2}"></span>
            <div><b>Chant de ${esc(c.name)}</b><small>${c.id === mine.id ? 'ton club' : c.city}${S().favChant === c.id ? ' · ⭐ ton chant de la semaine' : ''}</small></div>
            <button class="icon-btn" data-play="${c.id}">▶</button>
            <button class="icon-btn" data-fav="${c.id}">${S().favChant === c.id ? '★' : '☆'}</button>
          </div>`).join('')}
      </div>
      <button class="btn ghost" id="stop">■ Arrêter</button>
      <div class="soon-box"><b>Bientôt — Studio du virage</b><br/>Les groupes pourront enregistrer et publier leurs propres chants (avec déclaration de propriété et modération).</div>
    </div>`;
  app.querySelectorAll('[data-play]').forEach((b) => b.onclick = () => { audio.unlock(); audio.previewChant(clubById(b.dataset.play)); });
  app.querySelectorAll('[data-fav]').forEach((b) => b.onclick = () => { S().favChant = b.dataset.fav; save(); showChants(); });
  document.getElementById('stop').onclick = () => audio.stopAll();
}

// ================= Vestiaire =================
function showVestiaire() {
  const pts = S().stats.points;
  const row = (items, key) => items.map((it) => {
    const locked = pts < it.need;
    const sel = S().settings[key] === it.id;
    return `<button class="unlock ${sel ? 'sel' : ''} ${locked ? 'locked' : ''}" data-${key}="${it.id}" ${locked ? 'disabled' : ''}>
      <span class="prev ${key}-${it.id}">${key === 'back' ? backHTML('mini') : ''}</span>
      <b>${esc(it.name)}</b><small>${locked ? `🔒 ${it.need} points` : sel ? 'choisi' : 'disponible'}</small></button>`;
  }).join('');
  app.innerHTML = `
    <div class="screen">
      ${header('Vestiaire')}
      <p class="muted">Tu as <b>${pts}</b> points virage.</p>
      <h3>Tables</h3><div class="unlocks">${row(TABLES, 'table')}</div>
      <h3>Dos de cartes</h3><div class="unlocks">${row(BACKS, 'back')}</div>
    </div>`;
  app.querySelectorAll('[data-table]').forEach((b) => b.onclick = () => { S().settings.table = b.dataset.table; save(); showVestiaire(); });
  app.querySelectorAll('[data-back]').forEach((b) => b.onclick = () => { S().settings.back = b.dataset.back; save(); showVestiaire(); });
}

// ================= Règles =================
function showRules() {
  app.innerHTML = `
    <div class="screen rules">
      ${header('Règles de la Chkobba')}
      <h3>Les cartes</h3>
      <p>40 cartes : de l'As (1) au 7, puis la Dame (8), le Valet (9) et le Roi (10). Les carreaux sont les « dinari ».</p>
      <h3>Le jeu</h3>
      <p>4 cartes sont posées sur la table, chaque joueur reçoit 3 cartes ; on redistribue 3 cartes quand les mains sont vides.</p>
      <p>À ton tour, joue une carte. Si une carte de même valeur est sur la table, tu dois la prendre. Sinon, tu prends des cartes dont la somme égale ta carte. Si rien ne correspond, ta carte reste sur la table.</p>
      <p><b>Chkobba</b> : tu ramasses toutes les cartes de la table (sauf au tout dernier coup de la manche) → 1 point.</p>
      <p>À la fin de la manche, les cartes restantes vont au dernier joueur qui a pris.</p>
      <h3>Le comptage</h3>
      <ul>
        <li><b>Karta</b> : le plus de cartes → 1 point</li>
        <li><b>Dinari</b> : le plus de carreaux → 1 point</li>
        <li><b>Haya</b> : le 7 de carreau → 1 point</li>
        <li><b>Bermila</b> : le plus de 7 (à égalité, le plus de 6) → 1 point</li>
        <li>Chaque <b>Chkobba</b> → 1 point</li>
      </ul>
      <p>En cas d'égalité sur une ligne, personne ne marque. La partie se joue en ${S().settings.target} points (réglable).</p>
    </div>`;
}

// ================= Réglages =================
function showSettings() {
  const s = S().settings, p = S().profile;
  app.innerHTML = `
    <div class="screen">
      ${header('Réglages')}
      <label class="field">Pseudo<input id="pseudo" maxlength="18" value="${esc(p.pseudo)}"/></label>
      <label class="field">Nom du groupe<input id="group" maxlength="22" value="${esc(p.group.name)}"/></label>
      <label class="field">Club
        <select id="club">${CLUBS.map((c) => `<option value="${c.id}" ${c.id === p.club ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="field">Partie en
        <select id="target"><option value="11" ${s.target === 11 ? 'selected' : ''}>11 points (≈ 6 min)</option><option value="21" ${s.target === 21 ? 'selected' : ''}>21 points</option></select></label>
      <label class="field">Niveau de l'IA
        <select id="level">${['facile', 'normal', 'expert'].map((l) => `<option ${s.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">Chrono par coup
        <select id="timer">${[0, 10, 15, 20].map((t) => `<option value="${t}" ${s.timer === t ? 'selected' : ''}>${t ? `${t} s` : 'sans chrono'}</option>`).join('')}</select></label>
      <label class="field check"><input type="checkbox" id="sound" ${s.sound ? 'checked' : ''}/> Sons et chants</label>
      <button class="btn primary" id="saveBtn">Enregistrer</button>
      <button class="btn ghost danger" id="reset">Tout réinitialiser</button>
      <p class="tiny muted center">Chkobba des virages · version de test</p>
    </div>`;
  document.getElementById('saveBtn').onclick = () => {
    p.pseudo = document.getElementById('pseudo').value.trim() || p.pseudo;
    p.group.name = document.getElementById('group').value.trim() || p.group.name;
    p.club = document.getElementById('club').value;
    s.target = +document.getElementById('target').value;
    s.level = document.getElementById('level').value;
    s.timer = +document.getElementById('timer').value;
    s.sound = document.getElementById('sound').checked;
    audio.setSoundEnabled(s.sound);
    save();
    toast('Réglages enregistrés');
    showHome();
  };
  document.getElementById('reset').onclick = () => {
    if (confirmBox('Effacer ton profil, ton groupe et ta progression ?')) { resetAll(); showIntro(); }
  };
}

// bouton retour Android : retour à l'accueil, puis sortie de l'application
App.addListener('backButton', () => {
  if (G) { document.getElementById('quit')?.click(); return; }
  if (document.querySelector('.home')) App.exitApp(); else if (S().profile) { audio.stopAll(); showHome(); }
}).catch(() => {});

showIntro();
