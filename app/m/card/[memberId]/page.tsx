"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/PageLoader";
import { MembershipCardVisual } from "@/components/MembershipCardVisual";
import { APPLE_WALLET_BADGE, GOOGLE_WALLET_BADGE } from "@/lib/walletBadges";

interface CardInfo {
  memberName: string;
  programName: string;
  status: "active" | "expired" | "no_visits";
  statusLabel: string;
  expiresAt: number | null;
  tracksVisits: boolean;
  visitsRemaining: number | null;
  memberCode: string;
  cardColor: string;
  textColor: string;
  logoPng: string;
  saveUrl: string | null;
  appleConfigured: boolean;
}

function fmtDay(ts: number | null): string {
  if (ts == null) return "Sin vencimiento";
  try {
    return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/La_Paz" });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

export default function MembershipCardPage() {
  const params = useParams<{ memberId: string }>();
  const memberId = params?.memberId;

  const [info, setInfo] = useState<CardInfo | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!memberId) return;
    fetch(`/api/membership/card/${memberId}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) setLoadErr(j.error || "No se pudo cargar.");
        else setInfo(j);
        setLoading(false);
      })
      .catch(() => {
        setLoadErr("No se pudo cargar.");
        setLoading(false);
      });
  }, [memberId]);

  if (loading) return <PageLoader />;
  if (loadErr || !info) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="error-box">{loadErr || "No se pudo cargar."}</div>
      </div>
    );
  }

  const showApple = info.appleConfigured && isIOS;
  const showGoogle = !!info.saveUrl;
  const rightLabel = info.tracksVisits ? "VISITAS" : "ESTADO";
  const rightValue = info.tracksVisits ? String(info.visitsRemaining ?? "∞") : info.statusLabel;

  return (
    <div className="container" style={{ maxWidth: 460, textAlign: "center" }}>
      <div className="center" style={{ margin: "8px 0 16px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ height: 48 }} />
      </div>

      <div className="success-box">¡Listo, {info.memberName.split(/\s+/)[0]}! Tu membresía de {info.programName} está activa.</div>

      <div style={{ margin: "8px 0 16px", textAlign: "left" }}>
        <MembershipCardVisual
          programName={info.programName}
          cardColor={info.cardColor}
          textColor={info.textColor}
          logoPng={info.logoPng || undefined}
          memberName={info.memberName}
          rightLabel={rightLabel}
          rightValue={rightValue}
          footer={`Vence: ${fmtDay(info.expiresAt)}`}
        />
      </div>

      <div className="card center">
        <p className="muted" style={{ margin: "0 0 6px" }}>Tu código (muéstralo al entrar)</p>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>{info.memberCode}</div>
      </div>

      {showApple || showGoogle ? (
        <div className="center mt" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {showApple && (
            <a href={`/api/wallet/apple/membership/${memberId}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={APPLE_WALLET_BADGE} alt="Añadir a Apple Wallet" style={{ height: 52, width: "auto" }} />
            </a>
          )}
          {showGoogle && (
            <a href={info.saveUrl!} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={GOOGLE_WALLET_BADGE} alt="Añadir a Google Wallet" style={{ height: 52, width: "auto" }} />
            </a>
          )}
        </div>
      ) : (
        <div className="warn-box mt">Guarda tu código. El pase digital estará disponible muy pronto.</div>
      )}
    </div>
  );
}
