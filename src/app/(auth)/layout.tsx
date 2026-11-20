import { Dumbbell } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5 text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-sidebar"><Dumbbell className="size-5" /></span>
          FitDesk
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Every member, renewal and rupee in one place.</h1>
          <p className="mt-4 text-sidebar-foreground">Built for gyms in Nepal: track memberships by date, record payments in Rs., and know who is about to expire before they walk out.</p>
        </div>
        <svg aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[28rem] opacity-[0.07]" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="3">
          <circle cx="50" cy="50" r="45" /><circle cx="50" cy="50" r="30" /><circle cx="50" cy="50" r="15" />
        </svg>
        <p className="text-xs text-sidebar-foreground/70">© FitDesk. Each gym's data is isolated and private.</p>
      </aside>
      <main className="flex items-center justify-center p-6">{children}</main>
    </div>
  );
}
