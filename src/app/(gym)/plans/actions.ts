
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/session";

export type PlanFormState = {
  error?: string;
  success?: string;
};

const planSchema = z.object({
  name: z.string().trim().min(2, "Plan name must be at least 2 characters"),
  price: z.coerce.number().finite().min(0, "Price cannot be negative"),
  durationDays: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 day"),
  description: z.string().trim().optional(),
  features: z.string().optional(),
});

export async function createPlanAction(
  _previousState: PlanFormState,
  formData: FormData
): Promise<PlanFormState> {
  try {
    const ctx = await requireGym();
    ctx.assert("plans.manage");

    const parsed = planSchema.safeParse({
      name: formData.get("name"),
      price: formData.get("price"),
      durationDays: formData.get("durationDays"),
      description: formData.get("description"),
      features: formData.get("features"),
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Invalid plan details",
      };
    }

    const data = parsed.data;

    const existingPlan = await db.membershipPlan.findFirst({
      where: {
        gymId: ctx.gymId,
        name: data.name,
      },
    });

    if (existingPlan) {
      return { error: "A plan with this name already exists." };
    }

    await db.membershipPlan.create({
      data: {
        gymId: ctx.gymId,
        name: data.name,
        price: data.price,
        durationDays: data.durationDays,
        description: data.description || null,
        features: (data.features ?? "")
          .split("\n")
          .map((feature) => feature.trim())
          .filter(Boolean),
      },
    });

    revalidatePath("/plans");

    return { success: "Membership plan created successfully!" };
  } catch (error) {
    console.error("CREATE_PLAN_ERROR:", error);

    return {
      error: "Unable to create membership plan. Please check your permissions and try again.",
    };
  }
}
