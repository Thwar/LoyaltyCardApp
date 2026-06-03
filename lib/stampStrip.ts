import "server-only";
import sharp from "sharp";
import type { StampShape } from "./types";
import { buildStampGridSvg } from "./stampShapes";

// Apple Wallet has no native stamp grid, so we draw the stamps as a PNG "strip"
// image embedded in the pass, in the card's text color on a transparent background
// (so the card color shows through). Base canvas 375 x 144 pt; rendered at 1x/2x/3x.
// Google Wallet also has no stamp widget — there we render the same grid as the
// pass hero banner (renderStampHero) on the card color.

const BASE_W = 375;
const BASE_H = 144;

export async function renderStampStrip(
  filled: number,
  total: number,
  color: string,
  scale: number,
  shape: StampShape = "circle"
): Promise<Buffer> {
  const svg = buildStampGridSvg({
    filled: Math.max(0, Math.min(filled, total)),
    total,
    width: BASE_W * scale,
    height: BASE_H * scale,
    pad: 14 * scale,
    shape,
    color,
    strokeW: Math.max(2, 2.5 * scale),
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Google Wallet hero banner (~3:1): the stamp grid on the card color, so the
// banner blends into the card. Served by /api/card/[id]/stamps.
export async function renderStampHero(
  filled: number,
  total: number,
  shape: StampShape,
  color: string,
  background: string
): Promise<Buffer> {
  const svg = buildStampGridSvg({
    filled: Math.max(0, Math.min(filled, total)),
    total,
    width: 1032,
    height: 336,
    pad: 60,
    shape,
    color,
    strokeW: 6,
    background,
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
