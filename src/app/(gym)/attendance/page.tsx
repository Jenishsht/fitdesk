
import Link from "next/link";

import { ActionForm, Field } from "@/components/action-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { todayNepal } from "@/lib/utils";
import { checkInAction } from "./actions";

export const metadata = {
  title: "Attendance",
};

export default async function AttendancePage() {
  const { gymId, can } = await requireGym();

  const today = todayNepal();

  const [list, eligible] = await Promise.all([
    db.attendance.findMany({
      where: {
        gymId,
        date: today,
      },
      orderBy: {
        checkedInAt: "desc",
      },
      include: {
        member: true,
      },
    }),

    // Show all active members, even without a membership plan.
    db.member.findMany({
      where: {
        gymId,
        status: "ACTIVE",
      },
      orderBy: {
        fullName: "asc",
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`${list.length} checked in today`}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        {/* Today's Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
          </CardHeader>

          {list.length === 0 ? (
            <Empty title="No check-ins yet today" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Member</TH>
                  <TH>Time</TH>
                  <TH>Source</TH>
                </TR>
              </THead>

              <TBody>
                {list.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <Link
                        href={`/members/${a.memberId}`}
                        className="font-semibold hover:underline"
                      >
                        {a.member.fullName}
                      </Link>
                    </TD>

                    <TD>
                      {new Intl.DateTimeFormat("en-GB", {
                        timeStyle: "short",
                        timeZone: "Asia/Kathmandu",
                      }).format(a.checkedInAt)}
                    </TD>

                    <TD className="capitalize">
                      {a.source.toLowerCase()}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Manual Check-in */}
        {can("attendance.manage") && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Manual Check-in</CardTitle>
            </CardHeader>

            <CardContent>
              {eligible.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active members found. Add a member first.
                </p>
              ) : (
                <ActionForm
                  action={checkInAction}
                  submitLabel="Check in"
                >
                  <Field label="Select active member">
                    <select
                      name="memberId"
                      defaultValue=""
                      required
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="" disabled>
                        Choose a member
                      </option>

                      {eligible.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} · {m.phone}
                        </option>
                      ))}
                    </select>
                  </Field>
                </ActionForm>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
