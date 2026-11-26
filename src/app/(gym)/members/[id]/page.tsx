import { notFound } from "next/navigation";
import { ExpiryBanner } from "@/components/ExpiryBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionForm, Field } from "@/components/action-form";
import { Empty, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

import { requireGym } from "@/lib/session";
import { db } from "@/lib/db";
import { daysLeft, membershipState } from "@/lib/membership";
import { fmtDate, initials, money, num, todayNepal } from "@/lib/utils";

import {
  assignMembershipAction,
  recordPaymentAction,
  setMemberStatusAction,
} from "../actions";

const METHODS = [
  ["CASH", "Cash"],
  ["BANK_TRANSFER", "Bank transfer"],
  ["QR", "QR payment"],
  ["KHALTI", "Khalti"],
  ["ESEWA", "eSewa"],
  ["OTHER", "Other"],
] as const;

const methodLabel = (m: string) =>
  m.charAt(0) + m.slice(1).toLowerCase().replaceAll("_", " ");

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function MemberDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { gymId, can } = await requireGym();

  const member = await db.member.findFirst({
    where: { id, gymId },
    include: {
      memberships: {
        orderBy: { startDate: "desc" },
        include: {
          plan: true,
          payments: true,
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        take: 20,
        include: { membership: { include: { plan: true } } },
      },
      attendance: {
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  if (!member) notFound();

  const plans = await db.membershipPlan.findMany({
    where: { gymId, isActive: true },
    orderBy: { price: "asc" },
  });

  const current = member.memberships[0];
  const state = current ? membershipState(current) : null;

  type MembershipRow = (typeof member.memberships)[number];

  const paidOf = (ms: MembershipRow) =>
    ms.payments
      .filter((p) => p.status === "PAID" || p.status === "PARTIAL")
      .reduce((sum, payment) => sum + num(payment.amount), 0);

  const dueOf = (ms: MembershipRow) =>
    Math.max(num(ms.finalPrice) - paidOf(ms), 0);

  const payStatusOf = (ms: MembershipRow) => {
    const paid = paidOf(ms);
    if (paid === 0) return "UNPAID";
    return dueOf(ms) > 0 ? "PARTIAL" : "PAID";
  };

  const withDue = member.memberships.filter(
    (m) => !m.cancelledAt && dueOf(m) > 0
  );

  return (
    <>
      <PageHeader
        title={member.fullName}
        description={`Member since ${fmtDate(member.joinedAt)}`}
        actions={
          can("members.manage") && (
            <form
              action={setMemberStatusAction.bind(
                null,
                member.id,
                member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
              )}
            >
              <Button type="submit" variant="outline">
                {member.status === "ACTIVE"
                  ? "Deactivate member"
                  : "Reactivate member"}
              </Button>
            </form>
          )
        }
      />

      {/* Member information and current membership */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              {member.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photoUrl}
                  alt={member.fullName}
                  className="size-14 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-14 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {initials(member.fullName)}
                </span>
              )}

              <div>
                <StatusBadge status={member.status} />
                <p className="mt-1 text-sm text-muted-foreground">
                  {member.phone}
                </p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              {[
                ["Email", member.email],
                ["Address", member.address],
                ["Gender", member.gender],
                ["Emergency contact", member.emergencyContact],
                ["Notes", member.notes],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground">{key}</dt>
                  <dd className="font-medium">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current membership</CardTitle>
          </CardHeader>

          <CardContent>
            {current && state ? (
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-lg font-bold">{current.plan.name}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={state} />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <StatusBadge status={payStatusOf(current)} />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="font-semibold">
                    {fmtDate(current.startDate)} – {fmtDate(current.endDate)}
                  </p>
                </div>

                {num(current.discount) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Discount</p>
                    <p className="font-semibold text-red-600">
                      - {money(current.discount)}
                    </p>
                  </div>
                )}

                {dueOf(current) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Due</p>
                    <p className="font-semibold text-red-600">
                      {money(dueOf(current))}
                    </p>
                  </div>
                )}

                {state === "ACTIVE" && (
                  <div>
                    <p className="text-xs text-muted-foreground">Days left</p>
                    <p className="text-lg font-bold">
                      {daysLeft(current.endDate)}
                    </p>
                  </div>
                  
                )}
                                <div className="w-full">
                  <ExpiryBanner endDate={current.endDate} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No membership yet. Assign a plan below.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign or renew membership */}
      {can("members.manage") && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>
              {current ? "Renew or add a membership" : "Assign a plan"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a membership plan first.
              </p>
            ) : (
              <ActionForm
                action={assignMembershipAction}
                submitLabel={current ? "Renew membership" : "Assign plan"}
              >
                <input type="hidden" name="memberId" value={member.id} />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Plan">
                    <select
                      name="planId"
                      required
                      defaultValue=""
                      className={selectClass}
                    >
                      <option value="" disabled>
                        Choose a plan
                      </option>

                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} · {money(plan.price)} · {plan.durationDays}d
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Start date">
                    <Input
                      name="startDate"
                      type="date"
                      required
                      defaultValue={todayNepal().toISOString().slice(0, 10)}
                    />
                  </Field>

                  <Field label="Discount (Rs.)">
                    <Input name="discount" type="number" min={0} defaultValue={0} />
                  </Field>

                  <Field label="Amount paid now (Rs.)">
                    <Input name="amountPaid" type="number" min={0} defaultValue={0} />
                  </Field>

                  <Field label="Payment method">
                    <select name="method" defaultValue="CASH" className={selectClass}>
                      {METHODS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Transaction reference">
                    <Input name="reference" placeholder="Optional" />
                  </Field>
                </div>
              </ActionForm>
            )}
          </CardContent>
        </Card>
      )}

      {/* Collect outstanding balance */}
      {can("payments.record") && withDue.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Collect outstanding balance</CardTitle>
          </CardHeader>

          <CardContent>
            <ActionForm action={recordPaymentAction} submitLabel="Record payment">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Membership">
                  <select
                    name="membershipId"
                    className={selectClass}
                    defaultValue={withDue[0].id}
                  >
                    {withDue.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.plan.name} · due {money(dueOf(m))}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Amount (Rs.)">
                  <Input name="amount" type="number" min={1} required />
                </Field>

                <Field label="Method">
                  <select name="method" defaultValue="CASH" className={selectClass}>
                    {METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Reference">
                  <Input name="reference" placeholder="Optional" />
                </Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      {/* Membership, payment and attendance history */}
      <div className="mt-4 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Membership history</CardTitle>
          </CardHeader>

          {member.memberships.length === 0 ? (
            <Empty title="No memberships" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Plan</TH>
                    <TH>Period</TH>
                    <TH>Price</TH>
                    <TH>Discount</TH>
                    <TH>Final price</TH>
                    <TH>Paid</TH>
                    <TH>Due</TH>
                    <TH>Payment</TH>
                    <TH>Membership</TH>
                  </TR>
                </THead>

                <TBody>
                  {member.memberships.map((m) => {
                    const due = dueOf(m);
                    return (
                      <TR key={m.id}>
                        <TD className="whitespace-nowrap">{m.plan.name}</TD>
                        <TD className="whitespace-nowrap">
                          {fmtDate(m.startDate)} – {fmtDate(m.endDate)}
                        </TD>
                        <TD>{money(m.price)}</TD>
                        <TD className={num(m.discount) > 0 ? "text-red-600" : "text-muted-foreground"}>
                          {num(m.discount) > 0 ? `- ${money(m.discount)}` : "—"}
                        </TD>
                        <TD className="font-semibold">{money(m.finalPrice)}</TD>
                        <TD className="text-emerald-700">{money(paidOf(m))}</TD>
                        <TD className={due > 0 ? "font-semibold text-red-600" : "text-muted-foreground"}>
                          {due > 0 ? money(due) : "—"}
                        </TD>
                        <TD>
                          <StatusBadge status={payStatusOf(m)} />
                        </TD>
                        <TD>
                          <StatusBadge status={membershipState(m)} />
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
          </CardHeader>

          {member.payments.length === 0 ? (
            <Empty title="No payments recorded" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Plan</TH>
                   
                    <TH>Amount</TH>
                    <TH>Method</TH>
                    <TH>Transaction ID</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>

                <TBody>
                  {member.payments.map((payment) => {
                    const ms = payment.membership;
                    const discount = ms ? num(ms.discount) : 0;
                    return (
                      <TR key={payment.id}>
                        <TD className="whitespace-nowrap">{fmtDate(payment.paidAt)}</TD>
                        <TD className="whitespace-nowrap">{ms?.plan.name ?? "—"}</TD>
                     
                        <TD className="font-semibold text-emerald-700">
                          {money(payment.amount)}
                        </TD>
                        <TD>{methodLabel(payment.method)}</TD>
                        <TD className="font-mono text-xs">{payment.reference ?? "—"}</TD>
                        <TD>
                          <StatusBadge status={payment.status} />
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent attendance</CardTitle>
          </CardHeader>

          {member.attendance.length === 0 ? (
            <Empty title="No check-ins yet" />
          ) : (
            <div className="flex flex-wrap gap-2 px-5 pb-5">
              {member.attendance.map((attendance) => (
                <span
                  key={attendance.id}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                >
                  {fmtDate(attendance.date)}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}