"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/session";
import { activeWhere } from "@/lib/membership";
import { todayNepal } from "@/lib/utils";
import type { FormState } from "@/components/action-form";

export async function checkInAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireGym();
  ctx.assert("attendance.manage");
  const parsed = z.object({ memberId: z.string().min(1, "Choose a member") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const today = todayNepal();
  const member = await db.member.findFirst({
    where: { id: parsed.data.memberId, gymId: ctx.gymId },
    include: { memberships: { where: activeWhere(today), take: 1 } },
  });
  if (!member) return { error: "Member not found." };
  if (member.status !== "ACTIVE") return { error: `${member.fullName} is ${member.status.toLowerCase()}.` };
  if (member.memberships.length === 0) return { error: `${member.fullName} has no active membership.` };
  try {
    await db.attendance.create({ data: { gymId: ctx.gymId, memberId: member.id, date: today } });
  } catch {
    return { error: `${member.fullName} is already checked in today.` };
  }
  revalidatePath("/attendance");
  return { ok: `${member.fullName} checked in.` };
}
