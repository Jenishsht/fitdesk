"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/session";
import { newCheckinCode } from "@/lib/checkin";
import type { FormState } from "@/components/action-form";

export async function generateCheckinCodeAction(_: FormState, __: FormData): Promise<FormState> {
  const ctx = await requireGym();
  ctx.assert("attendance.manage");

  await db.gym.update({
    where: { id: ctx.gymId },
    data: { checkinCode: newCheckinCode() },
  });

  revalidatePath("/attendance/qr");
  return { ok: "New QR code created. Print it and replace the old one." };
}