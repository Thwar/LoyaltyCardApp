"use client";
import { useEffect, useRef, useState } from "react";

// Camera barcode/QR scanner using the native BarcodeDetector API (great on
// Android Chrome — reads the pass's PDF417/QR). Falls back to a message where
// it's unsupported (e.g. iOS Safari), so the cashier can type the code instead.
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [err, setErr] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = typeof window !== "undefined" ? (window as any).BarcodeDetector : undefined;

    function cleanup() {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    }

    async function start() {
      if (!BD) {
        setErr("Tu navegador no permite escanear aquí. Escribe el código a mano (o usa Chrome en Android).");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop()); // unmounted while acquiring the camera
          return;
        }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        const detector = new BD(); // detect all supported formats (PDF417, QR, etc.)
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(v);
            const value = codes?.[0]?.rawValue ? String(codes[0].rawValue).trim() : "";
            if (value) {
              cleanup();
              onDetectedRef.current(value);
              return;
            }
          } catch {
            /* transient detect error — keep scanning */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setErr("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
      }
    }

    start();
    return cleanup;
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Escanear código</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {err ? (
          <div className="error-box">{err}</div>
        ) : (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000", aspectRatio: "1 / 1", objectFit: "cover" }} />
            <p className="muted" style={{ fontSize: 13, marginTop: 10, marginBottom: 0, textAlign: "center" }}>
              Apunta la cámara al código de barras de la tarjeta del casero.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
