import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { todayNepal, daysUntil } from "@/lib/dates";
import { buildReportPdf, type Stat, type TableDef } from "@/lib/weeklyReportpdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const DAY = 86400000;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  QR: "QR",
  KHALTI: "Khalti",
  ESEWA: "eSewa",
  OTHER: "Other",
};

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = todayNepal();
  const weekStart = new Date(today.getTime() - 7 * DAY);
  const in7 = new Date(today.getTime() + 7 * DAY);
  const since = new Date(Date.now() - 7 * DAY);
  const periodText = `${fmtDate(weekStart)} to ${fmtDate(new Date(today.getTime() - DAY))}`;
  const dedupeKey = `WEEKLY_REPORT:${today.toISOString().slice(0, 10)}`;

  const gyms = await prisma.gym.findMany({
    where: { status: "ACTIVE" },
    include: {
      users: {
        where: { role: "GYM_OWNER", isActive: true },
        include: { user: true },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const gym of gyms) {
    const recipients = gym.users
      .filter((u) => u.user.isActive && u.user.email)
      .map((u) => ({ email: u.user.email, name: u.user.name }));

    if (recipients.length === 0 && gym.email) {
      recipients.push({ email: gym.email, name: gym.name });
    }
    if (recipients.length === 0) {
      skipped++;
      errors.push(`${gym.name}: no owner email`);
      continue;
    }

    try {
      await prisma.notificationLog.create({
        data: { gymId: gym.id, type: "WEEKLY_REPORT", channel: "EMAIL", dedupeKey },
      });
    } catch (e) {
      skipped++;
      errors.push(`${gym.name}: ${String(e).slice(0, 200)}`);
      continue;
    }

    try {
      const cur = gym.currencySymbol;
      const money = (n: number) =>
        `${cur} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

      const [payments, newMembers, renewals, checkIns, activeMembers, expired, upcoming] =
        await Promise.all([
          prisma.payment.findMany({
            where: { gymId: gym.id, paidAt: { gte: since }, status: { in: ["PAID", "PARTIAL"] } },
            select: { amount: true, method: true },
          }),
          prisma.member.findMany({
            where: { gymId: gym.id, createdAt: { gte: since } },
            include: {
              memberships: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.membership.findMany({
            where: { gymId: gym.id, renewedFromId: { not: null }, createdAt: { gte: since } },
            include: { member: true, plan: true },
            orderBy: { createdAt: "desc" },
          }),
          prisma.attendance.count({ where: { gymId: gym.id, checkedInAt: { gte: since } } }),
          prisma.member.count({ where: { gymId: gym.id, status: "ACTIVE" } }),
          prisma.membership.findMany({
            where: { gymId: gym.id, endDate: { gte: weekStart, lt: today }, cancelledAt: null },
            include: { member: true, plan: true, renewals: { select: { id: true } } },
            orderBy: { endDate: "asc" },
          }),
          prisma.membership.findMany({
            where: {
              gymId: gym.id,
              endDate: { gte: today, lte: in7 },
              cancelledAt: null,
              suspendedAt: null,
              renewals: { none: {} },
            },
            include: { member: true, plan: true },
            orderBy: { endDate: "asc" },
          }),
        ]);

      const total = payments.reduce((s, p) => s + Number(p.amount), 0);
      const byMethod = new Map<string, { count: number; amount: number }>();
      for (const p of payments) {
        const cur0 = byMethod.get(p.method) ?? { count: 0, amount: 0 };
        byMethod.set(p.method, { count: cur0.count + 1, amount: cur0.amount + Number(p.amount) });
      }

      const notRenewed = expired.filter((m) => m.renewals.length === 0);

      const stats: Stat[] = [
        { label: "Total collected", value: money(total), sub: `${payments.length} payments`, tone: "green" },
        { label: "New members", value: String(newMembers.length), sub: "joined this week", tone: "blue" },
        { label: "Renewals", value: String(renewals.length), sub: "this week", tone: "green" },
        { label: "Active members", value: String(activeMembers), sub: "right now", tone: "blue" },
        { label: "Expired", value: String(expired.length), sub: "this week", tone: "amber" },
        { label: "Not renewed", value: String(notRenewed.length), sub: "need follow-up", tone: "red" },
        { label: "Expiring soon", value: String(upcoming.length), sub: "next 7 days", tone: "amber" },
        { label: "Check-ins", value: String(checkIns), sub: "this week", tone: "blue" },
      ];

      const tables: TableDef[] = [
        {
          title: "New Members This Week",
          columns: [
            { header: "Member", width: 0.3 },
            { header: "Phone", width: 0.2 },
            { header: "Plan", width: 0.28 },
            { header: "Joined", width: 0.22 },
          ],
          rows: newMembers.map((m) => [
            m.fullName,
            m.phone,
            m.memberships[0]?.plan.name ?? "-",
            fmtDate(m.createdAt),
          ]),
          emptyText: "No new members this week.",
        },
        {
          title: "Collections by Payment Method",
          columns: [
            { header: "Method", width: 0.34 },
            { header: "Payments", width: 0.2, align: "right" },
            { header: "Amount", width: 0.28, align: "right" },
            { header: "Share", width: 0.18, align: "right" },
          ],
          rows: [...byMethod.entries()].map(([k, v]) => [
            METHOD_LABEL[k] ?? k,
            String(v.count),
            money(v.amount),
            total > 0 ? `${Math.round((v.amount / total) * 100)}%` : "-",
          ]),
          emptyText: "No payments received this week.",
        },
        {
          title: "Renewals This Week",
          columns: [
            { header: "Member", width: 0.3 },
            { header: "Plan", width: 0.28 },
            { header: "New end date", width: 0.22 },
            { header: "Amount", width: 0.2, align: "right" },
          ],
          rows: renewals.map((m) => [
            m.member.fullName,
            m.plan.name,
            fmtDate(m.endDate),
            money(Number(m.finalPrice)),
          ]),
          emptyText: "No renewals this week.",
        },
        {
          title: "Expired and Not Renewed",
          columns: [
            { header: "Member", width: 0.28 },
            { header: "Phone", width: 0.19 },
            { header: "Plan", width: 0.23 },
            { header: "Ended", width: 0.18 },
            { header: "Days ago", width: 0.12, align: "right" },
          ],
          rows: notRenewed.map((m) => [
            m.member.fullName,
            m.member.phone,
            m.plan.name,
            fmtDate(m.endDate),
            String(Math.max(0, -daysUntil(m.endDate, today))),
          ]),
          emptyText: "Everyone who expired this week has renewed.",
        },
        {
          title: "Expiring in the Next 7 Days",
          columns: [
            { header: "Member", width: 0.28 },
            { header: "Phone", width: 0.19 },
            { header: "Plan", width: 0.23 },
            { header: "Ends", width: 0.18 },
            { header: "Days left", width: 0.12, align: "right" },
          ],
          rows: upcoming.map((m) => [
            m.member.fullName,
            m.member.phone,
            m.plan.name,
            fmtDate(m.endDate),
            String(daysUntil(m.endDate, today)),
          ]),
          emptyText: "No memberships expiring in the next 7 days.",
        },
      ];

      const pdfBytes = await buildReportPdf({
        gymName: gym.name,
        title: "Weekly Performance Report",
        period: periodText,
        generatedOn: fmtDate(new Date()),
        stats,
        tables,
      });
      const contentBase64 = Buffer.from(pdfBytes).toString("base64");

      for (const r of recipients) {
        await sendEmail({
          to: r.email,
          toName: r.name,
          fromName: gym.name,
          subject: `${gym.name} weekly report (${periodText})`,
          text:
            `Hello ${r.name},\n\n` +
            `Please find attached your weekly performance report for ${periodText}.\n\n` +
            `Highlights\n` +
            `- Total collected: ${money(total)}\n` +
            `- New members: ${newMembers.length}\n` +
            `- Renewals: ${renewals.length}\n` +
            `- Expired and not renewed: ${notRenewed.length}\n` +
            `- Expiring in the next 7 days: ${upcoming.length}\n\n` +
            `The full report with member details is attached as a PDF.\n\n` +
            `Warm regards,\n${gym.name} Team`,
          attachments: [{ name: `weekly-report-${dedupeKey.slice(14)}.pdf`, contentBase64 }],
        });
      }

      await prisma.notificationLog.update({
        where: { gymId_dedupeKey: { gymId: gym.id, dedupeKey } },
        data: { status: "SENT" },
      });
      sent++;
    } catch (e) {
      const msg = String(e).slice(0, 500);
      await prisma.notificationLog.update({
        where: { gymId_dedupeKey: { gymId: gym.id, dedupeKey } },
        data: { status: "FAILED", error: msg },
      });
      errors.push(msg);
      failed++;
    }
  }

  return Response.json({ gyms: gyms.length, sent, skipped, failed, errors });
}