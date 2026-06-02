import "server-only";
import sharp from "sharp";

function hexToRgb(hex: string) {
  const h = (hex || "#E53935").replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return { r: parseInt(f.slice(0, 2), 16) || 0, g: parseInt(f.slice(2, 4), 16) || 0, b: parseInt(f.slice(4, 6), 16) || 0, alpha: 1 };
}

// Composite a (possibly wide) logo into a size×size square on the card color —
// used for Google's circular program logo and the Apple pass/notification icon.
export async function squareLogo(rawPng: Buffer, hex: string, size = 660): Promise<Buffer> {
  const inner = Math.round(size * 0.92); // small margin
  const logo = await sharp(rawPng).trim().resize({ width: inner, height: inner, fit: "inside" }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: hexToRgb(hex) } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}
