import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody as TBody, TableCell as TD, TableHead as TH, TableHeader as THead, TableRow as TR } from "@/components/ui/table";
import { requireMember } from "@/lib/session";
import { db } from "@/lib/db";
import { daysLeft, membershipState } from "@/lib/membership";
import { fmtDate, money } from "@/lib/utils";

export const metadata = { title: "My membership" };

export default async function MemberDashboard() {
  const me = await requireMember(); // resolved from session: a member can only ever see their own record
  const [ms, payments, visits] = await Promise.all([
    db.membership.findFirst({ where: { memberId: me.id, gymId: me.gymId }, orderBy: { endDate: "desc" }, include: { plan: true } }),
    db.payment.findMany({ where: { memberId: me.id, gymId: me.gymId }, orderBy: { paidAt: "desc" }, take: 5 }),
    db.attendance.count({ where: { memberId: me.id, gymId: me.gymId } }),
  ]);
  const state = ms ? membershipState(ms) : null;
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div><p className="text-sm text-muted-foreground">{me.gym.name}</p><h1 className="text-2xl font-extrabold tracking-tight">Welcome, {me.fullName.split(" ")[0]}</h1></div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><Button variant="outline" size="sm">Sign out</Button></form>
      </div>
      <Card className="bg-sidebar text-white">
        <CardContent className="pt-5">
          {ms && state ? (
            <>
              <div className="flex items-start justify-between"><div><p className="text-sm text-sidebar-foreground">Your plan</p><p className="text-2xl font-extrabold">{ms.plan.name}</p></div><Badge>{state}</Badge></div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-sidebar-foreground">Started</p><p className="font-semibold">{fmtDate(ms.startDate)}</p></div>
                <div><p className="text-sidebar-foreground">Expires</p><p className="font-semibold">{fmtDate(ms.endDate)}</p></div>
                <div><p className="text-sidebar-foreground">Days left</p><p className="font-semibold">{Math.max(daysLeft(ms.endDate), 0)}</p></div>
              </div>
            </>
          ) : <p>You don't have a membership yet. Please ask the front desk.</p>}
        </CardContent>
      </Card>
      <Card className="p-5"><p className="text-sm text-muted-foreground">Total visits</p><p className="text-3xl font-extrabold">{visits}</p></Card>
      <Card>
        <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
        <Table><THead><TR><TH>Date</TH><TH>Amount</TH><TH>Status</TH></TR></THead>
          <TBody>{payments.map((p) => <TR key={p.id}><TD>{fmtDate(p.paidAt)}</TD><TD className="font-semibold">{money(p.amount.toString())}</TD><TD><Badge>{p.status}</Badge></TD></TR>)}</TBody></Table>
      </Card>
    </div>
  );
}
