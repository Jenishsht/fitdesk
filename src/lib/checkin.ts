import { randomBytes } from "crypto";
import { headers } from "next/headers";

/** URL-safe random code, 12 characters. */
export const newCheckinCode = () => randomBytes(9).toString("base64url");

export const checkinUrl = (code: string) =>
  `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/checkin/${code}`;

/** Last 10 digits of any phone format (98XXXXXXXX, +97798XXXXXXXX, 097798...). */
export const last10Digits = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
};

/**
 * Simple in-memory rate limiter.
 * Fine for one server. On serverless or multiple instances, replace with Upstash/Redis.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}