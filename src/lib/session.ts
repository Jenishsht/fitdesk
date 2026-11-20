import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";

export type Permission = "members.manage" | "payments.record" | "attendance.manage" | "reports.view" | "plans.manage";
export const ALL_PERMISSIONS: Permission[] = ["members.manage", "payments.record", "attendance.manage", "reports.view", "plans.manage"];

/**
 * Resolves the gym ONLY from the authenticated session + database.
 * gymId is never accepted from the browser.
 */
export async function requireGym() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const gu = await db.gymUser.findFirst({
    where: { userId: session.user.id, isActive: true, gym: { status: { not: "SUSPENDED" } } },
    include: { gym: true, user: true },
    orderBy: { createdAt: "asc" },
  });
  if (!gu) redirect("/");
  const perms = gu.role === "GYM_OWNER" ? ALL_PERMISSIONS : ((gu.permissions as Permission[]) ?? []);
  return {
    user: gu.user,
    gym: gu.gym,
    gymId: gu.gymId,
    role: gu.role,
    can: (p: Permission) => perms.includes(p),
    assert(p: Permission) {
      if (!perms.includes(p)) throw new Error("You do not have permission to do this.");
    },
  };
}
export type GymCtx = Awaited<ReturnType<typeof requireGym>>;

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.platformRole !== "SUPER_ADMIN") redirect("/");
  return session.user;
}

export async function requireMember() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const member = await db.member.findFirst({ where: { userId: session.user.id }, include: { gym: true } });
  if (!member) redirect("/");
  return member;
}
