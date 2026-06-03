import type { Business } from "./types";

// Subscription plans. Limits gate features in the dashboard. There's no billing
// yet, so a business's tier is set manually (businesses/{id}.plan); absent = free.
// Paid-tier limits are placeholders — only the free limits matter today.
export type PlanId = "gratis" | "cafe" | "negocio";

export interface PlanInfo {
  id: PlanId;
  label: string; // badge text
  maxClients: number | null; // enrolled customer cards allowed; null = unlimited (paid plans)
  maxCards: number; // loyalty programs (stamp cards) allowed
  paid: boolean;
  broadcastsPerDay: number; // marketing notifications allowed per day (0 = not allowed)
  broadcastGapHours: number; // minimum hours between broadcasts
  removeBranding: boolean; // white-label: drop "Desarrollado por SoyCasero" from passes
  segments: boolean; // targeted broadcasts by customer segment (else: broadcast to all only)
  maxCashiers: number; // cajero (stamp-only) logins allowed
}

export const PLANS: Record<PlanId, PlanInfo> = {
  gratis: { id: "gratis", label: "Gratis", maxClients: 50, maxCards: 1, paid: false, broadcastsPerDay: 0, broadcastGapHours: 0, removeBranding: false, segments: false, maxCashiers: 0 },
  cafe: { id: "cafe", label: "Café", maxClients: null, maxCards: 1, paid: true, broadcastsPerDay: 3, broadcastGapHours: 0, removeBranding: false, segments: false, maxCashiers: 0 },
  negocio: { id: "negocio", label: "Negocio", maxClients: null, maxCards: 3, paid: true, broadcastsPerDay: 6, broadcastGapHours: 0, removeBranding: true, segments: true, maxCashiers: 5 },
};

export function getPlan(plan?: Business["plan"]): PlanInfo {
  return (plan && PLANS[plan]) || PLANS.gratis;
}

// The plan actually in effect right now: a paid plan past its expiry reverts to
// free. Use this (not raw business.plan) wherever a paid feature is gated.
export function effectivePlan(business: { plan?: Business["plan"]; planExpiresAt?: number | null }): PlanInfo {
  const base = getPlan(business.plan);
  if (base.paid && business.planExpiresAt && business.planExpiresAt < Date.now()) {
    return PLANS.gratis;
  }
  return base;
}
