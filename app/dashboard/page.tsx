"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";
import { BusinessSetupForm } from "@/components/dashboard/CardForm";
import { CardManager } from "@/components/dashboard/CardManager";
import type { Business, CustomerCard, LoyaltyCard } from "@/lib/types";

interface MeResponse {
  role?: "owner" | "cajero";
  business: Business | null;
  cards?: LoyaltyCard[];
  customers?: CustomerCard[];
  count?: number;
  walletConfigured?: boolean;
  staffName?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await authedFetch("/api/business/me");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "No se pudo cargar.");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(getClientAuth(), (u) => {
      setAuthReady(true);
      if (!u) {
        router.replace("/login");
      } else {
        load();
      }
    });
    return () => unsub();
  }, [router, load]);

  useEffect(() => {
    if (typeof window !== "undefined") setImpersonating(localStorage.getItem("impersonating"));
  }, []);

  async function exitImpersonation() {
    await signOut(getClientAuth());
    localStorage.removeItem("impersonating");
    router.replace("/login");
  }

  if (!authReady || loading) {
    return <PageLoader />;
  }

  return (
    <div className="container container-wide">
      {impersonating && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffe69c",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "#664d03" }}>
            👁 Estás viendo como <strong>{impersonating}</strong>. Los cambios afectan su cuenta real.
          </span>
          <button className="btn btn-sm" style={{ width: "auto", background: "#664d03", color: "#fff" }} onClick={exitImpersonation}>
            Salir de la vista
          </button>
        </div>
      )}
      <div className="row spread" style={{ marginBottom: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" />
        <div className="row" style={{ width: "auto", gap: 8 }}>
          <Link href="/account" className="btn btn-sm btn-ghost" style={{ width: "auto" }}>
            Cuenta
          </Link>
          <button
            className="btn btn-sm btn-ghost"
            style={{ width: "auto" }}
            onClick={async () => {
              await signOut(getClientAuth());
              localStorage.removeItem("impersonating");
              router.replace("/login");
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {data?.walletConfigured === false && (
        <div className="warn-box">
          Google Wallet aún no está configurado. Las tarjetas se crean igual, pero el pase no se genera todavía. Revisa <strong>SETUP.md</strong> para activarlo.
        </div>
      )}

      {!data?.business ? (
        <BusinessSetupForm onSaved={load} />
      ) : (
        <CardManager
          business={data.business}
          cards={data.cards || []}
          customers={data.customers || []}
          count={data.count || 0}
          onChanged={load}
          cajero={data.role === "cajero"}
          staffName={data.staffName}
        />
      )}

      <SiteFooter />
    </div>
  );
}

