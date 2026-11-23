import { notFound } from "next/navigation";
import { ActionForm, Field } from "@/components/action-form";
import { db } from "@/lib/db";
import { qrCheckInAction } from "./actions";

export const metadata = {
  title: "Check in",
  robots: { index: false, follow: false },
};

export default async function CheckInPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const gym = await db.gym.findUnique({
    where: { checkinCode: code },
    select: { name: true, status: true },
  });
  if (!gym || gym.status !== "ACTIVE") notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-bold">{gym.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">Enter your phone number to check in.</p>

      <ActionForm action={qrCheckInAction} submitLabel="Check in">
        <input type="hidden" name="code" value={code} />
        <Field label="Phone number">
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            required
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
      </ActionForm>
    </main>
  );
}