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
}

export const PLANS: Record<PlanId, PlanInfo> = {
  gratis: { id: "gratis", label: "Gratis", maxClients: 50, maxCards: 1, paid: false },
  cafe: { id: "cafe", label: "Café", maxClients: null, maxCards: 3, paid: true },
  negocio: { id: "negocio", label: "Negocio", maxClients: null, maxCards: 10, paid: true },
};

export function getPlan(plan?: Business["plan"]): PlanInfo {
  return (plan && PLANS[plan]) || PLANS.gratis;
}
