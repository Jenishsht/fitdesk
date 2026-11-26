import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { todayNepal, daysUntil } from "@/lib/dates";

export const dynamic = "force-dynamic";

const THRESHOLDS = [1, 3, 7];

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Kathmandu",
    }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = todayNepal();
  const in7 = new Date(today.getTime() + 7 * 86400000);

  const memberships = await prisma.membership.findMany({
    where: {
      endDate: { gte: today, lte: in7 },
      cancelledAt: null,
      suspendedAt: null,
      renewals: { none: {} },
      member: { email: { not: null }, status: "ACTIVE" },
      gym: { status: "ACTIVE" },
    },
    include: { member: true, gym: true, plan: true },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const m of memberships) {
    const daysLeft = daysUntil(m.endDate, today);

    // smallest threshold that still covers daysLeft
    const threshold = THRESHOLDS.find((t) => t >= daysLeft);
    if (!threshold) {
      skipped++;
      continue;
    }

    // skip reminders longer than the plan itself (no "7 days left" on a 3-day plan)
    if (threshold >= m.plan.durationDays) {
      skipped++;
      continue;
    }

    const dedupeKey = `EXPIRY_${threshold}D:${m.id}`;

    // claim the slot first; unique [gymId, dedupeKey] blocks duplicates
    try {
      await prisma.notificationLog.create({
        data: {
          gymId: m.gymId,
          memberId: m.memberId,
          type: "EXPIRY_REMINDER",
          channel: "EMAIL",
          dedupeKey,
        },
      });
    } catch {
      skipped++;
      continue; // already sent
    }

    const when =
      daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;

    const endDateText = m.endDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    const contactLine = m.gym.phone
      ? `You can renew by visiting the gym or calling us at ${m.gym.phone}.`
      : `You can renew by visiting the gym.`;

    try {
      await sendEmail({
        to: m.member.email!,
        toName: m.member.fullName,
        fromName: m.gym.name,
        subject: `Your ${m.plan.name} membership expires ${when}`,
        text:
          `${greeting()} ${m.member.fullName},\n\n` +
          `This is a kind reminder that your ${m.plan.name} membership at ${m.gym.name} ` +
          `will expire ${when} (${endDateText}).\n\n` +
          `To continue enjoying uninterrupted access to our facilities and keep up your ` +
          `fitness progress, please renew your membership on time.\n\n` +
          `${contactLine}\n\n` +
          `Thank you for being a valued member of ${m.gym.name}.\n\n` +
          `Warm regards,\n` +
          `${m.gym.name} Team`,
      });

      await prisma.notificationLog.update({
        where: { gymId_dedupeKey: { gymId: m.gymId, dedupeKey } },
        data: { status: "SENT" },
      });
      sent++;
    } catch (e) {
      const msg = String(e).slice(0, 500);
      await prisma.notificationLog.update({
        where: { gymId_dedupeKey: { gymId: m.gymId, dedupeKey } },
        data: { status: "FAILED", error: msg },
      });
      errors.push(msg);
      failed++;
    }
  }

  return Response.json({ checked: memberships.length, sent, skipped, failed, errors });
}