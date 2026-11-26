import { daysUntil } from "@/lib/dates";

export function ExpiryBanner({ endDate }: { endDate: Date }) {
  const days = daysUntil(endDate);
  if (days > 7) return null;

  const style =
    days < 0
      ? "bg-red-100 text-red-800 border-red-300"
      : days <= 1
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-yellow-50 text-yellow-800 border-yellow-200";

  const message =
    days < 0
      ? "Your membership has expired. Please renew."
      : days === 0
      ? "Your membership expires today. Please renew."
      : days === 1
      ? "Your membership expires tomorrow."
      : `Your membership expires in ${days} days.`;

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${style}`}>
      {message}
    </div>
  );
}