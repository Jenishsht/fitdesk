"use client";
import { useActionState } from "react";
import { qrCheckInAction, type CheckinState } from "./actions";

const initial: CheckinState = { status: "idle" };

export function CheckinForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(qrCheckInAction, initial);

  if (state.status === "ok" || state.status === "already") {
    const soon = state.daysLeft <= 7;
    return (
      <div className="text-center">
        {state.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.photoUrl}
            alt={state.firstName}
            className="mx-auto size-32 rounded-full border-4 border-emerald-500 object-cover"
          />
        ) : (
          <div className="mx-auto grid size-32 place-items-center rounded-full bg-emerald-500 text-5xl font-bold text-white">
            {state.firstName[0]}
          </div>
        )}

        <p className="mt-4 text-2xl font-bold">
          {state.status === "ok" ? `Welcome, ${state.firstName}!` : `Hi ${state.firstName}`}
        </p>
        <p className="mt-1 font-semibold text-emerald-600">
          {state.status === "ok" ? "You're checked in" : "You're already checked in today"}
        </p>

        <div className="mt-5 rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">{state.planName}</p>
          <p className={`text-4xl font-bold ${soon ? "text-amber-600" : ""}`}>
            {state.daysLeft}
          </p>
          <p className="text-sm text-muted-foreground">
            {state.daysLeft === 1 ? "day left" : "days left"} · ends {state.endDate}
          </p>
          {soon && (
            <p className="mt-2 text-sm font-medium text-amber-600">
              Your membership ends soon. Please renew at the desk.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="98XXXXXXXX"
          required
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {state.status === "error" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Checking in…" : "Check in"}
      </button>
    </form>
  );
}