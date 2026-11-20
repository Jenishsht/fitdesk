import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireSuperAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Platform admin" };

export default async function AdminPage() {
  await requireSuperAdmin();
  const [gyms, active, suspended, trial] = await Promise.all([
    db.gym.findMany({ orderBy: { createdAt: "desc" }, include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { saasPlan: true } }, _count: { select: { members: true } } } }),
    db.gym.count({ where: { status: "ACTIVE" } }),
    db.gym.count({ where: { status: "SUSPENDED" } }),
    db.gymSubscription.count({ where: { status: "TRIAL" } }),
  ]);
  // NOTE: only counts are shown here. Super admin has no screens that list gym members' personal data.
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">FitDesk platform</h1>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><Button variant="outline">Sign out</Button></form>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[["Total gyms", gyms.length], ["Active", active], ["Suspended", suspended], ["On trial", trial]].map(([l, v]) => (
          <Card key={l as string} className="p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="mt-2 text-3xl font-extrabold">{v}</p></Card>
        ))}
      </div>
      <Card>
        <Table><THead><TR><TH>Gym</TH><TH>Status</TH><TH>Plan</TH><TH>Subscription</TH><TH>Members</TH><TH>Registered</TH></TR></THead>
          <TBody>{gyms.map((g) => (
            <TR key={g.id}><TD className="font-semibold">{g.name}</TD><TD><StatusBadge status={g.status} /></TD>
              <TD>{g.subscriptions[0]?.saasPlan.name ?? "—"}</TD><TD>{g.subscriptions[0] ? <StatusBadge status={g.subscriptions[0].status} /> : "—"}</TD>
              <TD>{g._count.members}</TD><TD>{fmtDate(g.createdAt)}</TD></TR>))}</TBody></Table>
      </Card>
    </div>
  );
}
