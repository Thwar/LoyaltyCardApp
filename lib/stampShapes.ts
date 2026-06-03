import type { StampShape } from "./types";

// Stamp shapes shared by the Apple strip, the Google hero banner, and the web
// preview. Pure SVG-string generation (no sharp / no DOM) so it runs on server
// AND client. The actual PNG rasterization lives in stampStrip.ts (server-only).

// Geometric shapes (drawn programmatically). Active = solid; inactive = outline.
export const STAMP_SHAPES: { id: StampShape; label: string }[] = [
  { id: "circle", label: "Círculo" },
  { id: "square", label: "Cuadrado" },
  { id: "star", label: "Estrella" },
  { id: "diamond", label: "Diamante" },
  { id: "heart", label: "Corazón" },
];

// Themed glyphs (Phosphor "fill", ISC/MIT). Single solid path on a 256 viewBox.
// Active = solid; inactive = same glyph at low opacity. Curated by SME vertical.
const ICON_PATHS: Partial<Record<StampShape, string>> = {
  coffee: "M208,80H32a8,8,0,0,0-8,8v48a96.3,96.3,0,0,0,32.54,72H32a8,8,0,0,0,0,16H208a8,8,0,0,0,0-16H183.46a96.59,96.59,0,0,0,27-40.09A40,40,0,0,0,248,128v-8A40,40,0,0,0,208,80Zm24,48a24,24,0,0,1-17.2,23,95.78,95.78,0,0,0,1.2-15V97.38A24,24,0,0,1,232,120ZM112,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm32,0V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0ZM80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Z",
  beer: "M216,88H200V72a40,40,0,0,0-40-40H148.82c-11.91-10.2-28-16-44.82-16C68.71,16,40,41.12,40,72V208a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16v-8h16a24,24,0,0,0,24-24V112A24,24,0,0,0,216,88ZM104,184a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0ZM57,64c4.46-18.24,23.85-32,47-32,13.87,0,27.06,5,36.21,13.78A8,8,0,0,0,145.74,48H160a24,24,0,0,1,22.62,16ZM224,176a8,8,0,0,1-8,8H200V104h16a8,8,0,0,1,8,8Z",
  wine: "M205.33,103.67,183.56,29.74A8,8,0,0,0,175.89,24H80.11a8,8,0,0,0-7.67,5.74L50.67,103.67a63.46,63.46,0,0,0,17.42,64.67A87.41,87.41,0,0,0,120,191.63V232H88a8,8,0,1,0,0,16h80a8,8,0,1,0,0-16H136V191.63a87.39,87.39,0,0,0,51.91-23.29A63.48,63.48,0,0,0,205.33,103.67ZM86.09,40h83.82L190,108.19c.09.3.17.6.25.9-21.42,7.68-45.54-1.6-58.63-8.23C106.43,88.11,86.43,86.49,71.68,88.93Z",
  pizza: "M239.54,63a15.91,15.91,0,0,0-7.25-9.9,201.49,201.49,0,0,0-208.58,0,16,16,0,0,0-5.37,22l96,157.27a16,16,0,0,0,27.36,0l96-157.27A15.82,15.82,0,0,0,239.54,63Zm-55.1,68.53a40,40,0,0,0-41.38,67.77L128,224,96.5,172.43a40,40,0,1,0-41.35-67.76L48.8,94.26a152,152,0,0,1,158.39,0Z",
  burger: "M35.58,98.06a16,16,0,0,1-3.23-13.44C39.78,49.5,80,24,128,24s88.22,25.5,95.65,60.62A16,16,0,0,1,207.93,104H48.07A16,16,0,0,1,35.58,98.06Zm193.68,54.42-41.13,15L151,152.57a8,8,0,0,0-5.94,0l-37,14.81L71,152.57a8,8,0,0,0-5.7-.09l-44,16a8,8,0,0,0,5.47,15L40,178.69V184a40,40,0,0,0,40,40h96a40,40,0,0,0,40-40v-9.67l18.73-6.81a8,8,0,1,0-5.47-15ZM24,136H232a8,8,0,0,0,0-16H24a8,8,0,0,0,0,16Z",
  icecream: "M208,97.37V96A80,80,0,0,0,48,96v1.37A24,24,0,0,0,56,144h3.29l54.82,95.94a16,16,0,0,0,27.78,0L196.71,144H200a24,24,0,0,0,8-46.63ZM146.89,198.94,115.5,144h19.29l21.75,38.06ZM77.71,144H97.07l40.61,71.06L128,232Zm88,21.94L153.21,144h25.08Z",
  cookie: "M224,120a40,40,0,0,1-40-40,8,8,0,0,0-8-8,40,40,0,0,1-40-40,8,8,0,0,0-8-8A104,104,0,1,0,232,128,8,8,0,0,0,224,120ZM75.51,99.51a12,12,0,1,1,0,17A12,12,0,0,1,75.51,99.51Zm25,73a12,12,0,1,1,0-17A12,12,0,0,1,100.49,172.49Zm23-40a12,12,0,1,1,17,0A12,12,0,0,1,123.51,132.49Zm41,48a12,12,0,1,1,0-17A12,12,0,0,1,164.49,180.49Z",
  bread: "M200,40H48a40,40,0,0,0-16,76.65V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V116.65A40,40,0,0,0,200,40Zm-56,64a8,8,0,0,0,0,16v80H48V120a8,8,0,0,0,0-16,24,24,0,0,1,0-48h96a24,24,0,0,1,0,48Z",
  scissors: "M236.52,187.09l-143-97.87a36,36,0,1,0-14.38,17.27l21.39,21.69L79.15,149.54l0,0a35.91,35.91,0,1,0,14.38,17.27l26.91-18.41L170,198.64a32.26,32.26,0,0,0,22.7,9.37,31.52,31.52,0,0,0,4.11-.27l.28,0,36.27-6.11a8,8,0,0,0,3.19-14.5Zm-162.38-97A20,20,0,1,1,80,76,20,20,0,0,1,74.14,90.13Zm0,104A20,20,0,1,1,80,180,20,20,0,0,1,74.14,194.15Zm61-101.5L169.94,57.4a32.19,32.19,0,0,1,26.84-9.14l.28,0,36,6.07a8.21,8.21,0,0,1,6.09,4.42,8,8,0,0,1-2.67,10.12l-69.93,47.85a4,4,0,0,1-4.51,0l-26.31-18A4,4,0,0,1,135.18,92.65Z",
  paw: "M240,108a28,28,0,1,1-28-28A28,28,0,0,1,240,108ZM72,108a28,28,0,1,0-28,28A28,28,0,0,0,72,108ZM92,88A28,28,0,1,0,64,60,28,28,0,0,0,92,88Zm72,0a28,28,0,1,0-28-28A28,28,0,0,0,164,88Zm23.12,60.86a35.3,35.3,0,0,1-16.87-21.14,44,44,0,0,0-84.5,0A35.25,35.25,0,0,1,69,148.82,40,40,0,0,0,88,224a39.48,39.48,0,0,0,15.52-3.13,64.09,64.09,0,0,1,48.87,0,40,40,0,0,0,34.73-72Z",
  gift: "M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16h60a4,4,0,0,0,4-4V120H40V88h80v32h16V88h80v32H136v92a4,4,0,0,0,4,4h60a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM84.51,59a13.69,13.69,0,0,1-4.5-10A16.62,16.62,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92C109.71,70.39,94,67.43,84.51,59Zm87,0c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08,13.69,13.69,0,0,1,171.49,59Z",
  bag: "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm-88,96A48.05,48.05,0,0,1,80,88a8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0A48.05,48.05,0,0,1,128,136Z",
  tag: "M243.31,136,144,36.69A15.86,15.86,0,0,0,132.69,32H40a8,8,0,0,0-8,8v92.69A15.86,15.86,0,0,0,36.69,144L136,243.31a16,16,0,0,0,22.63,0l84.68-84.68a16,16,0,0,0,0-22.63ZM84,96A12,12,0,1,1,96,84,12,12,0,0,1,84,96Z",
  leaf: "M223.45,40.07a8,8,0,0,0-7.52-7.52C139.8,28.08,78.82,51,52.82,94a87.09,87.09,0,0,0-12.76,49A101.72,101.72,0,0,0,46.7,175.2a4,4,0,0,0,6.61,1.43l85-86.3a8,8,0,0,1,11.32,11.32L56.74,195.94,42.55,210.13a8.2,8.2,0,0,0-.6,11.1,8,8,0,0,0,11.71.43l16.79-16.79c14.14,6.84,28.41,10.57,42.56,11.07q1.67.06,3.33.06A86.93,86.93,0,0,0,162,203.18C205,177.18,227.93,116.21,223.45,40.07Z",
};

// Icons for the picker (Spanish labels), in ICON_PATHS order.
export const STAMP_ICONS: { id: StampShape; label: string }[] = [
  { id: "coffee", label: "Café" },
  { id: "beer", label: "Cerveza" },
  { id: "wine", label: "Copa de vino" },
  { id: "pizza", label: "Pizza" },
  { id: "burger", label: "Hamburguesa" },
  { id: "icecream", label: "Helado" },
  { id: "cookie", label: "Galleta" },
  { id: "bread", label: "Pan" },
  { id: "scissors", label: "Tijeras" },
  { id: "paw", label: "Huella" },
  { id: "gift", label: "Regalo" },
  { id: "bag", label: "Bolsa" },
  { id: "tag", label: "Etiqueta" },
  { id: "leaf", label: "Hoja" },
];

// Every valid stamp id (for server-side validation).
export const STAMP_SHAPE_IDS: StampShape[] = [...STAMP_SHAPES, ...STAMP_ICONS].map((s) => s.id);

export const STAMPS_PER_ROW = 5;

const ICON_VB = 256; // Phosphor viewBox

// A themed glyph centered at (cx,cy), scaled into a 2r box.
function iconMarkup(path: string, cx: number, cy: number, r: number, filled: boolean, color: string): string {
  const s = (2 * r) / ICON_VB;
  return `<g transform="translate(${(cx - r).toFixed(2)},${(cy - r).toFixed(2)}) scale(${s.toFixed(4)})"><path d="${path}" fill="${color}" opacity="${filled ? 1 : 0.28}"/></g>`;
}

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
  const icon = ICON_PATHS[shape];
  if (icon) return iconMarkup(icon, cx, cy, r, filled, color);

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
