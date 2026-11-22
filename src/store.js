// Sauvegarde locale (aucun compte pour cette première version)
const KEY = 'chkobba-virage-v1';

const DEFAULT = {
  profile: null, // { pseudo, club, group: { name, motto } }
  stats: { games: 0, wins: 0, chkobbas: 0, hayas: 0, points: 0, bestStreak: 0, streak: 0 },
  settings: { sound: true, target: 11, timer: 15, level: 'normal', table: 'cafe', back: 'club' },
  missions: { day: '', progress: {}, claimed: {} },
  favChant: null,
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const s = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT),
      ...s,
      stats: { ...DEFAULT.stats, ...(s.stats || {}) },
      settings: { ...DEFAULT.settings, ...(s.settings || {}) },
      missions: { ...DEFAULT.missions, ...(s.missions || {}) },
    };
  } catch (e) {
    return structuredClone(DEFAULT);
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* stockage indisponible */ }
}

export const store = () => state;

export function resetAll() {
  state = structuredClone(DEFAULT);
  save();
}

// ---------- Progression ----------
export const TIFO_CELLS = 100;
export const POINTS_PER_CELL = 15;
export const tifoRevealed = () => Math.min(TIFO_CELLS, Math.floor(state.stats.points / POINTS_PER_CELL));

export const TABLES = [
  { id: 'cafe', name: 'Le café', need: 0 },
  { id: 'terrasse', name: 'La terrasse', need: 150 },
  { id: 'tribune', name: 'La tribune', need: 400 },
];
export const BACKS = [
  { id: 'club', name: 'Écharpe du club', need: 0 },
  { id: 'fumi', name: 'Fumigène', need: 250 },
  { id: 'etoile', name: 'Étoile dorée', need: 600 },
];

// ---------- Missions du jour ----------
const POOL = [
  { id: 'win2', label: 'Gagne 2 parties pour ton virage', stat: 'wins', goal: 2, reward: 40 },
  { id: 'chk2', label: 'Fais 2 Chkobba', stat: 'chkobbas', goal: 2, reward: 30 },
  { id: 'haya2', label: 'Ramasse la Haya (7♦) 2 fois', stat: 'hayas', goal: 2, reward: 30 },
  { id: 'play3', label: 'Joue 3 parties', stat: 'games', goal: 3, reward: 20 },
  { id: 'berm2', label: 'Gagne la Bermila 2 fois', stat: 'bermilas', goal: 2, reward: 25 },
  { id: 'win1', label: 'Gagne une partie sans perdre de manche', stat: 'cleanWins', goal: 1, reward: 50 },
];

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function dailyMissions() {
  const day = today();
  if (state.missions.day !== day) {
    state.missions = { day, progress: {}, claimed: {} };
    save();
  }
  let seed = [...day].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) >>> 0;
  const pool = POOL.slice();
  const out = [];
  while (out.length < 3) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return out.map((m) => ({ ...m, value: Math.min(m.goal, state.missions.progress[m.stat] || 0), claimed: !!state.missions.claimed[m.id] }));
}

export function track(stat, n = 1) {
  dailyMissions();
  state.missions.progress[stat] = (state.missions.progress[stat] || 0) + n;
}

export function claim(id) {
  const m = dailyMissions().find((x) => x.id === id);
  if (!m || m.claimed || m.value < m.goal) return 0;
  state.missions.claimed[id] = true;
  state.stats.points += m.reward;
  save();
  return m.reward;
}
