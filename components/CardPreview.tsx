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
    </div>
  );
}
