
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Empty } from "@/components/page-header";

import { PlanForm } from "./plan-form";
import { requireGym } from "@/lib/session";
import { db } from "@/lib/db";
import { money } from "@/lib/utils";

export const metadata = {
  title: "Membership Plans",
};

export default async function PlansPage() {
  const { gymId, can } = await requireGym();

  const plans = await db.membershipPlan.findMany({
    where: { gymId },
    orderBy: { createdAt: "desc" },
  });

  const canManage = can("plans.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership Plans"
        description="Create and manage membership packages for your gym."
      />

      {canManage ? (
        <PlanForm />
      ) : (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            You don't have permission to manage membership plans.
          </p>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            All membership plans
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage packages available to your members.
          </p>
        </div>

        <Badge>{plans.length} plans</Badge>
      </div>

      {plans.length === 0 ? (
        <Card className="p-8">
          <Empty
            title="No membership plans yet"
            hint="Create your first membership plan to get started."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features)
              ? plan.features
              : [];

            return (
              <Card
                key={plan.id}
                className="flex flex-col gap-4 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {plan.name}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.description || "Membership package"}
                    </p>
                  </div>

                  <Badge>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div>
                  <p className="text-2xl font-bold">
                    {money(plan.price)}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {plan.durationDays} days
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="mb-3 text-sm font-medium">
                    Features
                  </p>

                  {features.length > 0 ? (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {features.map((feature, index) => (
                        <li key={index}>
                          <span className="mr-2 text-emerald-600">✓</span>
                          {String(feature)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No features added.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
