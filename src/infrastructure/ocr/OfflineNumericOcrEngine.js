import { OcrEngine } from '../../application/ports/OcrEngine.js';

// Small offline digit reader for photos of device displays (BP monitor, oximeter, thermometer).
// No model download: glyphs are matched against digits rendered from system fonts.
// Works best on a tight, high-contrast crop. Scores are template similarity, not clinical confidence.

const GLYPH_W = 20;
const GLYPH_H = 32;

/** Split a binarised image into rows, then rows into glyphs, each resampled to 20×32. */
export function extractGlyphs(data, width, height) {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;

  // Light background → dark digits, and the other way round (LCDs).
  const border = [];
  for (let x = 0; x < width; x++) border.push(gray[x], gray[(height - 1) * width + x]);
  for (let y = 0; y < height; y++) border.push(gray[y * width], gray[y * width + width - 1]);
  border.sort((a, b) => a - b);
  const lightBackground = border[Math.floor(border.length / 2)] > 128;
  const ink = (i) => (lightBackground ? gray[i] < 128 : gray[i] > 128);

  const runs = (counts, min) => {
    const out = [];
    let start = -1;
    for (let i = 0; i <= counts.length; i++) {
      if (counts[i] >= min) {
        if (start < 0) start = i;
      } else if (start >= 0) {
        out.push([start, i - 1]);
        start = -1;
      }
    }
    return out;
  };

  const rowCounts = Array.from({ length: height }, (_, y) => {
    let n = 0;
    for (let x = 0; x < width; x++) n += ink(y * width + x) ? 1 : 0;
    return n;
  });
  const rows = runs(rowCounts, 2).filter(([a, b]) => b - a >= 8);

  const glyphs = [];
  rows.forEach(([top, bottom], row) => {
    const colCounts = Array.from({ length: width }, (_, x) => {
      let n = 0;
      for (let y = top; y <= bottom; y++) n += ink(y * width + x) ? 1 : 0;
      return n;
    });
    for (const [left, right] of runs(colCounts, 1)) {
      if (right - left < 1) continue;
      const h = bottom - top + 1;
      const w = right - left + 1;
      const pixels = new Uint8Array(GLYPH_W * GLYPH_H);
      for (let y = 0; y < GLYPH_H; y++)
        for (let x = 0; x < GLYPH_W; x++)
          pixels[y * GLYPH_W + x] = ink((top + Math.floor((y * h) / GLYPH_H)) * width + left + Math.floor((x * w) / GLYPH_W)) ? 1 : 0;
      glyphs.push({ pixels, row, width: w, height: h });
    }
  });
  return glyphs;
}

let templates;
function digitTemplates() {
  if (templates) return templates;
  const canvas = document.createElement('canvas');
  canvas.width = 90;
  canvas.height = 100;
  const c = canvas.getContext('2d', { willReadFrequently: true });
  templates = [];
  for (const font of ['Arial', 'Helvetica', 'Consolas', 'monospace', 'Segoe UI'])
    for (const weight of ['normal', 'bold'])
      for (const digit of '0123456789') {
        c.fillStyle = '#fff';
        c.fillRect(0, 0, 90, 100);
        c.fillStyle = '#000';
        c.font = `${weight} 70px ${font}`;
        c.fillText(digit, 8, 78);
        const g = extractGlyphs(c.getImageData(0, 0, 90, 100).data, 90, 100)[0];
        if (g) templates.push({ ...g, digit });
      }
  return templates;
}

function match(glyph) {
  let best = { score: 0, digit: '?' };
  for (const t of digitTemplates()) {
    let inter = 0;
    let union = 0;
    for (let i = 0; i < glyph.pixels.length; i++) {
      inter += glyph.pixels[i] & t.pixels[i];
      union += glyph.pixels[i] | t.pixels[i];
    }
    const aspect = Math.abs(glyph.width / glyph.height - t.width / t.height);
    const score = (inter / (union || 1)) * Math.max(0.5, 1 - aspect * 0.3);
    if (score > best.score) best = { score, digit: t.digit };
  }
  return best;
}

export class OfflineNumericOcrEngine extends OcrEngine {
  async recognize(image) {
    const bitmap = await createImageBitmap(image);
    try {
      const scale = Math.min(1, 1200 / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const glyphs = extractGlyphs(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);

      let text = '';
      const scores = [];
      glyphs.forEach((g, i) => {
        if (i > 0 && g.row !== glyphs[i - 1].row) text += '\n';
        const m = match(g);
        text += m.score >= 0.6 ? m.digit : '?';
        scores.push(m.score);
      });
      if (!/\d/.test(text)) throw new Error('No clear digits found. Crop tightly around the numbers, or type them in.');
      return { rawText: text, confidence: Math.round((100 * scores.reduce((a, b) => a + b, 0)) / scores.length), engine: 'offline-digits' };
    } finally {
      bitmap.close();
    }
  }

  /** A simulated device photo for the demo (no camera needed). */
  sampleImage(lines) {
    return sampleDisplayImage(lines);
  }
}

/** Draws a sample BP-monitor display (three lines: SYS, DIA, PULSE) for the demo. Returns a PNG Blob. */
export function sampleDisplayImage(lines) {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 120 * lines.length + 40;
  const c = canvas.getContext('2d');
  c.fillStyle = '#d9ddd2';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#111';
  c.font = 'bold 96px Arial';
  c.textAlign = 'right';
  lines.forEach((line, i) => c.fillText(String(line), 320, 110 + i * 120));
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
