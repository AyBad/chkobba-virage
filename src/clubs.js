// Clubs fictifs décrits par leur ville et leurs couleurs (aucun nom ni logo officiel).
// Les vrais noms, logos et chants ne seront ajoutés qu'après validation juridique.
// Chaque club a un chant ORIGINAL : suite de [note MIDI, durée en temps] (0 = silence).
export const CLUBS = [
  {
    id: 'tunis-ro', name: 'Tunis Rouge-Or', city: 'Tunis', c1: '#c8102e', c2: '#f5c400', ink: '#fff',
    chant: { bpm: 132, notes: [[67,1],[67,.5],[69,.5],[71,1],[67,1],[72,1.5],[71,.5],[69,1],[0,1],[69,1],[69,.5],[71,.5],[72,1],[69,1],[74,1.5],[72,.5],[71,2]] },
  },
  {
    id: 'tunis-rb', name: 'Tunis Rouge-Blanc', city: 'Tunis', c1: '#e30613', c2: '#ffffff', ink: '#fff',
    chant: { bpm: 126, notes: [[64,.5],[65,.5],[67,1],[67,1],[69,.5],[67,.5],[65,1],[64,1],[0,1],[65,.5],[67,.5],[69,1],[69,1],[71,.5],[69,.5],[67,1],[65,2]] },
  },
  {
    id: 'sousse-rb', name: 'Sousse Rouge-Blanc', city: 'Sousse', c1: '#b5121b', c2: '#f4f4f4', ink: '#fff',
    chant: { bpm: 138, notes: [[62,1],[65,1],[67,.5],[65,.5],[64,1],[62,1],[0,1],[62,.5],[64,.5],[65,1],[69,1],[67,.5],[65,.5],[64,1],[62,2]] },
  },
  {
    id: 'sfax-nb', name: 'Sfax Noir-Blanc', city: 'Sfax', c1: '#141414', c2: '#ffffff', ink: '#fff',
    chant: { bpm: 120, notes: [[60,1],[63,1],[65,1],[67,1.5],[65,.5],[63,1],[62,1],[0,1],[63,1],[65,1],[67,1],[68,1.5],[67,.5],[65,1],[63,2]] },
  },
  {
    id: 'bizerte-jn', name: 'Bizerte Jaune-Noir', city: 'Bizerte', c1: '#ffd200', c2: '#111111', ink: '#111',
    chant: { bpm: 128, notes: [[69,.5],[69,.5],[72,1],[71,.5],[69,.5],[67,1],[69,1],[0,1],[67,.5],[67,.5],[71,1],[69,.5],[67,.5],[65,1],[67,2]] },
  },
  {
    id: 'monastir-bb', name: 'Monastir Bleu-Blanc', city: 'Monastir', c1: '#1f4fa3', c2: '#ffffff', ink: '#fff',
    chant: { bpm: 130, notes: [[65,1],[67,.5],[69,.5],[70,1],[69,1],[67,1],[65,1],[0,1],[67,1],[69,.5],[70,.5],[72,1],[70,1],[69,1],[67,2]] },
  },
];

export const clubById = (id) => CLUBS.find((c) => c.id === id) || CLUBS[0];
