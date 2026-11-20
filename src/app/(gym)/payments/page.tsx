import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, Empty } from "@/components/page-header";
import { requireGym } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate, money, num } from "@/lib/utils";

export const metadata = { title: "Payments" };

const methodLabel = (m: string) =>
  m.charAt(0) + m.slice(1).toLowerCase().replace("_", " ");

export default async function PaymentsPage() {
  const { gymId } = await requireGym();

  const [payments, memberships] = await Promise.all([
    db.payment.findMany({
      where: { gymId },
      orderBy: { paidAt: "desc" },
      take: 100,
      include: {
        member: true,
        membership: { include: { plan: true } },
      },
    }),
    db.membership.findMany({
      where: { gymId, cancelledAt: null },
      orderBy: { startDate: "desc" },
      take: 300,
      include: {
        member: true,
        plan: true,
        payments: { select: { amount: true, status: true } },
      },
    }),
  ]);

  // Money actually collected per membership (PAID and PARTIAL payments only)
  const withBalance = memberships.map((m) => {
    const paid = m.payments
      .filter((p) => p.status === "PAID" || p.status === "PARTIAL")
      .reduce((s, p) => s + num(p.amount), 0);
    const due = Math.max(num(m.finalPrice) - paid, 0);
    const status = paid === 0 ? "UNPAID" : due > 0 ? "PARTIAL" : "PAID";
    return { m, paid, due, status };
  });

  const outstanding = withBalance.filter((x) => x.due > 0);
  const totalDue = outstanding.reduce((s, x) => s + x.due, 0);
  const totalCollected = payments
    .filter((p) => p.status === "PAID" || p.status === "PARTIAL")
    .reduce((s, p) => s + num(p.amount), 0);
  const totalDiscount = memberships.reduce((s, m) => s + num(m.discount), 0);

  const summary = [
    { label: "Collected (last 100 payments)", value: money(totalCollected), tone: "text-emerald-700" },
    { label: "Outstanding balance", value: money(totalDue), tone: "text-red-700" },
    { label: "Discounts given", value: money(totalDiscount), tone: "text-orange-700" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Payment history, discounts and outstanding balances." />

      <div className="grid gap-4 sm:grid-cols-3">
        {summary.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            <p className={`mt-2 text-2xl font-extrabold tracking-tight ${s.tone}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding balances</CardTitle>
          <CardDescription>Memberships that are not fully paid</CardDescription>
        </CardHeader>
        {outstanding.length === 0 ? (
          <Empty title="Everything is paid" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Member</TH>
                  <TH>Plan</TH>
                  <TH>Price</TH>
                  <TH>Discount</TH>
                  <TH>Final price</TH>
                  <TH>Paid</TH>
                  <TH>Due</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {outstanding.map(({ m, paid, due, status }) => (
                  <TR key={m.id}>
                    <TD>
                      <Link className="font-semibold hover:underline" href={`/members/${m.memberId}`}>
                        {m.member.fullName}
                      </Link>
                    </TD>
                    <TD>{m.plan.name}</TD>
                    <TD>{money(m.price)}</TD>
                    <TD className={num(m.discount) > 0 ? "text-red-600" : "text-muted-foreground"}>
                      {num(m.discount) > 0 ? `- ${money(m.discount)}` : "—"}
                    </TD>
                    <TD className="font-semibold">{money(m.finalPrice)}</TD>
                    <TD className="text-emerald-700">{money(paid)}</TD>
                    <TD className="font-semibold text-red-600">{money(due)}</TD>
                    <TD><StatusBadge status={status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )};
      </Card>
    </div>
  );
}