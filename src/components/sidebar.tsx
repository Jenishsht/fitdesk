"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarCheck, CreditCard, Dumbbell, LayoutDashboard, LogOut, Menu, Tags, Users, X } from "lucide-react";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/plans", label: "Plans", icon: Tags },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
];

export function AppShell({
  gymName, userName, role, signOutAction, children,
}: { gymName: string; userName: string; role: string; signOutAction: () => Promise<void>; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5 text-white">
        <span className="grid size-9 place-items-center rounded-lg bg-brand text-sidebar"><Dumbbell className="size-5" /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">FitDesk</p>
          <p className="truncate text-xs text-sidebar-foreground">{gymName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-white",
                active && "bg-sidebar-accent text-white")}>
              <Icon className="size-4" /> {label}
              {active && <span className="ml-auto size-1.5 rounded-full bg-brand" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-9 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-white">{initials(userName)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-sidebar-foreground">{role === "GYM_OWNER" ? "Owner" : "Staff"}</p>
          </div>
          <form action={signOutAction}>
            <button aria-label="Sign out" className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"><LogOut className="size-4" /></button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar lg:flex">{nav}</aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-2 hover:bg-muted"><Menu className="size-5" /></button>
        <span className="text-sm font-bold">{gymName}</span>
        <span className="size-9" />
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 text-white"><X className="size-5" /></button>
            {nav}
          </aside>
        </div>
      )}

      <main className="min-w-0 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground",
                active && "text-primary"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}