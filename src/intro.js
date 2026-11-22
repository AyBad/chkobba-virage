// Animation d'ouverture : le stade s'allume, la tribune chauffe (fumigènes, drapeaux),
// les cartes s'envolent en éventail et le titre tombe comme un but.

const TITLE_AT = 3.4;
export const INTRO_DURATION = 4.4;

export function runIntro(canvas, club, { onTitle, onDone } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let raf = 0;
  let t0 = performance.now();
  let offset = 0; // pour sauter à la fin
  let titleFired = false, doneFired = false;
  let stopped = false;

  const c1 = club.c1, c2 = club.c2 === '#ffffff' || club.c2 === '#f4f4f4' ? '#ffffff' : club.c2;
  const rand = mulberry(7);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  // tribune : rangées de supporters
  let fans = [], flares = [], smoke = [], confetti = [], flags = [];
  function build() {
    fans = [];
    const standTop = H * 0.18, standBottom = H * 0.62;
    const rows = 14;
    for (let r = 0; r < rows; r++) {
      const y = standTop + (r / rows) * (standBottom - standTop);
      const size = 4 + r * 0.55;
      const step = size * 2.1;
      for (let x = -10; x < W + 10; x += step) {
        fans.push({ x: x + rand() * step * 0.4, y, size, ph: rand() * 6.28, col: rand() < 0.5 ? c1 : c2, scarf: rand() < 0.25 });
      }
    }
    flares = [];
    const nf = Math.max(5, Math.round(W / 70));
    for (let i = 0; i < nf; i++) flares.push({ x: (i + 0.5) * (W / nf) + (rand() - 0.5) * 20, y: standTop + (0.25 + rand() * 0.6) * (standBottom - standTop), on: 1.0 + rand() * 1.4, hue: rand() < 0.7 ? 'r' : 'c' });
    flags = [];
    for (let i = 0; i < 4; i++) flags.push({ x: W * (0.12 + i * 0.25), y: standTop + (standBottom - standTop) * (0.35 + (i % 2) * 0.2), col: i % 2 ? c1 : c2, alt: i % 2 ? c2 : c1, ph: i });
    smoke = []; confetti = [];
  }

  function draw(now) {
    if (stopped) return;
    const t = (now - t0) / 1000 + offset;
    ctx.save();
    // tremblement au moment du titre
    if (t > TITLE_AT && t < TITLE_AT + 0.45) {
      const k = (1 - (t - TITLE_AT) / 0.45) * 9;
      ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
    }
    // ciel nocturne
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#05060d');
    sky.addColorStop(0.55, '#0c1222');
    sky.addColorStop(1, '#04140a');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    const lights = clamp((t - 0.3) / 0.8, 0, 1) * (t < 1.1 ? (Math.sin(t * 60) > -0.3 ? 1 : 0.3) : 1);

    // pylônes et faisceaux
    for (const side of [-1, 1]) {
      const px = side < 0 ? W * 0.08 : W * 0.92, py = H * 0.06;
      ctx.fillStyle = '#1b1f2b';
      ctx.fillRect(px - 2, py, 4, H * 0.2);
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = `rgba(255,255,230,${0.25 + 0.75 * lights})`;
        ctx.fillRect(px - 15 + (k % 3) * 11, py - 8 + Math.floor(k / 3) * 8, 8, 6);
      }
      const sweep = Math.sin(t * 0.9 + (side > 0 ? 1.5 : 0)) * 0.35;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createLinearGradient(px, py, W / 2, H * 0.8);
      beam.addColorStop(0, `rgba(255,255,220,${0.22 * lights})`);
      beam.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(px, py);
      const tx = W / 2 + sweep * W;
      ctx.lineTo(tx - W * 0.35, H);
      ctx.lineTo(tx + W * 0.35, H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // tribune
    const crowdIn = clamp((t - 0.5) / 0.9, 0, 1);
    ctx.fillStyle = '#0d0f17';
    ctx.fillRect(0, H * 0.16, W, H * 0.48);
    ctx.globalAlpha = crowdIn;
    const jump = t > TITLE_AT ? 1.8 : 1;
    for (const f of fans) {
      const by = f.y - Math.max(0, Math.sin(t * 7 * jump + f.ph)) * f.size * 0.6 * jump;
      ctx.fillStyle = shade(f.col, 0.35 + 0.65 * lights);
      ctx.beginPath();
      ctx.arc(f.x, by, f.size * 0.55, 0, 6.283);
      ctx.fill();
      ctx.fillRect(f.x - f.size * 0.6, by + f.size * 0.45, f.size * 1.2, f.size * 1.1);
      if (f.scarf && t > 1.6) {
        ctx.fillStyle = f.col === c1 ? c2 : c1;
        const a = Math.sin(t * 9 + f.ph) * f.size;
        ctx.fillRect(f.x - f.size * 0.2 + a * 0.3, by - f.size * 1.8, f.size * 0.35, f.size * 1.4);
      }
    }
    ctx.globalAlpha = 1;

    // drapeaux géants
    for (const fl of flags) {
      if (t < 1.4) continue;
      const k = clamp((t - 1.4) / 0.5, 0, 1);
      const fw = Math.min(W * 0.16, 90), fh = fw * 0.65;
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fl.x, fl.y + 30);
      ctx.lineTo(fl.x, fl.y - fh * k - 10);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const x = fl.x + (i / 12) * fw;
        const wave = Math.sin(t * 5 + i * 0.6 + fl.ph) * 5 * (i / 12);
        ctx.fillStyle = i < 6 ? fl.col : fl.alt;
        ctx.fillRect(x, fl.y - fh * k - 10 + wave, fw / 12 + 0.5, fh * 0.5 * k);
        ctx.fillStyle = i < 6 ? fl.alt : fl.col;
        ctx.fillRect(x, fl.y - fh * k - 10 + wave + fh * 0.5 * k, fw / 12 + 0.5, fh * 0.5 * k);
      }
    }

    // fumigènes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of flares) {
      if (t < f.on) continue;
      const flick = 0.75 + Math.random() * 0.25;
      const col = f.hue === 'r' ? [255, 60, 30] : hexRgb(c1 === '#141414' ? '#ffffff' : c1);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 60);
      g.addColorStop(0, `rgba(255,240,200,${0.95 * flick})`);
      g.addColorStop(0.15, `rgba(${col[0]},${col[1]},${col[2]},${0.7 * flick})`);
      g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(f.x - 60, f.y - 60, 120, 120);
      if (Math.random() < 0.5) smoke.push({ x: f.x + (Math.random() - 0.5) * 6, y: f.y - 8, vx: (Math.random() - 0.3) * 0.5, vy: -0.6 - Math.random() * 0.6, r: 6, a: 0.35, col });
      for (let s = 0; s < 2; s++) {
        const a = Math.random() * 6.28, d = Math.random() * 14;
        ctx.fillStyle = 'rgba(255,220,150,0.9)';
        ctx.fillRect(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 1.5, 1.5);
      }
    }
    ctx.restore();
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i];
      s.x += s.vx; s.y += s.vy; s.r += 0.45; s.a *= 0.985;
      if (s.a < 0.02 || s.y < -40) { smoke.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(${Math.round(s.col[0] * 0.55 + 70)},${Math.round(s.col[1] * 0.4 + 60)},${Math.round(s.col[2] * 0.4 + 60)},${s.a * 0.5})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.283);
      ctx.fill();
    }
    if (smoke.length > 400) smoke.splice(0, smoke.length - 400);

    // pelouse
    const grass = ctx.createLinearGradient(0, H * 0.64, 0, H);
    grass.addColorStop(0, shade('#1f7a33', 0.4 + 0.6 * lights));
    grass.addColorStop(1, '#06210d');
    ctx.fillStyle = grass;
    ctx.fillRect(0, H * 0.64, W, H * 0.36);
    for (let i = 0; i < 8; i++) {
      if (i % 2) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.035 * lights})`;
      ctx.fillRect(0, H * 0.64 + i * (H * 0.045), W, H * 0.045);
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * lights})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.83, W * 0.22, H * 0.07, 0, 0, 6.283);
    ctx.stroke();

    // cartes en éventail
    const cards = [[3, 'c'], [10, 'h'], [7, 'd'], [1, 's'], [6, 'd']];
    const cw = Math.min(W * 0.17, 84), ch = cw * 1.45;
    cards.forEach(([r, s], i) => {
      const start = 2.1 + i * 0.12;
      const k = easeOut(clamp((t - start) / 0.55, 0, 1));
      if (k <= 0) return;
      const ang = (i - 2) * 0.22;
      const tx = W / 2 + (i - 2) * cw * 0.42, ty = H * 0.74 + Math.abs(i - 2) * 6;
      const fromX = i < 2 ? -cw : i > 2 ? W + cw : W / 2, fromY = i === 2 ? H + ch : H * 0.5;
      const x = fromX + (tx - fromX) * k, y = fromY + (ty - fromY) * k;
      const spin = (1 - k) * (i - 2 || 1) * 3;
      const float = t > 3 ? Math.sin(t * 2 + i) * 3 : 0;
      drawCard(ctx, x, y + float, cw, ch, ang + spin, r, s, i === 2 && t > 3.1);
    });

    // titre
    if (t > TITLE_AT) {
      if (!titleFired) { titleFired = true; onTitle && onTitle(); }
      const k = clamp((t - TITLE_AT) / 0.35, 0, 1);
      const sc = 1 + (1 - easeOut(k)) * 2.2;
      const flash = clamp(1 - (t - TITLE_AT) / 0.3, 0, 1);
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`; ctx.fillRect(0, 0, W, H); }
      const fs = Math.min(W * 0.16, 84);
      ctx.save();
      ctx.translate(W / 2, H * 0.36);
      ctx.scale(sc, sc);
      ctx.globalAlpha = k;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${fs}px "Arial Black", Impact, system-ui, sans-serif`;
      ctx.lineJoin = 'round';
      ctx.lineWidth = fs * 0.16;
      ctx.strokeStyle = '#000';
      ctx.strokeText('CHKOBBA', 0, 0);
      const tg = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
      tg.addColorStop(0, '#fff6c8');
      tg.addColorStop(0.5, '#ffd23f');
      tg.addColorStop(1, '#ff8a00');
      ctx.fillStyle = tg;
      ctx.fillText('CHKOBBA', 0, 0);
      ctx.font = `italic 800 ${fs * 0.42}px system-ui, sans-serif`;
      ctx.lineWidth = fs * 0.08;
      ctx.strokeText('des virages', 0, fs * 0.72);
      ctx.fillStyle = c1 === '#141414' ? '#ffffff' : c1;
      ctx.fillText('des virages', 0, fs * 0.72);
      ctx.restore();
      if (confetti.length < 160 && Math.random() < 0.8) {
        for (let i = 0; i < 3; i++) confetti.push({ x: Math.random() * W, y: -10, vy: 1.5 + Math.random() * 2.5, vx: (Math.random() - 0.5) * 1.2, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, col: Math.random() < 0.5 ? c1 : c2, w: 4 + Math.random() * 4, h: 8 + Math.random() * 10 });
      }
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i];
      p.x += p.vx + Math.sin(p.y / 30) * 0.4; p.y += p.vy; p.r += p.vr;
      if (p.y > H + 20) { confetti.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.r * 2)), p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
      ctx.restore();
    }

    // fondu d'entrée
    if (t < 0.4) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.4})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();

    if (t > INTRO_DURATION && !doneFired) { doneFired = true; onDone && onDone(); }
    raf = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(draw);

  return {
    skip() {
      const t = (performance.now() - t0) / 1000 + offset;
      if (t < TITLE_AT) offset += TITLE_AT - t;
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    },
  };
}

export function drawCard(ctx, x, y, w, h, ang, r, s, glow) {
  const red = s === 'd' || s === 'h';
  const sym = { d: '♦', h: '♥', s: '♠', c: '♣' }[s];
  const lab = { 1: 'A', 8: 'D', 9: 'V', 10: 'R' }[r] || String(r);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (glow) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 28; }
  else { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10; }
  ctx.fillStyle = '#fffdf6';
  roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.1);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = glow ? '#ffb300' : '#d8d2c0';
  ctx.lineWidth = glow ? 3 : 1;
  ctx.stroke();
  ctx.fillStyle = red ? '#d0142c' : '#14161c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${w * 0.26}px system-ui, sans-serif`;
  ctx.fillText(lab, -w * 0.3, -h * 0.36);
  ctx.font = `${w * 0.2}px system-ui, sans-serif`;
  ctx.fillText(sym, -w * 0.3, -h * 0.2);
  ctx.font = `${w * 0.55}px system-ui, sans-serif`;
  ctx.fillText(sym, 0, h * 0.08);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(h, k) { const [r, g, b] = hexRgb(h); return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
