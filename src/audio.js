// Sons du virage, entièrement synthétisés (aucun enregistrement ni chanson existante) :
// foule, tambours (bendir, darbouka), claps, cornes, et chants originaux chantés par une « foule » de synthé.

let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = true;
let current = null; // bus de la séquence en cours (pour pouvoir l'arrêter)

export function setSoundEnabled(v) {
  enabled = v;
  if (!v) stopAll();
}
export const soundEnabled = () => enabled;

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createDynamicsCompressor();
      master.threshold.value = -14;
      master.ratio.value = 4;
      const out = ctx.createGain();
      out.gain.value = 0.9;
      master.connect(out).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    // iOS : un son muet débloque la sortie audio
    const b = ctx.createBufferSource();
    b.buffer = ctx.createBuffer(1, 1, 22050);
    b.connect(ctx.destination);
    b.start(0);
  } catch (e) { /* audio indisponible */ }
}

const ready = () => enabled && ctx && ctx.state !== 'closed';

function bus(volume = 1) {
  const g = ctx.createGain();
  g.gain.value = volume;
  g.connect(master);
  return g;
}

export function stopAll(fade = 0.25) {
  if (!ctx || !current) return;
  const g = current;
  current = null;
  try {
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
    setTimeout(() => { try { g.disconnect(); } catch (e) {} }, fade * 1000 + 100);
  } catch (e) {}
}

function noise(dest, t, dur, { type = 'bandpass', freq = 1000, q = 1, gain = 0.5, attack = 0.005, release = null } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + (release ?? dur));
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
  return { f, g };
}

// --- percussions ---
function bendir(dest, t, v = 1) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
  g.gain.setValueAtTime(0.9 * v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.5);
  noise(dest, t, 0.08, { type: 'lowpass', freq: 900, gain: 0.25 * v });
}
function tek(dest, t, v = 1) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(520, t);
  o.frequency.exponentialRampToValueAtTime(300, t + 0.05);
  g.gain.setValueAtTime(0.35 * v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.12);
  noise(dest, t, 0.05, { type: 'highpass', freq: 3000, gain: 0.25 * v });
}
function clap(dest, t, v = 1) {
  // plusieurs mains légèrement décalées = la tribune
  for (let k = 0; k < 4; k++) noise(dest, t + k * 0.009 + Math.random() * 0.006, 0.12, { type: 'bandpass', freq: 1400 + Math.random() * 500, q: 0.8, gain: 0.32 * v, release: 0.11 });
}

// motif « doum – tek tek – doum – clap » sur une mesure de 4 temps
function drumBar(dest, t, beat, v = 1) {
  bendir(dest, t, v);
  tek(dest, t + beat * 0.75, v * 0.8);
  tek(dest, t + beat * 1.0, v * 0.6);
  bendir(dest, t + beat * 1.5, v * 0.8);
  clap(dest, t + beat * 2, v);
  bendir(dest, t + beat * 2.5, v * 0.7);
  tek(dest, t + beat * 3, v * 0.7);
  clap(dest, t + beat * 3.5, v * 0.9);
}

// --- foule ---
function crowd(dest, t, dur, level = 0.35, swell = true) {
  const n = noise(dest, t, dur, { type: 'bandpass', freq: 650, q: 0.6, gain: level, attack: swell ? Math.min(0.6, dur / 3) : 0.02, release: dur });
  // « vagues » dans la foule
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  lfo.frequency.value = 0.7;
  lg.gain.value = 180;
  lfo.connect(lg).connect(n.f.frequency);
  lfo.start(t);
  lfo.stop(t + dur);
  noise(dest, t, dur, { type: 'bandpass', freq: 2400, q: 1.2, gain: level * 0.35, attack: 0.3, release: dur });
}

// voix de foule : 6 voix désaccordées + formant « ô / a »
function crowdNote(dest, t, midi, dur, v = 1) {
  if (!midi) return;
  const f0 = 440 * Math.pow(2, (midi - 69) / 12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.11 * v, t + 0.04);
  g.gain.setValueAtTime(0.11 * v, t + Math.max(0.05, dur - 0.08));
  g.gain.linearRampToValueAtTime(0, t + dur);
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = 720; f1.Q.value = 2.5;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 3;
  const mix = ctx.createGain();
  mix.gain.value = 1.6;
  f1.connect(mix); f2.connect(mix);
  mix.connect(g).connect(dest);
  const voices = [-14, -7, -3, 0, 4, 9];
  for (const cents of voices) {
    for (const oct of [1, 0.5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * oct, t);
      o.detune.value = cents + (Math.random() - 0.5) * 8;
      const vib = ctx.createOscillator();
      const vg = ctx.createGain();
      vib.frequency.value = 4.5 + Math.random() * 1.5;
      vg.gain.value = 6;
      vib.connect(vg).connect(o.detune);
      o.connect(f1); o.connect(f2);
      const st = t + Math.random() * 0.025;
      o.start(st); vib.start(st);
      o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
    }
  }
}

function horn(dest, t, dur = 0.9, midi = 58) {
  const f0 = 440 * Math.pow(2, (midi - 69) / 12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.05);
  g.gain.setValueAtTime(0.22, t + dur - 0.1);
  g.gain.linearRampToValueAtTime(0, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1800;
  f.connect(g).connect(dest);
  for (const m of [1, 1.005, 2]) {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f0 * m;
    o.connect(f);
    o.start(t); o.stop(t + dur);
  }
}

function whistle(dest, t, dur = 0.35) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(2900, t);
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  lfo.frequency.value = 28; lg.gain.value = 120;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.02);
  g.gain.setValueAtTime(0.12, t + dur - 0.03);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(dest);
  o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
}

function chantInto(dest, t, club, { repeats = 1, drums = true, voice = 1 } = {}) {
  const beat = 60 / club.chant.bpm;
  let x = t;
  for (let k = 0; k < repeats; k++) {
    for (const [m, d] of club.chant.notes) {
      crowdNote(dest, x, m, d * beat * 0.95, voice);
      x += d * beat;
    }
  }
  if (drums) {
    for (let b = t; b < x - 0.01; b += beat * 4) drumBar(dest, b, beat, 0.9);
  }
  return x - t;
}

// ---------- API publique ----------
export function sfx(name) {
  if (!ready()) return;
  const t = ctx.currentTime + 0.01;
  const d = bus(0.8);
  if (name === 'tap') tek(d, t, 0.6);
  else if (name === 'drop') { noise(d, t, 0.08, { type: 'bandpass', freq: 1800, gain: 0.25 }); }
  else if (name === 'take') { noise(d, t, 0.18, { type: 'bandpass', freq: 2600, q: 0.7, gain: 0.3 }); tek(d, t + 0.05, 0.5); }
  else if (name === 'deal') { for (let i = 0; i < 6; i++) noise(d, t + i * 0.07, 0.06, { type: 'highpass', freq: 2500, gain: 0.18 }); }
  else if (name === 'tick') tek(d, t, 0.35);
  else if (name === 'whistle') { whistle(d, t, 0.25); whistle(d, t + 0.33, 0.6); }
  else if (name === 'ooh') crowd(d, t, 1.6, 0.25);
  else if (name === 'haya') { crowd(d, t, 1.8, 0.45); horn(d, t + 0.05, 0.5, 62); }
}

// Entrée au stade (animation d'ouverture)
export function stadiumIntro(club) {
  if (!ready()) return 0;
  stopAll(0.05);
  const t = ctx.currentTime + 0.05;
  const d = bus(1);
  current = d;
  crowd(d, t, 9, 0.32);
  whistle(d, t + 0.2, 0.3);
  const beat = 60 / club.chant.bpm;
  for (let i = 0; i < 2; i++) drumBar(d, t + 0.4 + i * beat * 4, beat, 0.9);
  horn(d, t + 0.4, 0.7, 58);
  const dur = chantInto(d, t + 0.4 + beat * 8, club, { repeats: 1 });
  crowd(d, t + 0.4 + beat * 8 + dur - 0.2, 2.5, 0.55);
  return 0.4 + beat * 8 + dur + 2;
}

// Entrée sur la table : le chant du groupe démarre
export function tableEntrance(club) {
  if (!ready()) return;
  stopAll(0.05);
  const t = ctx.currentTime + 0.05;
  const d = bus(0.7);
  current = d;
  crowd(d, t, 5, 0.22);
  chantInto(d, t + 0.1, club, { repeats: 1, voice: 0.8 });
}

// Chkobba : explosion de foule + refrain
export function chkobba(club) {
  if (!ready()) return;
  stopAll(0.05);
  const t = ctx.currentTime + 0.02;
  const d = bus(1);
  current = d;
  crowd(d, t, 3.2, 0.75, false);
  horn(d, t, 0.45, 60); horn(d, t + 0.5, 0.45, 60); horn(d, t + 1.0, 0.9, 63);
  const beat = 60 / club.chant.bpm;
  const half = { ...club, chant: { ...club.chant, notes: club.chant.notes.slice(0, Math.ceil(club.chant.notes.length / 2)) } };
  chantInto(d, t + 0.6, half, { repeats: 1 });
  drumBar(d, t + 0.6, beat, 1);
}

// Victoire : chant complet
export function victory(club) {
  if (!ready()) return;
  stopAll(0.05);
  const t = ctx.currentTime + 0.05;
  const d = bus(1);
  current = d;
  whistle(d, t, 0.25); whistle(d, t + 0.3, 0.25); whistle(d, t + 0.6, 0.9);
  crowd(d, t + 0.5, 3, 0.8, false);
  const dur = chantInto(d, t + 1.5, club, { repeats: 2 });
  crowd(d, t + 1.5, dur, 0.25);
  crowd(d, t + 1.5 + dur, 3, 0.6);
}

export function defeat() {
  if (!ready()) return;
  stopAll(0.05);
  const t = ctx.currentTime + 0.05;
  const d = bus(0.8);
  current = d;
  whistle(d, t, 0.25); whistle(d, t + 0.3, 0.25); whistle(d, t + 0.6, 0.9);
  crowd(d, t + 0.4, 2.5, 0.2);
}

// Écoute d'un chant (galerie des chants)
export function previewChant(club) {
  if (!ready()) return;
  stopAll(0.05);
  const t = ctx.currentTime + 0.05;
  const d = bus(0.9);
  current = d;
  crowd(d, t, 6, 0.18);
  chantInto(d, t + 0.1, club, { repeats: 1 });
}
