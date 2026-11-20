
"use client";

import { useActionState } from "react";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createPlanAction, type PlanFormState } from "./actions";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: PlanFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating plan..." : "Create membership plan"}
    </Button>
  );
}

export function PlanForm() {
  const [state, formAction] = useActionState(
    createPlanAction,
    initialState
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-lg font-semibold">
        Create membership plan
      </h2>

      <p className="mb-5 text-sm text-muted-foreground">
        Add a new package for your gym members.
      </p>

      <form
        ref={formRef}
        action={formAction}
        className="grid gap-4 md:grid-cols-2"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Plan name *</label>
          <Input
            name="name"
            placeholder="Monthly Membership"
            required
            minLength={2}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Price (Rs.) *</label>
          <Input
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="1500"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Duration (days) *</label>
          <Input
            name="durationDays"
            type="number"
            min="1"
            step="1"
            placeholder="30"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Input
            name="description"
            placeholder="Full gym access for one month"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">
            Features (one per line)
          </label>

          <textarea
            name="features"
            rows={4}
            placeholder={
              "Gym access\nLocker facility\nPersonal training"
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {state.error && (
          <div
            role="alert"
            className="md:col-span-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {state.error}
          </div>
        )}

        {state.success && (
          <div
            role="status"
            className="md:col-span-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700"
          >
            {state.success}
          </div>
        )}

        <div className="md:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}
