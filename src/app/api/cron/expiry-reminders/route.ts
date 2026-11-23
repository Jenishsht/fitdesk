
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/utils";
import { normalizePhone, sendTemplate } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Nepal is UTC +5:45.
const DAY_MS = 24 * 60 * 60 * 1000;
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/**
 * Returns today's Nepal calendar date as UTC midnight.
 * This matches Prisma DateTime fields stored with @db.Date.
 */
function getNepalToday(): Date {
  const nepalNow = new Date(Date.now() + NEPAL_OFFSET_MS);

  return new Date(
    Date.UTC(
      nepalNow.getUTCFullYear(),
      nepalNow.getUTCMonth(),
      nepalNow.getUTCDate()
    )
  );
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  // Protect the cron endpoint.
  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    req.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const days = Number(process.env.REMINDER_DAYS) || 4;

  if (!Number.isInteger(days) || days < 0) {
    return NextResponse.json(
      { error: "REMINDER_DAYS must be a non-negative integer" },
      { status: 500 }
    );
  }

  // Nepal calendar date.
  const today = getNepalToday();

  // Include memberships expiring today through the next 4 days.
  const target = new Date(today.getTime() + days * DAY_MS);

  const todayKey = dateKey(today);

  const memberships = await db.membership.findMany({
    where: {
      endDate: {
        gte: today,
        lte: target,
      },
      cancelledAt: null,
      suspendedAt: null,
      member: {
        status: "ACTIVE",
      },
    },
    include: {
      member: true,
      plan: true,
      gym: true,
    },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const ms of memberships) {
    // Calculate actual remaining days for this membership.
    const daysLeft = Math.round(
      (ms.endDate.getTime() - today.getTime()) / DAY_MS
    );

    // One reminder per membership per Nepal calendar day.
    const dedupeKey =
      `EXPIRY_REMINDER:${ms.id}:${todayKey}`;

    try {
      const existing = await db.notificationLog.findUnique({
        where: {
          gymId_dedupeKey: {
            gymId: ms.gymId,
            dedupeKey,
          },
        },
      });

      // Already queued, sent, delivered or read: do not send again.
      if (existing && existing.status !== "FAILED") {
        skipped++;
        continue;
      }

      let logId: string;

      if (existing) {
        // Retry a previously failed notification.
        logId = existing.id;

        await db.notificationLog.update({
          where: { id: logId },
          data: {
            status: "QUEUED",
            error: null,
          },
        });
      } else {
        const created = await db.notificationLog.create({
          data: {
            gymId: ms.gymId,
            memberId: ms.memberId,
            type: "EXPIRY_REMINDER",
            channel: "WHATSAPP",
            status: "QUEUED",
            dedupeKey,
          },
        });

        logId = created.id;
      }

      const to = normalizePhone(ms.member.phone);

      if (!to) {
        await db.notificationLog.update({
          where: { id: logId },
          data: {
            status: "FAILED",
            error: "Invalid phone number",
          },
        });

        failed++;
        continue;
      }

      // Send approved WhatsApp template.
      const result = await sendTemplate(
        to,
        "membership_expiry_reminder",
        [
          ms.member.fullName,
          ms.plan.name,
          ms.gym.name,
          fmtDate(ms.endDate),
          String(daysLeft),
        ]
      );

      await db.notificationLog.update({
        where: { id: logId },
        data: result.ok
          ? {
              status: "SENT",
              providerMessageId: result.id,
              error: null,
            }
          : {
              status: "FAILED",
              error: result.error,
            },
      });

      if (result.ok) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(
        `Expiry reminder failed for membership ${ms.id}:`,
        error
      );

      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    today: todayKey,
    reminderWindow: `0-${days} days`,
    found: memberships.length,
    sent,
    failed,
    skipped,
  });
}
