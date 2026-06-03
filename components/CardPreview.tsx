import { stampShapeMarkup } from "@/lib/stampShapes";
import type { StampShape } from "@/lib/types";

// Stamp-card preview shown in the dashboard + enrollment page.
// (The Apple Wallet pass renders its own strip image; this is just the web preview.)
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
  stampShape = "circle",
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
  stampShape?: StampShape;
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

      {/* stamps: the chosen shape, solid when earned and faint outline when not */}
      <div className="stamp-grid" style={{ margin: "16px 0" }}>
        {Array.from({ length: totalSlots }).map((_, i) => (
          <div
            key={i}
            className="stamp"
            style={{ border: "none", borderRadius: 0, background: "transparent" }}
            dangerouslySetInnerHTML={{
              __html: `<svg viewBox="0 0 100 100" width="100%" height="100%">${stampShapeMarkup(
                stampShape,
                50,
                50,
                42,
                i < currentStamps,
                textColor,
                7
              )}</svg>`,
            }}
          />
        ))}
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

      {showBarcode && <PreviewBarcode />}
    </div>
  );
}

// Decorative PDF417-style barcode for the web preview. The real wallet pass
// carries the actual scannable code; this just mirrors its look. Pattern is a
// pure function of the seed (no random/date) so server + client render match.
// Real PDF417 barcode (pre-generated with bwip-js, served as a static SVG). The
// actual scannable code lives on the wallet pass; this just mirrors its look on
// the landing preview. Loaded from the canonical domain so it survives the apex.
function PreviewBarcode() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com";
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "12px 18px", marginTop: 16 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${base}/homepage/barcode.svg`} alt="" aria-hidden="true" style={{ display: "block", width: "100%", height: "auto" }} />
    </div>
  );
}
