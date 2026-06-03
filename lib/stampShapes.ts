import type { StampShape } from "./types";

// Stamp shapes shared by the Apple strip, the Google hero banner, and the web
// preview. Pure SVG-string generation (no sharp / no DOM) so it runs on server
// AND client. The actual PNG rasterization lives in stampStrip.ts (server-only).

export const STAMP_SHAPES: { id: StampShape; label: string }[] = [
  { id: "circle", label: "Círculo" },
  { id: "square", label: "Cuadrado" },
  { id: "star", label: "Estrella" },
  { id: "diamond", label: "Diamante" },
  { id: "heart", label: "Corazón" },
];

export const STAMPS_PER_ROW = 5;

function starPoints(cx: number, cy: number, rOuter: number, rInner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI / 5) * i - Math.PI / 2; // first point at top
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

// Parametric heart, sampled to a polygon and normalized into a 2r box at (cx,cy).
function heartPoints(cx: number, cy: number, r: number): string {
  const raw: [number, number][] = [];
  const N = 44;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * 2 * Math.PI;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); // flip for SVG y-down
    raw.push([x, y]);
  }
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = (2 * r) / Math.max(maxX - minX, maxY - minY);
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  return raw.map(([x, y]) => `${(cx + (x - mx) * scale).toFixed(2)},${(cy + (y - my) * scale).toFixed(2)}`).join(" ");
}

// One stamp as SVG markup. Filled → solid `color`; empty → faint outline in `color`.
export function stampShapeMarkup(
  shape: StampShape,
  cx: number,
  cy: number,
  r: number,
  filled: boolean,
  color: string,
  strokeW: number
): string {
  const attrs = filled
    ? `fill="${color}"`
    : `fill="none" stroke="${color}" stroke-width="${strokeW}" opacity="0.55"`;
  switch (shape) {
    case "square":
      return `<rect x="${(cx - r).toFixed(2)}" y="${(cy - r).toFixed(2)}" width="${(2 * r).toFixed(2)}" height="${(2 * r).toFixed(2)}" rx="${(r * 0.22).toFixed(2)}" ${attrs}/>`;
    case "diamond":
      return `<polygon points="${cx.toFixed(2)},${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)},${cy.toFixed(2)} ${cx.toFixed(2)},${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)},${cy.toFixed(2)}" stroke-linejoin="round" ${attrs}/>`;
    case "star":
      return `<polygon points="${starPoints(cx, cy, r, r * 0.5)}" stroke-linejoin="round" ${attrs}/>`;
    case "heart":
      return `<polygon points="${heartPoints(cx, cy, r)}" stroke-linejoin="round" ${attrs}/>`;
    case "circle":
    default:
      return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" ${attrs}/>`;
  }
}

// A full stamp grid as an <svg> string (≤5 per row, centered, multiple rows).
export function buildStampGridSvg(opts: {
  filled: number;
  total: number;
  width: number;
  height: number;
  pad: number;
  shape: StampShape;
  color: string;
  strokeW: number;
  background?: string;
}): string {
  const { filled, total, width: W, height: H, pad, shape, color, strokeW, background } = opts;
  const rows = Math.ceil(total / STAMPS_PER_ROW);
  const cellW = (W - pad * 2) / Math.min(STAMPS_PER_ROW, total);
  const cellH = (H - pad * 2) / rows;
  const r = Math.min(cellW, cellH) * 0.34;
  let shapes = "";
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / STAMPS_PER_ROW);
    const countThisRow = Math.min(STAMPS_PER_ROW, total - row * STAMPS_PER_ROW);
    const col = i - row * STAMPS_PER_ROW;
    const rowStartX = (W - countThisRow * cellW) / 2; // center each row
    const cx = rowStartX + cellW * col + cellW / 2;
    const cy = pad + cellH * row + cellH / 2;
    shapes += stampShapeMarkup(shape, cx, cy, r, i < filled, color, strokeW);
  }
  const bg = background ? `<rect width="${W}" height="${H}" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${shapes}</svg>`;
}
