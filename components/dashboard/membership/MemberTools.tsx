"use client";
import { useState } from "react";
import { ScanLine } from "lucide-react";
import { authedFetch } from "@/lib/clientApi";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { MEMBER_STATUS_LABEL, type MemberStatus } from "@/lib/membership";
import { fmtDay } from "@/components/dashboard/shared";
import { StatusBadge } from "@/components/dashboard/membership/MembershipTab";

/* Counter tools for memberships: verify/log a visit by code, and add a member
   by hand. Split out of app/dashboard/page.tsx. */

export function MemberVerifyBox({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ status: MemberStatus; logged: boolean; memberName: string; visitsRemaining: number | null; visitLimit: number | null; expiresAt: number | null } | null>(null);
  const [err, setErr] = useState("");

  async function go(verifyOnly: boolean, override?: string) {
    const c = (override ?? code).trim();
    if (busy || !c) return;
    setBusy(true);
    setErr("");
    setResult(null);
    const res = await authedFetch("/api/membership/visit", { method: "POST", body: JSON.stringify({ memberCode: c, verifyOnly }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo procesar.");
    setResult(json);
    setCode("");
    if (!verifyOnly && json.logged) onChanged();
  }

  return (
    <div className="card mt">
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Registrar visita / Verificar socio</h3>
      {err && <div className="error-box">{err}</div>}
      <div className="row" style={{ gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
        <input className="input" style={{ flex: "1 1 140px" }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código del socio" inputMode="numeric" />
        <button className="btn btn-primary" style={{ width: "auto" }} disabled={busy} onClick={() => go(false)}>
          Registrar visita
        </button>
        <button className="btn btn-outline" style={{ width: "auto" }} disabled={busy} onClick={() => go(true)}>
          Verificar
        </button>
        <button className="btn btn-outline" style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }} disabled={busy} onClick={() => setScanning(true)}>
          <ScanLine size={16} /> Escanear
        </button>
      </div>

      {result && (
        <div className="mt" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <StatusBadge status={result.status} />
          <strong>{result.memberName}</strong>
          <span className="muted" style={{ fontSize: 14 }}>
            {result.visitLimit != null ? `${result.visitsRemaining} visita(s) restantes` : "Acceso ilimitado"}
            {result.expiresAt != null ? ` · vence ${fmtDay(result.expiresAt)}` : ""}
          </span>
          {result.logged && <span style={{ color: "#166534", fontWeight: 700 }}>✓ Visita registrada</span>}
          {!result.logged && result.status !== "active" && <span style={{ color: "#991b1b", fontWeight: 700 }}>No se registró (membresía {MEMBER_STATUS_LABEL[result.status].toLowerCase()})</span>}
        </div>
      )}

      {scanning && (
        <BarcodeScanner
          onDetected={(v) => {
            setScanning(false);
            go(false, v);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}

export function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [newCode, setNewCode] = useState("");

  async function add() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setErr("");
    const res = await authedFetch("/api/membership/member", { method: "POST", body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo agregar.");
    setNewCode(json.member?.memberCode || "");
    setName("");
    setEmail("");
    setPhone("");
    onAdded();
  }

  if (!open) {
    return (
      <button className="btn mt" style={{ width: "auto", background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }} onClick={() => setOpen(true)}>
        + Agregar socio
      </button>
    );
  }

  return (
    <div className="card mt">
      <div className="row spread" style={{ alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Agregar socio</h3>
        <button className="modal-close" onClick={() => setOpen(false)} aria-label="Cerrar">
          ✕
        </button>
      </div>
      {err && <div className="error-box">{err}</div>}
      {newCode && (
        <div className="success-box">
          Socio agregado. Su código es <strong>{newCode}</strong>.
        </div>
      )}
      <div className="field">
        <label>Nombre</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del socio" />
      </div>
      <div className="field">
        <label>Correo (opcional)</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>Teléfono (opcional)</label>
        <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={busy} onClick={add}>
        {busy ? "Agregando…" : "Agregar socio"}
      </button>
    </div>
  );
}
