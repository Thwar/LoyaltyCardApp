"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoader } from "@/components/PageLoader";
import { MembershipCardVisual } from "@/components/MembershipCardVisual";

interface PublicProgram {
  id: string;
  name: string;
  description: string;
  cardColor: string;
  textColor?: string;
  logoPng?: string;
  tracksVisits: boolean;
  defaultVisitLimit?: number | null;
  defaultDurationDays?: number | null;
}

export default function MembershipJoinPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const programId = params?.programId;

  const [program, setProgram] = useState<PublicProgram | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    if (!programId) return;
    fetch(`/api/membership/${programId}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) setLoadErr(j.error || "Membresía no encontrada.");
        else setProgram(j.program);
        setLoading(false);
      })
      .catch(() => {
        setLoadErr("No se pudo cargar.");
        setLoading(false);
      });
  }, [programId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr("");
    if (!name.trim()) return setFormErr("Tu nombre es obligatorio.");
    if (!email.trim()) return setFormErr("Tu correo electrónico es obligatorio.");
    setSubmitting(true);
    const res = await fetch("/api/membership/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId, name: name.trim(), email: email.trim(), phone: phone.trim(), marketingConsent: consent }),
    });
    const json = await res.json();
    if (!res.ok) {
      setSubmitting(false);
      return setFormErr(json.error || "No se pudo inscribir.");
    }
    router.push(`/m/card/${json.memberId}`);
  }

  if (loading) return <PageLoader />;
  if (loadErr || !program) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="error-box">{loadErr || "Membresía no encontrada."}</div>
      </div>
    );
  }

  const rightLabel = program.tracksVisits ? "VISITAS" : "ESTADO";
  const rightValue = program.tracksVisits ? String(program.defaultVisitLimit ?? "∞") : "Activo";
  const footer = program.defaultDurationDays ? `Vence en ${program.defaultDurationDays} días` : "Sin vencimiento";

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <div className="center" style={{ margin: "8px 0 18px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ height: 48 }} />
      </div>

      <MembershipCardVisual
        programName={program.name}
        cardColor={program.cardColor}
        textColor={program.textColor}
        logoPng={program.logoPng || undefined}
        rightLabel={rightLabel}
        rightValue={rightValue}
        footer={footer}
      />

      <h1 style={{ fontSize: 22, marginTop: 22 }}>Hazte socio de {program.name}</h1>
      {program.description && <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: "6px 0 10px" }}>{program.description}</p>}
      <p className="muted" style={{ marginBottom: 16 }}>Llena tus datos y guarda tu membresía en el wallet de tu celular. No necesitas instalar ninguna app.</p>

      {formErr && <div className="error-box">{formErr}</div>}

      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
        </div>
        <div className="field">
          <label>Correo electrónico</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Teléfono (opcional)</label>
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", margin: "4px 0" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flex: "0 0 auto" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>Acepto recibir novedades de {program.name} por correo o WhatsApp.</span>
        </label>
        <button className="btn btn-primary mt" type="submit" disabled={submitting}>
          {submitting ? "Creando tu membresía…" : "Hacerme socio"}
        </button>
      </form>
    </div>
  );
}
