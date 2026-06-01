import "server-only";
import sharp from "sharp";

// Apple Wallet has no native stamp grid, so we draw the stamps as a PNG "strip"
// image embedded in the pass — big circles in up to 2 rows, in the card's text
// color, on a transparent background (so the card color shows through).
// Base canvas is 375 x 144 pt (storeCard strip aspect); rendered at 1x/2x/3x.

const BASE_W = 375;
const BASE_H = 144;
const PER_ROW = 5;

function buildSvg(filled: number, total: number, color: string, scale: number): string {
  const W = BASE_W * scale;
  const H = BASE_H * scale;
  const pad = 14 * scale;
  const rows = Math.ceil(total / PER_ROW);
  const cellW = (W - pad * 2) / Math.min(PER_ROW, total);
  const cellH = (H - pad * 2) / rows;
  const r = Math.min(cellW, cellH) * 0.34;
  const stroke = Math.max(2, 2.5 * scale);

  let circles = "";
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / PER_ROW);
    const countThisRow = Math.min(PER_ROW, total - row * PER_ROW);
    const col = i - row * PER_ROW;
    const rowStartX = (W - countThisRow * cellW) / 2; // center each row
    const cx = rowStartX + cellW * col + cellW / 2;
    const cy = pad + cellH * row + cellH / 2;
    circles +=
      i < filled
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`
        : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" opacity="0.55"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${circles}</svg>`;
}

export async function renderStampStrip(filled: number, total: number, color: string, scale: number): Promise<Buffer> {
  const svg = buildSvg(Math.max(0, Math.min(filled, total)), total, color, scale);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
