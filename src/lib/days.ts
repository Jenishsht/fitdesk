import { todayNepal } from "./utils";

/** Whole days between two dates (never negative). */
export const daysBetween = (from: Date, to: Date = todayNepal()) =>
  Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));