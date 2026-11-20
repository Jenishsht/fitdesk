
import { ActionForm, Field } from "@/components/action-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { requireGym } from "@/lib/session";
import { createMemberAction } from "../actions";

export const metadata = {
  title: "Add member",
};

export default async function NewMemberPage() {
  const ctx = await requireGym();
  ctx.assert("members.manage");

  return (
    <>
      <PageHeader
        title="Add member"
        description="You can assign a membership plan on the next screen."
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <ActionForm
            action={createMemberAction}
            submitLabel="Save member"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input name="fullName" required />
              </Field>

              <Field label="Phone">
                <Input name="phone" type="tel" required />
              </Field>

              <Field label="Email (optional)">
                <Input name="email" type="email" />
              </Field>

              <Field label="Gender (optional)">
                <select
                  name="gender"
                  defaultValue=""
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Not specified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field label="Address">
                <Input name="address" />
              </Field>

              <Field label="Emergency contact">
                <Input name="emergencyContact" />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                name="notes"
                rows={4}
                placeholder="Additional member information..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
