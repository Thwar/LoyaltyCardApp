import type { Member } from "./types";

// A member's current standing. Mirrors how loyalty passes grey/void:
// past the expiry date, or out of allotted visits → no longer active.
export type MemberStatus = "active" | "expired" | "no_visits";

type StatusFields = Pick<Member, "expiresAt" | "visitLimit" | "visitsUsed">;

export function memberStatus(m: StatusFields, now: number = Date.now()): MemberStatus {
  if (m.expiresAt != null && m.expiresAt < now) return "expired";
  if (m.visitLimit != null && (m.visitsUsed || 0) >= m.visitLimit) return "no_visits";
  return "active";
}

export function isMemberActive(m: StatusFields, now?: number): boolean {
  return memberStatus(m, now) === "active";
}

// Visits left, or null when the membership is unlimited.
export function visitsRemaining(m: StatusFields): number | null {
  if (m.visitLimit == null) return null;
  return Math.max(0, m.visitLimit - (m.visitsUsed || 0));
}

// Spanish label for the dashboard / pass.
export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Activo",
  expired: "Vencido",
  no_visits: "Sin visitas",
};
