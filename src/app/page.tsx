import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.platformRole === "SUPER_ADMIN") redirect("/admin");
  const gu = await db.gymUser.findFirst({ where: { userId: session.user.id, isActive: true } });
  if (gu) redirect("/dashboard");
  const m = await db.member.findFirst({ where: { userId: session.user.id } });
  if (m) redirect("/member/dashboard");
  redirect("/login");
}
