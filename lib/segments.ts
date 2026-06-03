import type { CustomerCard } from "./types";

// Customer segments for targeted broadcasts. Pure (no server-only) so the
// composer can count recipients client-side and the endpoint can filter server-side.

export type Segment = "all" | "inactive" | "almost" | "new" | "best";

export const SEGMENTS: { id: Segment; label: string }[] = [
  { id: "all", label: "Todos los clientes" },
  { id: "inactive", label: "Inactivos (+30 días)" },
  { id: "almost", label: "A 1–2 sellos del premio" },
  { id: "new", label: "Nuevos (últimos 30 días)" },
  { id: "best", label: "Ya canjearon un premio" },
];

const DAY = 24 * 60 * 60 * 1000;

type SegmentFields = Pick<CustomerCard, "currentStamps" | "createdAt" | "lastStampDate" | "rewardsRedeemed">;

// Whether a customer card belongs to `segment`. `slots` = its loyalty card's totalSlots.
export function inSegment(c: SegmentFields, segment: Segment, slots: number, now: number): boolean {
  switch (segment) {
    case "inactive":
      return (c.lastStampDate || c.createdAt || 0) < now - 30 * DAY;
    case "almost":
      return slots > 0 && (c.currentStamps || 0) >= slots - 2 && (c.currentStamps || 0) < slots;
    case "new":
      return (c.createdAt || 0) >= now - 30 * DAY;
    case "best":
      return (c.rewardsRedeemed || 0) >= 1;
    case "all":
    default:
      return true;
  }
}
