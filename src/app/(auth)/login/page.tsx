import Link from "next/link";
import { ActionForm, Field } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { loginAction } from "../actions";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold tracking-tight">Sign in to FitDesk</h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">Use the email you registered with.</p>
      <ActionForm action={loginAction} submitLabel="Sign in" className="space-y-4 [&_button]:w-full">
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New gym? <Link href="/register" className="font-semibold text-primary hover:underline">Create your account</Link>
      </p>
    </div>
  );
}
