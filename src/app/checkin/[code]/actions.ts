// "use server";
// import { z } from "zod";
// import { db } from "@/lib/db";
// import { activeWhere } from "@/lib/membership";
// import { todayNepal } from "@/lib/utils";
// import { clientIp, last10Digits, rateLimit } from "@/lib/checkin";
// import type { FormState } from "@/components/action-form";

// const schema = z.object({
//   code: z.string().min(1).max(64),
//   phone: z.string().min(1, "Enter your phone number").max(20),
// });

// export async function qrCheckInAction(_: FormState, fd: FormData): Promise<FormState> {
//   const parsed = schema.safeParse(Object.fromEntries(fd));
//   if (!parsed.success) return { error: parsed.error.issues[0].message };

//   const ip = await clientIp();
//   if (!rateLimit(`checkin:${ip}`, 10, 10 * 60_000)) {
//     return { error: "Too many attempts. Please wait a few minutes or ask the front desk." };
//   }

//   const last10 = last10Digits(parsed.data.phone);
//   if (!last10) return { error: "Enter a valid phone number." };

//   const gym = await db.gym.findUnique({
//     where: { checkinCode: parsed.data.code },
//     select: { id: true, status: true },
//   });
//   if (!gym || gym.status !== "ACTIVE") return { error: "This QR code is not valid." };

//   const today = todayNepal();
//   const member = await db.member.findFirst({
//     where: { gymId: gym.id, phone: { endsWith: last10 } },
//     include: { memberships: { where: activeWhere(today), take: 1 } },
//   });

//   // Same message for unknown numbers, so people can't probe who is a member.
//   if (!member) return { error: "We couldn't find this number. Please ask the front desk." };

//   const firstName = member.fullName.split(" ")[0];

//   if (member.status !== "ACTIVE") {
//     return { error: "Your account is not active. Please see the front desk." };
//   }
//   if (member.memberships.length === 0) {
//     return { error: `Hi ${firstName}, your membership has expired. Please renew at the desk.` };
//   }

//   try {
//     await db.attendance.create({
//       data: { gymId: gym.id, memberId: member.id, date: today, source: "QR" },
//     });
//   } catch (e) {
//     // P2002 = unique constraint (already checked in today)
//     if ((e as { code?: string }).code === "P2002") {
//       return { ok: `Hi ${firstName}, you're already checked in today.` };
//     }
//     console.error("QR check-in failed", e);
//     return { error: "Something went wrong. Please ask the front desk." };
//   }

//   return { ok: `Welcome, ${firstName}! You're checked in.` };
// }
"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { activeWhere, daysLeft } from "@/lib/membership";
import { fmtDate, todayNepal } from "@/lib/utils";
import { clientIp, last10Digits, rateLimit } from "@/lib/checkin";

const SHOW_PHOTO = true; // set to false to hide the photo on this public page

export type CheckinState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "ok" | "already";
      firstName: string;
      photoUrl: string | null;
      planName: string;
      daysLeft: number;
      endDate: string;
    };

const schema = z.object({
  code: z.string().min(1).max(64),
  phone: z.string().min(1, "Enter your phone number").max(20),
});

const err = (message: string): CheckinState => ({ status: "error", message });

export async function qrCheckInAction(
  _: CheckinState,
  fd: FormData,
): Promise<CheckinState> {
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return err(parsed.error.issues[0].message);

  const ip = await clientIp();
  if (!rateLimit(`checkin:${ip}`, 10, 10 * 60_000)) {
    return err("Too many attempts. Please wait a few minutes or ask the front desk.");
  }

  const last10 = last10Digits(parsed.data.phone);
  if (!last10) return err("Enter a valid phone number.");

  const gym = await db.gym.findUnique({
    where: { checkinCode: parsed.data.code },
    select: { id: true, status: true },
  });
  if (!gym || gym.status !== "ACTIVE") return err("This QR code is not valid.");

  const today = todayNepal();
  const member = await db.member.findFirst({
    where: { gymId: gym.id, phone: { endsWith: last10 } },
    include: {
      memberships: {
        where: activeWhere(today),
        orderBy: { endDate: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  });

  if (!member) return err("We couldn't find this number. Please ask the front desk.");

  const firstName = member.fullName.split(" ")[0];

  if (member.status !== "ACTIVE") {
    return err("Your account is not active. Please see the front desk.");
  }
  const ms = member.memberships[0];
  if (!ms) {
    return err(`Hi ${firstName}, your membership has expired. Please renew at the desk.`);
  }

  const info = {
    firstName,
    photoUrl: SHOW_PHOTO ? member.photoUrl : null,
    planName: ms.plan.name,
    daysLeft: daysLeft(ms.endDate),
    endDate: fmtDate(ms.endDate),
  };

  try {
    await db.attendance.create({
      data: { gymId: gym.id, memberId: member.id, date: today, source: "QR" },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { status: "already", ...info };
    }
    console.error("QR check-in failed", e);
    return err("Something went wrong. Please ask the front desk.");
  }

  return { status: "ok", ...info };
}