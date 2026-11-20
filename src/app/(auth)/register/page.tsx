import Link from "next/link";
import { ActionForm, Field } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { registerGymAction } from "../actions";

export const metadata = { title: "Register your gym" };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold tracking-tight">Register your gym</h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">14-day free trial. No card required.</p>
      <ActionForm action={registerGymAction} submitLabel="Create gym account" className="space-y-4 [&_button]:w-full">
        <Field label="Gym name"><Input name="gymName" required /></Field>
        <Field label="Your full name"><Input name="name" autoComplete="name" required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Phone"><Input name="phone" type="tel" autoComplete="tel" required /></Field>
        </div>
        <Field label="Password"><Input name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
