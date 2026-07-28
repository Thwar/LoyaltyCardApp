"use client";
import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/clientApi";
import { ConfirmBar } from "@/components/ConfirmBar";
import { MembershipCardVisual } from "@/components/MembershipCardVisual";
import { TiltWrap } from "@/components/TiltWrap";
import { QrCode } from "@/components/QrCode";
import { StatCard, fmtDay, normalizeHex, fileToResizedPng } from "@/components/dashboard/shared";
import { CARD_COLOR_CHOICES } from "@/lib/theme";
import { MembersList, MemberModal } from "@/components/dashboard/membership/MembersList";
import { MemberVerifyBox, AddMemberForm } from "@/components/dashboard/membership/MemberTools";
import { MEMBER_STATUS_LABEL, type MemberStatus } from "@/lib/membership";
import type { Member, MembershipProgram } from "@/lib/types";

/* Membresías tab: the program card, its share QR, the member roster, and the
   create/edit form. Split out of app/dashboard/page.tsx. */

interface MembershipMe {
  eligible: boolean;
  program: MembershipProgram | null;
  members: Member[];
  stats: { total: number; active: number; expired: number; expiringSoon: number; newThisMonth: number; churned30: number; visits30: number; visitsTotal: number } | null;
  visitSeries?: { label: string; count: number }[];
}


export function memberEventLabel(e: import("@/lib/types").MemberEvent): string {
  switch (e.kind) {
    case "created":
      return "Se unió";
    case "renewed":
      return (e.days ? `Renovado +${e.days} días` : "Renovado") + (e.until ? ` · vence ${fmtDay(e.until)}` : "");
    case "reset":
      return "Visitas reiniciadas";
    case "deactivated":
      return "Desactivado";
    default:
      return "Cambio";
  }
}

export function StatusBadge({ status }: { status: MemberStatus }) {
  const c = status === "active" ? { bg: "#dcfce7", fg: "#166534" } : status === "expired" ? { bg: "#fee2e2", fg: "#991b1b" } : { bg: "#fef3c7", fg: "#92400e" };
  return <span style={{ background: c.bg, color: c.fg, fontWeight: 700, fontSize: 12, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{MEMBER_STATUS_LABEL[status]}</span>;
}

function MembershipVisitsChart({ series, total }: { series: { label: string; count: number }[]; total: number }) {
  if (!series.length) return null;
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div className="card mt">
      <div className="row spread" style={{ alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Visitas (últimos 14 días)</h3>
        <span className="muted" style={{ fontSize: 13 }}>
          {total} en total
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 96, marginTop: 14 }}>
        {series.map((s, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }} title={`${s.label}: ${s.count} visita(s)`}>
            <span style={{ fontSize: 9, color: "var(--text-secondary)", marginBottom: 2, minHeight: 11 }}>{s.count || ""}</span>
            <div style={{ width: "100%", height: `${Math.max(3, (s.count / max) * 100)}%`, background: "var(--primary)", opacity: s.count ? 1 : 0.18, borderRadius: "3px 3px 0 0" }} />
          </div>
        ))}
      </div>
      <div className="row spread" style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function MembershipTab({ businessName }: { businessName: string }) {
  const [data, setData] = useState<MembershipMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProgram, setEditingProgram] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await authedFetch("/api/membership/export");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "socios.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const load = useCallback(async () => {
    const res = await authedFetch("/api/membership/me");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="center" style={{ padding: "48px 0" }}>
        <span className="spinner" role="status" aria-label="Cargando" />
      </div>
    );
  if (!data) return <div className="error-box mt">No se pudo cargar.</div>;

  if (!data.eligible) return <MembershipUpsell />;

  if (!data.program || editingProgram) {
    return (
      <div>
        {data.program && (
          <button className="btn btn-sm" onClick={() => setEditingProgram(false)} style={{ width: "auto", marginBottom: 12, background: "rgba(255,255,255,0.14)", color: "#fff" }}>
            ← Volver
          </button>
        )}
        <MembershipForm
          existing={data.program || undefined}
          businessName={businessName}
          onSaved={() => {
            setEditingProgram(false);
            load();
          }}
        />
      </div>
    );
  }

  const { program, members } = data;
  const stats = data.stats!;
  return (
    <div>
      <div className="row spread" style={{ alignItems: "center" }}>
        <h3 className="vip-on-dark" style={{ margin: 0, fontSize: 19, display: "flex", alignItems: "center", gap: 10 }}>
          🎫 {program.name}
          {program.isActive === false && <span style={{ background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 12, padding: "3px 9px", borderRadius: 999 }}>Inactiva</span>}
        </h3>
        <button className="btn btn-sm" style={{ width: "auto", background: "rgba(255,255,255,0.14)", color: "#fff" }} onClick={() => setEditingProgram(true)}>
          Editar
        </button>
      </div>

      <h4 className="vip-on-dark-muted vip-label">Acciones rápidas</h4>
      <MemberVerifyBox onChanged={load} />
      <MembershipShare programId={program.id} />

      <h4 className="vip-on-dark-muted vip-label">Resumen</h4>
      <div className="stat-grid">
        <StatCard label="Socios activos" value={stats.active} />
        <StatCard label="Nuevos (30 días)" value={stats.newThisMonth} />
        <StatCard label="Por vencer (7 días)" value={stats.expiringSoon} />
        <StatCard label="Vencidos" value={stats.expired} />
        <StatCard label="Bajas (30 días)" value={stats.churned30} />
        <StatCard label="Visitas (30 días)" value={stats.visits30} />
      </div>
      <MembershipVisitsChart series={data.visitSeries || []} total={stats.visitsTotal} />

      <div className="row spread" style={{ alignItems: "baseline", gap: 10 }}>
        <h4 className="vip-on-dark-muted vip-label">Directorio de socios</h4>
        {members.length > 0 && (
          <button className="btn btn-sm" style={{ width: "auto", background: "rgba(255,255,255,0.14)", color: "#fff" }} onClick={exportCsv} disabled={exporting}>
            {exporting ? "Exportando…" : "Exportar CSV"}
          </button>
        )}
      </div>
      <AddMemberForm onAdded={load} />
      <MembersList members={members} onSelect={setSelected} />

      {selected && <MemberModal member={selected} program={program} onChanged={load} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MembershipUpsell() {
  const href = `https://wa.me/59175983004?text=${encodeURIComponent("Hola, quiero activar las membresías (tarjetas VIP) en mi plan de SoyCasero.")}`;
  return (
    <div className="card mt">
      <h3 style={{ marginTop: 0, fontSize: 18 }}>🎫 Tarjetas de membresía (VIP)</h3>
      <p className="muted" style={{ lineHeight: 1.5 }}>
        Para gimnasios, clubes y negocios con socios: una tarjeta que identifica a tus miembros, controla su vencimiento y, si quieres, sus visitas. Disponible en el <strong>plan Negocio</strong>.
      </p>
      <a className="btn btn-primary mt" href={href} target="_blank" rel="noreferrer" style={{ width: "auto", display: "inline-block" }}>
        Activar con el plan Negocio
      </a>
    </div>
  );
}

function MembershipShare({ programId }: { programId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${base}/m/${programId}`;
  return (
    <div className="card mt">
      <div className="row spread" style={{ alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Inscribir socios</h3>
        <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setOpen((o) => !o)}>
          {open ? "Ocultar" : "Ver QR"}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: open ? 12 : 0 }}>
        Comparte este QR o enlace para que tus socios se inscriban y guarden la tarjeta en su wallet.
      </p>
      {open && (
        <div className="center" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <QrCode value={url} size={200} />
          <button
            className="btn btn-outline"
            style={{ width: "auto" }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
          >
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </div>
      )}
    </div>
  );
}

function MembershipForm({ existing, businessName, onSaved }: { existing?: MembershipProgram; businessName: string; onSaved: () => void }) {
  const [name, setName] = useState(existing?.name ?? `Membresía ${businessName}`);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(existing?.welcomeMessage ?? `¡Bienvenido al club de ${businessName}! 🎉`);
  const [cardColor, setCardColor] = useState(existing?.cardColor ?? "#1f2937");
  const [textColor, setTextColor] = useState(existing?.textColor ?? "#FFFFFF");
  const [tracksVisits, setTracksVisits] = useState(existing?.tracksVisits ?? false);
  const [visitLimit, setVisitLimit] = useState(String(existing?.defaultVisitLimit ?? 10));
  const [durationDays, setDurationDays] = useState(String(existing?.defaultDurationDays ?? 30));
  const [logo, setLogo] = useState<string | null>(existing?.logoPng ? `data:image/png;base64,${existing.logoPng}` : null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  async function save() {
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/membership/program", {
      method: "POST",
      body: JSON.stringify({
        programId: existing?.id,
        name: name.trim(),
        description: description.trim(),
        welcomeMessage: welcomeMessage.trim(),
        cardColor,
        textColor,
        tracksVisits,
        defaultVisitLimit: tracksVisits ? Number(visitLimit) : null,
        defaultDurationDays: Number(durationDays) || 0,
        logo,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setErr(json.error || "No se pudo guardar.");
    onSaved();
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await fileToResizedPng(file));
    } catch {
      setErr("No se pudo procesar la imagen.");
    }
  }

  async function setActive(isActive: boolean) {
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/membership/program", { method: "PATCH", body: JSON.stringify({ programId: existing?.id, isActive }) });
    setSaving(false);
    if (!res.ok) return setErr((await res.json()).error || "No se pudo actualizar.");
    onSaved();
  }
  async function del() {
    setErr("");
    setSaving(true);
    setConfirmDel(false);
    try {
      const res = await authedFetch("/api/membership/program", { method: "DELETE", body: JSON.stringify({ programId: existing?.id }) });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) return setErr(json.error || `No se pudo eliminar (${res.status}).`);
      onSaved();
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const days = Number(durationDays) || 0;
  return (
    <div>
      <h1 className="vip-on-dark" style={{ fontSize: 24, marginTop: 0 }}>
        {existing ? "Editar tu membresía" : "Crea tu tarjeta de membresía"}
      </h1>
      <p className="vip-on-dark-muted" style={{ marginBottom: 16 }}>
        Para gimnasios, clubes y negocios con socios.
      </p>
      {err && <div className="error-box">{err}</div>}

      {/* Live preview (3D tilt, like the loyalty card) */}
      <div style={{ marginBottom: 16 }}>
        <TiltWrap radius={16}>
          <MembershipCardVisual
            programName={name || "Tu membresía"}
            cardColor={cardColor}
            textColor={textColor}
            rightLabel={tracksVisits ? "VISITAS" : "ESTADO"}
            rightValue={tracksVisits ? String(visitLimit || 0) : "Activo"}
            footer={days > 0 ? `Vence en ${days} días` : "Sin vencimiento"}
          />
        </TiltWrap>
      </div>

      <div className="card">
        <div className="field">
          <label>Nombre de la membresía</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Socio Gimnasio Fit" />
        </div>
        <div className="field">
          <label>Beneficios / descripción (opcional)</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} placeholder="Acceso ilimitado, 1 invitado, descuentos…" />
        </div>

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <input type="checkbox" checked={tracksVisits} onChange={(e) => setTracksVisits(e.target.checked)} style={{ width: 18, height: 18 }} />
            <span>Controlar visitas (descuenta una por cada registro)</span>
          </label>
          {tracksVisits && <input className="input mt" type="number" min={1} value={visitLimit} onChange={(e) => setVisitLimit(e.target.value)} placeholder="Visitas incluidas (ej: 10)" />}
          {!tracksVisits && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Acceso ilimitado: la tarjeta solo verifica si el socio está activo.
            </p>
          )}
        </div>

        <div className="field">
          <label>Duración (días)</label>
          <input className="input" type="number" min={0} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="30" />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Cada socio vence después de estos días. Usa 0 para sin vencimiento.
          </p>
        </div>

        <div className="field">
          <label>Mensaje de bienvenida</label>
          <textarea className="input" rows={2} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} maxLength={240} />
        </div>

        <div className="field">
          <label>Color de la tarjeta</label>
          <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {CARD_COLOR_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCardColor(c)}
                aria-label={c}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: c,
                  border: cardColor.toLowerCase() === c.toLowerCase() ? "3px solid #2c3e50" : "3px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
            <input
              type="color"
              value={normalizeHex(cardColor, "#1f2937")}
              onChange={(e) => setCardColor(e.target.value)}
              aria-label="Color"
              style={{ width: 42, height: 36, padding: 0, border: "none", background: "none", cursor: "pointer" }}
            />
            <input className="input" style={{ maxWidth: 110 }} value={cardColor} onChange={(e) => setCardColor(e.target.value)} placeholder="#1f2937" />
          </div>
        </div>

        <div className="field">
          <label>Color del texto</label>
          <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {["#FFFFFF", "#000000"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setTextColor(c)}
                aria-label={c}
                style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: textColor.toLowerCase() === c.toLowerCase() ? "3px solid #2c3e50" : "1px solid #ccc", cursor: "pointer" }}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Logo (opcional)</label>
          {logo && (
            <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="logo" style={{ maxHeight: 44, maxWidth: 160, objectFit: "contain", background: "#f0f0f0", borderRadius: 8, padding: 4 }} />
              <button type="button" className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setLogo(null)}>
                Quitar
              </button>
            </div>
          )}
          <input type="file" accept="image/*" onChange={onPickLogo} />
        </div>

        <button className="btn btn-primary mt" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : existing ? "Guardar cambios" : "Crear membresía"}
        </button>

        {existing && (
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 18, paddingTop: 16 }}>
            {confirmDel ? (
              <ConfirmBar
                message="¿Eliminar esta membresía? Las tarjetas de tus socios dejarán de funcionar. Esta acción no se puede deshacer."
                confirmLabel="Sí, eliminar"
                onConfirm={del}
                onCancel={() => setConfirmDel(false)}
                busy={saving}
              />
            ) : (
              <>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-outline" style={{ width: "auto" }} disabled={saving} onClick={() => setActive(existing.isActive === false)}>
                    {existing.isActive === false ? "Reactivar membresía" : "Desactivar membresía"}
                  </button>
                  <button className="btn btn-ghost" style={{ width: "auto", color: "#c62828" }} disabled={saving} onClick={() => setConfirmDel(true)}>
                    Eliminar membresía
                  </button>
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                  Desactivar pausa la membresía (las tarjetas quedan inactivas). Eliminar la quita por completo.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
