"use server";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { addDays } from "date-fns";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import type { FormState } from "@/components/action-form";

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: String(fd.get("email") ?? "").toLowerCase(),
      password: String(fd.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Incorrect email or password." };
    throw e; // redirect
  }
}

const registerSchema = z.object({
  gymName: z.string().min(2, "Enter your gym name"),
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerGymAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const email = d.email.toLowerCase();

  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(d.password, 12);
  const base = d.gymName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "gym";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: d.name, email, phone: d.phone, passwordHash } });
    const gym = await tx.gym.create({ data: { name: d.gymName, slug, phone: d.phone, email } });
    await tx.gymUser.create({ data: { gymId: gym.id, userId: user.id, role: "GYM_OWNER" } });
    const plan = await tx.saasPlan.findUnique({ where: { code: "BASIC" } });
    if (plan) {
      await tx.gymSubscription.create({
        data: { gymId: gym.id, saasPlanId: plan.id, status: "TRIAL", trialEndsAt: addDays(new Date(), 14), currentPeriodEnd: addDays(new Date(), 14) },
      });
    }
  });

  try {
    await signIn("credentials", { email, password: d.password, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Account created. Please sign in." };
    throw e;
  }
}
