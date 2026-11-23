import { todayNepal } from "./utils";

export type MembershipState = "ACTIVE" | "EXPIRED" | "CANCELLED" | "FROZEN" | "UPCOMING";

/** Membership validity is derived from dates, never from an editable status field. */
export function membershipState(
  m: { startDate: Date; endDate: Date; cancelledAt: Date | null; suspendedAt: Date | null },
  today = todayNepal(),
): MembershipState {
  if (m.cancelledAt) return "CANCELLED";
  if (m.suspendedAt) return "FROZEN";
  if (m.endDate < today) return "EXPIRED";
  if (m.startDate > today) return "UPCOMING";
  return "ACTIVE";
}

export const daysLeft = (end: Date, today = todayNepal()) =>
  Math.round((end.getTime() - today.getTime()) / 86_400_000);

export const activeWhere = (today = todayNepal()) => ({
  startDate: { lte: today },
  endDate: { gte: today },
  cancelledAt: null,
  suspendedAt: null,
});