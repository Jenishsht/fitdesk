"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/session";
import { addDaysUTC, todayNepal } from "@/lib/utils";
import type { FormState } from "@/components/action-form";

const memberSchema = z.object({
  fullName: z.string().min(2, "Enter the member's full name"),
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  gender: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

export async function createMemberAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireGym();
  ctx.assert("members.manage");
  const parsed = memberSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const dup = await db.member.findUnique({ where: { gymId_phone: { gymId: ctx.gymId, phone: d.phone } } });
  if (dup) return { error: "A member with this phone number already exists." };
  const m = await db.member.create({
    data: { ...d, email: d.email || null, gymId: ctx.gymId, joinedAt: todayNepal() },
  });
  revalidatePath("/members");
  redirect(`/members/${m.id}`);
}

export async function setMemberStatusAction(memberId: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
  const ctx = await requireGym();
  ctx.assert("members.manage");
  // gymId in the WHERE clause blocks cross-gym access (IDOR)
  await db.member.updateMany({ where: { id: memberId, gymId: ctx.gymId }, data: { status } });
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
}

const assignSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1, "Choose a plan"),
  startDate: z.string().min(1, "Choose a start date"),
  discount: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0).default(0),
  method: z.enum(["CASH", "BANK_TRANSFER", "QR", "KHALTI", "ESEWA", "OTHER"]).default("CASH"),
  reference: z.string().optional(),
});

/** New membership or renewal. Old records are never overwritten; a renewal links to the previous one. */
export async function assignMembershipAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireGym();
  ctx.assert("members.manage");
  const parsed = assignSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const [member, plan] = await Promise.all([
    db.member.findFirst({ where: { id: d.memberId, gymId: ctx.gymId } }),
    db.membershipPlan.findFirst({ where: { id: d.planId, gymId: ctx.gymId, isActive: true } }),
  ]);
  if (!member || !plan) return { error: "Member or plan not found." };

  const price = Number(plan.price);
  if (d.discount > price) return { error: "Discount cannot be more than the plan price." };
  const finalPrice = price - d.discount;
  if (d.amountPaid > finalPrice) return { error: "Amount paid cannot be more than the final price." };

  const start = new Date(`${d.startDate}T00:00:00.000Z`);
  const end = addDaysUTC(start, plan.durationDays);
  const ref = d.reference?.trim() || null;
  if (ref && (await db.payment.findUnique({ where: { gymId_reference: { gymId: ctx.gymId, reference: ref } } })))
    return { error: "This transaction reference was already used." };

  await db.$transaction(async (tx) => {
    const previous = await tx.membership.findFirst({ where: { memberId: member.id, gymId: ctx.gymId }, orderBy: { endDate: "desc" } });
    const ms = await tx.membership.create({
      data: { gymId: ctx.gymId, memberId: member.id, planId: plan.id, startDate: start, endDate: end, price, discount: d.discount, finalPrice, renewedFromId: previous?.id },
    });
    if (d.amountPaid > 0) {
      await tx.payment.create({
        data: {
          gymId: ctx.gymId, memberId: member.id, membershipId: ms.id, amount: d.amountPaid, method: d.method,
          status: d.amountPaid >= finalPrice ? "PAID" : "PARTIAL", reference: ref, recordedById: ctx.user.id,
        },
      });
    }
    await tx.auditLog.create({ data: { gymId: ctx.gymId, userId: ctx.user.id, action: previous ? "membership.renew" : "membership.create", entity: "Membership", entityId: ms.id } });
  });

  revalidatePath(`/members/${member.id}`);
  return { ok: "Membership saved." };
}

const paySchema = z.object({
  membershipId: z.string().min(1),
  amount: z.coerce.number().positive("Enter an amount"),
  method: z.enum(["CASH", "BANK_TRANSFER", "QR", "KHALTI", "ESEWA", "OTHER"]),
  reference: z.string().optional(),
});

export async function recordPaymentAction(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireGym();
  ctx.assert("payments.record");
  const parsed = paySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const ref = d.reference?.trim() || null;

  try {
    await db.$transaction(async (tx) => {
      const ms = await tx.membership.findFirst({ where: { id: d.membershipId, gymId: ctx.gymId }, include: { payments: true } });
      if (!ms) throw new Error("Membership not found.");
      const paid = ms.payments.filter((p) => p.status === "PAID" || p.status === "PARTIAL").reduce((s, p) => s + Number(p.amount), 0);
      const due = Number(ms.finalPrice) - paid;
      if (d.amount > due) throw new Error(`Only Rs. ${due} is still due on this membership.`);
      await tx.payment.create({
        data: {
          gymId: ctx.gymId, memberId: ms.memberId, membershipId: ms.id, amount: d.amount, method: d.method,
          status: d.amount >= due ? "PAID" : "PARTIAL", reference: ref, recordedById: ctx.user.id,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) return { error: "This transaction reference was already used." };
    return { error: e instanceof Error ? e.message : "Could not record payment." };
  }
  revalidatePath("/payments");
  revalidatePath("/members");
  return { ok: "Payment recorded." };
}
