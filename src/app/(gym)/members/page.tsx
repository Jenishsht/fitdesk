import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { Empty, PageHeader } from "@/components/page-header";

import { requireGym } from "@/lib/session";
import { db } from "@/lib/db";
import { daysLeft, membershipState } from "@/lib/membership";
import { fmtDate, initials } from "@/lib/utils";

export const metadata = { title: "Members" };

const PAGE = 15;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { gymId, can } = await requireGym();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);

  const where = {
    gymId,
    ...(sp.status &&
    ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(sp.status)
      ? { status: sp.status as "ACTIVE" | "INACTIVE" | "SUSPENDED" }
      : {}),
    ...(sp.q
      ? {
          OR: [
            { fullName: { contains: sp.q, mode: "insensitive" as const } },
            { phone: { contains: sp.q } },
            { email: { contains: sp.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, members] = await Promise.all([
    db.member.count({ where }),
    db.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        memberships: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: true },
        },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE));

  const qs = (p: number) =>
    `?${new URLSearchParams({
      ...(sp.q ? { q: sp.q } : {}),
      ...(sp.status ? { status: sp.status } : {}),
      page: String(p),
    })}`;

  return (
    <>
      <PageHeader
        title="Members"
        description={`${total} ${total === 1 ? "member" : "members"} in your gym`}
        actions={
          <>
            <Link
              href="/api/members/export"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="size-4" />
              Export CSV
            </Link>

            {can("members.manage") && (
              <Link
                href="/members/new"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="size-4" />
                Add member
              </Link>
            )}
          </>
        }
      />

      <Card>
        <form className="flex flex-wrap gap-2 border-b p-4">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={sp.q}
              placeholder="Search name, phone or email"
              className="pl-9"
            />
          </div>

          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="h-10 w-40 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <Button variant="outline" type="submit">
            Filter
          </Button>
        </form>

        {members.length === 0 ? (
          <Empty
            title="No members found"
            hint="Add your first member or change the filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Member</TH>
                  <TH>Phone</TH>
                  <TH>Plan</TH>
                  <TH>Membership</TH>
                  <TH>Expires</TH>
                </TR>
              </THead>

              <TBody>
                {members.map((m) => {
                  const ms = m.memberships[0];
                  const state = ms ? membershipState(ms) : null;

                  return (
                    <TR key={m.id}>
                      <TD>
                        <Link
                          href={`/members/${m.id}`}
                          className="flex items-center gap-3"
                        >
                          {m.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.photoUrl}
                              alt={m.fullName}
                              className="size-9 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                              {initials(m.fullName)}
                            </span>
                          )}

                          <span>
                            <span className="block font-semibold">
                              {m.fullName}
                            </span>
                            {m.status !== "ACTIVE" && (
                              <StatusBadge status={m.status} />
                            )}
                          </span>
                        </Link>
                      </TD>

                      <TD>{m.phone}</TD>
                      <TD>{ms?.plan.name ?? "—"}</TD>

                      <TD>
                        {state ? (
                          <StatusBadge status={state} />
                        ) : (
                          <span className="text-muted-foreground">No plan</span>
                        )}
                      </TD>

                      <TD className="whitespace-nowrap">
                        {ms ? (
                          <>
                            {fmtDate(ms.endDate)}
                            {state === "ACTIVE" && (
                              <span className="text-xs text-muted-foreground">
                                {" "}({daysLeft(ms.endDate)}d)
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>
            Page {page} of {pages}
          </span>

          <div className="flex gap-2">
            <Link
              href={qs(page - 1)}
              aria-disabled={page <= 1}
              className={`inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent ${
                page <= 1 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Previous
            </Link>
            <Link
              href={qs(page + 1)}
              aria-disabled={page >= pages}
              className={`inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent ${
                page >= pages ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </Card>
    </>
  );
}