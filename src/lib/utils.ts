
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Prisma } from "@/generated/prisma/client";

/* --------------------------------
   Tailwind class merging
--------------------------------- */

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* --------------------------------
   Numeric and Prisma Decimal helpers
--------------------------------- */

type NumericValue =
  | number
  | string
  | Prisma.Decimal
  | null
  | undefined;

export function num(value: NumericValue): number {
  if (value == null) return 0;

  const result = Number(value);

  return Number.isFinite(result) ? result : 0;
}

/* --------------------------------
   Currency formatting (Nepal NPR)
--------------------------------- */

export function money(value: NumericValue): string {
  return `Rs. ${num(value).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* --------------------------------
   Member initials
--------------------------------- */

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/* --------------------------------
   Nepal current date
--------------------------------- */

export function todayNepal(): Date {
  const now = new Date();

  const nepalDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return new Date(`${nepalDate}T00:00:00+05:45`);
}

/* --------------------------------
   Date formatting
--------------------------------- */

export function fmtDate(
  value: Date | string | null | undefined
): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(date);
}

/* --------------------------------
   Add days using UTC calendar dates
--------------------------------- */

export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}
