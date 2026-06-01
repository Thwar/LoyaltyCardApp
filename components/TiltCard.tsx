"use client";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { CardPreview } from "./CardPreview";

// Interactive 3D tilt: an intro wiggle on load (CSS, works everywhere), then
// follows the cursor on desktop and the device gyroscope on a phone.
// iOS needs motion permission, requested on a tap (click) of the card.
const MAX = 12;
const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));

type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function TiltCard(props: ComponentProps<typeof CardPreview>) {
  const ref = useRef<HTMLDivElement>(null);
  const requested = useRef(false);
  const [interacted, setInteracted] = useState(false);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, a: false });

  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    const gamma = e.gamma ?? 0; // left-right (-90..90)
    const beta = e.beta ?? 45; // front-back; ~45 holding a phone to read
    setInteracted(true);
    setT({ rx: clamp(-(beta - 45) / 3), ry: clamp(gamma / 3), gx: 50 + gamma, gy: 50 + (beta - 45), a: true });
  }, []);

  // Android (no permission gate) can listen right away.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const doe = window.DeviceOrientationEvent as DOE | undefined;
    if (doe && typeof doe.requestPermission !== "function") {
      window.addEventListener("deviceorientation", onOrient);
      return () => window.removeEventListener("deviceorientation", onOrient);
    }
  }, [onOrient]);

  // iOS: request motion permission on a user gesture (a tap). Click is more
  // reliable than touchstart for this prompt; guard so it only asks once.
  const enableGyro = useCallback(() => {
    if (requested.current) return;
    const doe = window.DeviceOrientationEvent as DOE | undefined;
    if (doe && typeof doe.requestPermission === "function") {
      requested.current = true;
      doe
        .requestPermission()
        .then((res) => {
          if (res === "granted") window.addEventListener("deviceorientation", onOrient);
        })
        .catch(() => {});
    }
  }, [onOrient]);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setInteracted(true);
    setT({ rx: clamp(-py * 2 * MAX), ry: clamp(px * 2 * MAX), gx: (px + 0.5) * 100, gy: (py + 0.5) * 100, a: true });
  }
  function reset() {
    setT((p) => ({ ...p, rx: 0, ry: 0, gx: 50, gy: 50, a: false }));
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={enableGyro}
      style={{ perspective: 900 }}
    >
      <div
        className={interacted ? undefined : "tilt-intro"}
        style={{
          position: "relative",
          transformStyle: "preserve-3d",
          willChange: "transform",
          transition: "transform 0.12s ease",
          ...(interacted ? { transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)` } : {}),
        }}
      >
        <CardPreview {...props} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 18,
            pointerEvents: "none",
            opacity: t.a ? 1 : 0,
            transition: "opacity 0.25s ease",
            background: `radial-gradient(circle at ${t.gx}% ${t.gy}%, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%)`,
          }}
        />
      </div>
    </div>
  );
}
