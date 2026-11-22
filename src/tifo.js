// Tifo collectif : un grand dessin aux couleurs du groupe qui se révèle case par case.
import { TIFO_CELLS } from './store.js';

const N = 10;

export function revealOrder() {
  const idx = [...Array(TIFO_CELLS).keys()];
  let s = 12345;
  for (let i = idx.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function drawTifo(canvas, club, groupName, revealed) {
  const size = canvas.clientWidth || 300;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const S = size;

  // œuvre complète
  const c1 = club.c1, c2 = club.c2;
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = c2;
  for (let i = -S; i < S * 2; i += S / 5) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + S / 10, 0); ctx.lineTo(i + S / 10 - S, S); ctx.lineTo(i - S, S);
    ctx.closePath();
    ctx.globalAlpha = 0.28;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // soleil de rayons
  ctx.save();
  ctx.translate(S / 2, S * 0.45);
  for (let k = 0; k < 24; k++) {
    ctx.rotate(Math.PI / 12);
    ctx.fillStyle = k % 2 ? c2 : c1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(S, -S * 0.08); ctx.lineTo(S, S * 0.08);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // carte géante 7♦
  const cw = S * 0.34, ch = cw * 1.45;
  ctx.save();
  ctx.translate(S / 2, S * 0.45);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#fffdf6';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = S * 0.012;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cw * 0.1) : ctx.rect(-cw / 2, -ch / 2, cw, ch);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d0142c';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${cw * 0.3}px system-ui, sans-serif`;
  ctx.fillText('7', -cw * 0.28, -ch * 0.35);
  ctx.font = `${cw * 0.7}px system-ui, sans-serif`;
  ctx.fillText('♦', 0, ch * 0.08);
  ctx.restore();
  // bandeau
  const bh = S * 0.15;
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.75;
  ctx.fillRect(0, S - bh - S * 0.05, S, bh);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${S * 0.075}px "Arial Black", Impact, system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((groupName || 'MON VIRAGE').toUpperCase().slice(0, 22), S / 2, S - bh / 2 - S * 0.05, S * 0.92);

  // cases cachées
  const cell = S / N;
  const order = revealOrder();
  const shown = new Set(order.slice(0, revealed));
  for (let i = 0; i < N * N; i++) {
    if (shown.has(i)) continue;
    const x = (i % N) * cell, y = Math.floor(i / N) * cell;
    // case cachée : le dessin se devine en transparence
    ctx.fillStyle = (Math.floor(i / N) + i) % 2 ? 'rgba(20,24,38,.86)' : 'rgba(28,33,50,.86)';
    ctx.fillRect(x, y, cell, cell);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 1;
  for (let k = 1; k < N; k++) {
    ctx.beginPath(); ctx.moveTo(k * cell, 0); ctx.lineTo(k * cell, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, k * cell); ctx.lineTo(S, k * cell); ctx.stroke();
  }
}
