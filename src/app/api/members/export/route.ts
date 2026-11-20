import { NextResponse } from "next/server";
import { requireGym } from "@/lib/session";
import { db } from "@/lib/db";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const ctx = await requireGym();
  if (!ctx.can("members.manage") && !ctx.can("reports.view")) return new NextResponse("Forbidden", { status: 403 });
  const members = await db.member.findMany({ where: { gymId: ctx.gymId }, orderBy: { fullName: "asc" } });
  const rows = [["Name", "Phone", "Email", "Address", "Status", "Joined"].join(",")].concat(
    members.map((m) => [m.fullName, m.phone, m.email, m.address, m.status, m.joinedAt.toISOString().slice(0, 10)].map(esc).join(",")),
  );
  return new NextResponse(rows.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="members.csv"' },
  });
}
