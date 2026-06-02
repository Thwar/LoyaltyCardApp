// Stamp-card preview shown in the dashboard + enrollment page.
// (The Apple Wallet pass renders its own strip image; this is just the web preview.)
import type { ReactElement } from "react";

export function CardPreview({
  businessName,
  totalSlots,
  currentStamps = 0,
  rewardDescription,
  cardColor,
  textColor = "#FFFFFF",
  code = "000",
  logoUrl,
  lastVisit = "Hoy",
  showBarcode = false,
}: {
  businessName: string;
  totalSlots: number;
  currentStamps?: number;
  rewardDescription: string;
  cardColor: string;
  textColor?: string;
  code?: string;
  logoUrl?: string;
  lastVisit?: string;
  showBarcode?: boolean;
}) {
  const label = { fontSize: 10, letterSpacing: 1, opacity: 0.8, textTransform: "uppercase" as const };

  return (
    <div style={{ background: cardColor, color: textColor, borderRadius: 18, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
      {/* header: business name + SELLOS count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={businessName} style={{ maxHeight: 40, maxWidth: 180, objectFit: "contain" }} />
        ) : (
          <strong style={{ fontSize: 18, lineHeight: 1.2 }}>{businessName}</strong>
        )}
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div style={label}>Sellos</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {Math.min(currentStamps, totalSlots)}/{totalSlots}
          </div>
        </div>
      </div>

      {/* stamps: big circles grid — star when filled, number when empty */}
      <div className="stamp-grid" style={{ margin: "16px 0" }}>
        {Array.from({ length: totalSlots }).map((_, i) => {
          const filled = i < currentStamps;
          return (
            <div
              key={i}
              className="stamp"
              style={{
                border: `2px solid ${textColor}`,
                background: filled ? textColor : "transparent",
                color: filled ? cardColor : textColor,
                opacity: filled ? 1 : 0.6,
              }}
            >
              {filled ? "" : i + 1}
            </div>
          );
        })}
      </div>

      {/* fields: reward + code */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={label}>Última visita</div>
          <div style={{ fontSize: 14 }}>{lastVisit}</div>
        </div>
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div style={label}>Tu código</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{code}</div>
        </div>
      </div>

      {showBarcode && <PreviewBarcode seed={code} />}
    </div>
  );
}

// Decorative PDF417-style barcode for the web preview. The real wallet pass
// carries the actual scannable code; this just mirrors its look. Pattern is a
// pure function of the seed (no random/date) so server + client render match.
function PreviewBarcode({ seed }: { seed: string }) {
  const ROWS = 5;
  const COLS = 42;
  const CELL = 3;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const rnd = () => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h;
  };
  const rects: ReactElement[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const edge = c < 2 || c >= COLS - 2; // solid start/stop bars
      if (edge || rnd() % 100 < 46) {
        rects.push(<rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill="#15151a" />);
      }
    }
  }
  return (
    <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", marginTop: 16 }}>
      <svg
        viewBox={`0 0 ${COLS * CELL} ${ROWS * CELL}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 46, display: "block" }}
        aria-hidden="true"
      >
        {rects}
      </svg>
    </div>
  );
}
