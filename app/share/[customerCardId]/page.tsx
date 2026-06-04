"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QrCode } from "@/components/QrCode";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";

interface ShareInfo {
  customerName: string;
  businessName: string;
  cardId: string;
  rewardDescription: string;
  referralCount: number;
}

export default function SharePage() {
  const params = useParams<{ customerCardId: string }>();
  const customerCardId = params?.customerCardId;

  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") setCanShare(true);
  }, []);

  useEffect(() => {
    if (!customerCardId) return;
    fetch(`/api/referral/${customerCardId}`)
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
  }, [customerCardId]);

  if (loading) return <PageLoader />;
  if (loadErr || !info) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="error-box">{loadErr || "No se pudo cargar."}</div>
      </div>
    );
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const refLink = `${base}/join/${info.cardId}?ref=${customerCardId}`;
  const firstName = (info.customerName || "").trim().split(/\s+/)[0] || "";
  const shareText = `¡Únete a la tarjeta de ${info.businessName} y juntemos sellos! 🎁 ${refLink}`;

  async function nativeShare() {
    try {
      await navigator.share({ title: info!.businessName, text: `¡Únete a la tarjeta de ${info!.businessName} y juntemos sellos! 🎁`, url: refLink });
    } catch {
      /* user cancelled — ignore */
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className="container" style={{ maxWidth: 460, textAlign: "center" }}>
      <div className="center" style={{ margin: "8px 0 18px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ height: 48 }} />
      </div>

      <h1 style={{ fontSize: 24, lineHeight: 1.2, margin: "0 0 8px" }}>
        {firstName ? `${firstName}, comparte y gana sellos 🎁` : "Comparte y gana sellos 🎁"}
      </h1>
      <p className="muted" style={{ margin: "0 auto 22px", maxWidth: 360, lineHeight: 1.5 }}>
        Cuando un amigo se una a <strong>{info.businessName}</strong> con tu link y reciba su primer sello, ¡tú ganas un
        sello!
      </p>

      <div className="card" style={{ display: "inline-block", padding: 16, marginBottom: 18 }}>
        <QrCode value={refLink} size={232} />
      </div>
      <p className="muted" style={{ fontSize: 13, margin: "0 0 22px" }}>Tu amigo escanea este código para unirse.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto" }}>
        {canShare && (
          <button className="btn btn-primary" onClick={nativeShare}>
            Compartir mi link
          </button>
        )}
        <a
          className="btn"
          style={{ background: "#25D366", color: "#fff" }}
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
        >
          Compartir por WhatsApp
        </a>
        <button className="btn btn-outline" onClick={copy}>
          {copied ? "¡Link copiado!" : "Copiar link"}
        </button>
      </div>

      {info.referralCount > 0 && (
        <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
          Ya has invitado a {info.referralCount} {info.referralCount === 1 ? "casero" : "caseros"}. 🙌
        </p>
      )}

      <div style={{ marginTop: 28 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
