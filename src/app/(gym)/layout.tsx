import { signOut } from "@/auth";
import { AppShell } from "@/components/sidebar";
import { requireGym } from "@/lib/session";

export default async function GymLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireGym();
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  return (
    <AppShell gymName={ctx.gym.name} userName={ctx.user.name} role={ctx.role} signOutAction={logout}>
      {children}
    </AppShell>
  );
}
