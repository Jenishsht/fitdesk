import Link from "next/link";
import { startOfMonth, subMonths, format, endOfMonth } from "date-fns";
import { AlertTriangle, CalendarCheck, CreditCard, UserCheck, UserPlus, Users, UserX, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, Empty } from "@/components/page-header";
import { GrowthChart, RevenueChart } from "@/components/charts";
import { requireGym } from "@/lib/session";
import { db } from "@/lib/db";
import { activeWhere, daysLeft } from "@/lib/membership";
import { addDaysUTC, fmtDate, money, num, todayNepal } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { gymId, gym, user } = await requireGym();
  const today = todayNepal();
  const monthStart = startOfMonth(new Date());
  const soon = addDaysUTC(today, 7);
  const sixAgo = startOfMonth(subMonths(new Date(), 5));

  const [total, active, everMembered, expiringSoon, revenueMonth, todayAtt, newThisMonth, finalSum, paidSum,
    paymentsRecent, membersRecent, expiringList, payments6, members6] = await Promise.all([
    db.member.count({ where: { gymId } }),
    db.member.count({ where: { gymId, status: "ACTIVE", memberships: { some: activeWhere(today) } } }),
    db.member.count({ where: { gymId, status: "ACTIVE", memberships: { some: {} } } }),
    db.member.count({ where: { gymId, status: "ACTIVE", memberships: { some: { ...activeWhere(today), endDate: { gte: today, lte: soon } } } } }),
    db.payment.aggregate({ where: { gymId, status: { in: ["PAID", "PARTIAL"] }, paidAt: { gte: monthStart, lte: endOfMonth(new Date()) } }, _sum: { amount: true } }),
    db.attendance.count({ where: { gymId, date: today } }),
    db.member.count({ where: { gymId, createdAt: { gte: monthStart } } }),
    db.membership.aggregate({ where: { gymId, cancelledAt: null }, _sum: { finalPrice: true } }),
    db.payment.aggregate({ where: { gymId, status: { in: ["PAID", "PARTIAL"] } }, _sum: { amount: true } }),
    db.payment.findMany({ where: { gymId }, orderBy: { paidAt: "desc" }, take: 5, include: { member: true } }),
    db.member.findMany({ where: { gymId }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.membership.findMany({
      where: { gymId, member: { status: "ACTIVE" }, ...activeWhere(today), endDate: { gte: today, lte: soon } },
      orderBy: { endDate: "asc" }, take: 6, include: { member: true, plan: true },
    }),
    db.payment.findMany({ where: { gymId, status: { in: ["PAID", "PARTIAL"] }, paidAt: { gte: sixAgo } }, select: { amount: true, paidAt: true } }),
    db.member.findMany({ where: { gymId }, select: { createdAt: true } }),
  ]);

  const expired = Math.max(everMembered - active, 0);
  const outstanding = Math.max(num(finalSum._sum.finalPrice) - num(paidSum._sum.amount), 0);

  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
  const revenueData = months.map((m) => ({
    label: format(m, "MMM"),
    revenue: payments6.filter((p) => format(p.paidAt, "yyyy-MM") === format(m, "yyyy-MM")).reduce((s, p) => s + num(p.amount), 0),
  }));
  const growthData = months.map((m) => ({
    label: format(m, "MMM"),
    members: members6.filter((x) => x.createdAt <= endOfMonth(m)).length,
  }));

  const stats = [
    { label: "Total members", value: total, icon: Users, tone: "text-indigo-700 bg-indigo-100" },
    { label: "Active members", value: active, icon: UserCheck, tone: "text-emerald-700 bg-emerald-100" },
    { label: "Expired", value: expired, icon: UserX, tone: "text-red-700 bg-red-100" },
    { label: "Expiring in 7 days", value: expiringSoon, icon: AlertTriangle, tone: "text-amber-800 bg-amber-100" },
    { label: "Monthly revenue", value: money(revenueMonth._sum.amount), icon: Wallet, tone: "text-teal-800 bg-teal-100" },
    { label: "Outstanding balance", value: money(outstanding), icon: CreditCard, tone: "text-orange-800 bg-orange-100" },
    { label: "Today's attendance", value: todayAtt, icon: CalendarCheck, tone: "text-violet-700 bg-violet-100" },
    { label: "New this month", value: newThisMonth, icon: UserPlus, tone: "text-sky-700 bg-sky-100" },
  ];

  return (
    <>
      <PageHeader title={`Good day, ${user.name.split(" ")[0]}`} description={`Here is how ${gym.name} is doing today, ${fmtDate(new Date())}.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="p-5 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className={`grid size-9 place-items-center rounded-lg ${tone}`}><Icon className="size-4" /></span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Revenue</CardTitle><CardDescription>Payments received, last 6 months</CardDescription></CardHeader>
          <CardContent><RevenueChart data={revenueData} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Membership growth</CardTitle><CardDescription>Total registered members</CardDescription></CardHeader>
          <CardContent><GrowthChart data={growthData} /></CardContent></Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Expiring soon</CardTitle><CardDescription>Memberships ending within 7 days</CardDescription></CardHeader>
          {expiringList.length === 0 ? <Empty title="Nobody is expiring this week" /> : (
            <div className="overflow-x-auto">
              <Table><THead><TR><TH>Member</TH><TH>Plan</TH><TH>Ends</TH><TH>Left</TH></TR></THead>
                <TBody>{expiringList.map((m) => (
                  <TR key={m.id}><TD><Link className="font-semibold hover:underline" href={`/members/${m.memberId}`}>{m.member.fullName}</Link></TD>
                    <TD>{m.plan.name}</TD><TD>{fmtDate(m.endDate)}</TD><TD>{daysLeft(m.endDate)}d</TD></TR>))}</TBody></Table>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
          {paymentsRecent.length === 0 ? <Empty title="No payments yet" hint="Assign a plan to a member to record the first one." /> : (
            <div className="overflow-x-auto">
              <Table><THead><TR><TH>Member</TH><TH>Amount</TH><TH>Status</TH></TR></THead>
                <TBody>{paymentsRecent.map((p) => (
                  <TR key={p.id}><TD>{p.member.fullName}</TD><TD className="font-semibold">{money(p.amount)}</TD><TD><StatusBadge status={p.status} /></TD></TR>))}</TBody></Table>
            </div>
          )}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Recent registrations</CardTitle></CardHeader>
          {membersRecent.length === 0 ? <Empty title="No members yet" /> : (
            <div className="overflow-x-auto">
              <Table><THead><TR><TH>Name</TH><TH>Phone</TH><TH>Joined</TH></TR></THead>
                <TBody>{membersRecent.map((m) => (
                  <TR key={m.id}><TD><Link className="font-semibold hover:underline" href={`/members/${m.id}`}>{m.fullName}</Link></TD><TD>{m.phone}</TD><TD>{fmtDate(m.joinedAt)}</TD></TR>))}</TBody></Table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}