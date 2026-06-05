// A simple visual of a membership card (used on the enroll preview + card page).
export function MembershipCardVisual({
  programName,
  cardColor,
  textColor = "#FFFFFF",
  logoPng,
  memberName = "Tu nombre",
  rightLabel,
  rightValue,
  footer,
}: {
  programName: string;
  cardColor: string;
  textColor?: string;
  logoPng?: string;
  memberName?: string;
  rightLabel: string;
  rightValue: string;
  footer?: string;
}) {
  return (
    <div style={{ background: cardColor, color: textColor, borderRadius: 16, padding: "18px 20px", boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}>
      {logoPng ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/png;base64,${logoPng}`} alt={programName} style={{ maxHeight: 34, maxWidth: 160, objectFit: "contain" }} />
      ) : (
        <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 700 }}>{programName}</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, fontSize: 11, opacity: 0.8, letterSpacing: 0.5 }}>
        <span>SOCIO</span>
        <span>{rightLabel}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, fontWeight: 700 }}>
        <span>{memberName}</span>
        <span>{rightValue}</span>
      </div>
      {footer && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 16 }}>{footer}</div>}
    </div>
  );
}
