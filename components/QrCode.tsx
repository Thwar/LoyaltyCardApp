"use client";
import { useEffect, useState, type CSSProperties } from "react";
import QRCode from "qrcode";

// `size` sets the generation resolution (and default display size); pass
// `imgStyle` (e.g. width 100%) to let CSS scale the rendered image instead.
export function QrCode({ value, size = 200, imgStyle }: { value: string; size?: number; imgStyle?: CSSProperties }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => active && setSrc(url))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) return <div style={{ width: size, height: size, background: "#f0f0f0", borderRadius: 8, ...imgStyle }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR" width={size} height={size} style={{ borderRadius: 8, ...imgStyle }} />;
}
