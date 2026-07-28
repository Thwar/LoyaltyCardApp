"use client";
import { useState } from "react";
import { CardForm } from "@/components/dashboard/CardForm";
import { ResumenTab } from "@/components/dashboard/ResumenTab";
import { TarjetasTab } from "@/components/dashboard/TarjetasTab";
import { ComunicacionTab } from "@/components/dashboard/ComunicacionTab";
import { MembershipTab } from "@/components/dashboard/membership/MembershipTab";
import { ClientModal, type Client } from "@/components/dashboard/ClientModal";
import { effectivePlan } from "@/lib/plans";
import type { Business, CustomerCard, LoyaltyCard } from "@/lib/types";

/* The owner/cajero console: tab routing across Resumen, Tarjetas, Comunicación
   and Membresías. Split out of app/dashboard/page.tsx. */

/* ---------- Manage a business's card(s): tabbed Resumen / Tarjetas ---------- */
export function CardManager({
  business,
  cards,
  customers,
  count,
  onChanged,
  cajero = false,
  staffName,
}: {
  business: Business;
  cards: LoyaltyCard[];
  customers: CustomerCard[];
  count: number;
  onChanged: () => void;
  cajero?: boolean;
  staffName?: string;
}) {
  const [selected, setSelected] = useState<Client | null>(null);
  const [tab, setTab] = useState<"resumen" | "tarjetas" | "comunicacion" | "membresias">("resumen");
  // No cards yet → open straight into the create form (owners only).
  const [editing, setEditing] = useState<LoyaltyCard | "new" | null>(cards.length === 0 && !cajero ? "new" : null);
  const planInfo = effectivePlan(business);
  const cardsById = new Map(cards.map((c) => [c.id, c]));

  // Cajero: read-only stamp + stats, no tabs / editing / contact / comunicación.
  if (cajero) {
    return (
      <div>
        <h1 style={{ fontSize: 24, margin: 0 }}>{business.name}</h1>
        <p className="muted" style={{ marginTop: 4, marginBottom: 18 }}>
          Hola{staffName ? `, ${staffName}` : ""} 👋 — suma sellos y revisa tus caseros.
        </p>
        <ResumenTab cards={cards} customers={customers} count={count} planInfo={planInfo} onChanged={onChanged} onSelect={setSelected} cajero />
        {selected && <ClientModal client={selected} cardsById={cardsById} plan={planInfo.id} onChanged={onChanged} onClose={() => setSelected(null)} cajero />}
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        {cards.length > 0 && (
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)} style={{ marginBottom: 14 }}>
            ← Volver
          </button>
        )}
        <CardForm
          existing={editing === "new" ? undefined : editing}
          businessName={business.name}
          planInfo={planInfo}
          onSaved={() => {
            setEditing(null);
            setTab("tarjetas"); // after creating/editing a card, land on the Tarjetas panel
            onChanged();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {business.name}
        <span className={`plan-badge plan-${planInfo.id}`}>{planInfo.label}</span>
      </h1>

      <div className="tabs mt">
        <button className={`tab${tab === "resumen" ? " active" : ""}`} onClick={() => setTab("resumen")}>
          Resumen
        </button>
        <button className={`tab${tab === "tarjetas" ? " active" : ""}`} onClick={() => setTab("tarjetas")}>
          Tarjetas
        </button>
        <button className={`tab${tab === "comunicacion" ? " active" : ""}`} onClick={() => setTab("comunicacion")}>
          Comunicación
        </button>
        <button className={`tab${tab === "membresias" ? " active" : ""}`} onClick={() => setTab("membresias")}>
          Membresías
        </button>
      </div>

      {tab === "resumen" ? (
        <ResumenTab cards={cards} customers={customers} count={count} planInfo={planInfo} onChanged={onChanged} onSelect={setSelected} onShowQr={() => setTab("tarjetas")} />
      ) : tab === "tarjetas" ? (
        <TarjetasTab cards={cards} planInfo={planInfo} businessLogo={business.logoPng} onEdit={(c) => setEditing(c)} onNew={() => setEditing("new")} onChanged={onChanged} />
      ) : tab === "comunicacion" ? (
        <ComunicacionTab business={business} planInfo={planInfo} customers={customers} cards={cards} onChanged={onChanged} />
      ) : (
        <div className="vip-section">
          <MembershipTab businessName={business.name} />
        </div>
      )}

      {selected && <ClientModal client={selected} cardsById={cardsById} plan={planInfo.id} onChanged={onChanged} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ========================= Memberships (VIP / club cards) ========================= */
