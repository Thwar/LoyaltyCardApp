"use client";
import { useEffect, useRef, useState } from "react";

// Camera barcode/QR scanner. Uses the native BarcodeDetector API where available
// (Android Chrome — fast, reads the pass's PDF417/QR) and falls back to a ZXing
// JS decoder elsewhere (iOS Safari has no BarcodeDetector), so iPhones/iPads
// can scan too. The ZXing bundle is imported lazily, only when needed.
export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [err, setErr] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let zxing: { stop(): void } | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = typeof window !== "undefined" ? (window as any).BarcodeDetector : undefined;

    function cleanup() {
      stopped = true;
      cancelAnimationFrame(raf);
      zxing?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    }

    function found(value: string) {
      cleanup();
      onDetectedRef.current(value);
    }

    async function start() {
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

        if (BD) {
          const detector = new BD(); // detect all supported formats (PDF417, QR, etc.)
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(v);
              const value = codes?.[0]?.rawValue ? String(codes[0].rawValue).trim() : "";
              if (value) return found(value);
            } catch {
              /* transient detect error — keep scanning */
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          return;
        }

        // No BarcodeDetector (iOS Safari et al.) → ZXing JS decoder.
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (stopped) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.QR_CODE]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints);
        zxing = await reader.decodeFromStream(stream, v, (result, _error, controls) => {
          if (stopped) {
            controls.stop();
            return;
          }
          const value = result ? String(result.getText()).trim() : "";
          if (value) {
            controls.stop();
            found(value);
          }
        });
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
