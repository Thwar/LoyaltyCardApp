"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
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

  if (!src) return <div style={{ width: size, height: size, background: "#f0f0f0", borderRadius: 8 }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR" width={size} height={size} style={{ borderRadius: 8 }} />;
}
