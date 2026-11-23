
// type StatusBadgeProps = {
//   status: string;
// };

// const statusStyles: Record<
//   string,
//   { label: string; className: string; dot: string }
// > = {
//   PAID: {
//     label: "Paid",
//     className: "bg-emerald-100 text-emerald-800 ring-emerald-200",
//     dot: "bg-emerald-500",
//   },
//   PARTIAL: {
//     label: "Partial",
//     className: "bg-amber-100 text-amber-800 ring-amber-200",
//     dot: "bg-amber-500",
//   },
//   PENDING: {
//     label: "Pending",
//     className: "bg-blue-100 text-blue-800 ring-blue-200",
//     dot: "bg-blue-500",
//   },
//   FAILED: {
//     label: "Failed",
//     className: "bg-red-100 text-red-800 ring-red-200",
//     dot: "bg-red-500",
//   },
//   REFUNDED: {
//     label: "Refunded",
//     className: "bg-purple-100 text-purple-800 ring-purple-200",
//     dot: "bg-purple-500",
//   },
//   ACTIVE: {
//     label: "Active",
//     className: "bg-emerald-100 text-emerald-800 ring-emerald-200",
//     dot: "bg-emerald-500",
//   },
//   EXPIRED: {
//     label: "Expired",
//     className: "bg-orange-100 text-orange-800 ring-orange-200",
//     dot: "bg-orange-500",
//   },
//   CANCELLED: {
//     label: "Cancelled",
//     className: "bg-rose-100 text-rose-800 ring-rose-200",
//     dot: "bg-rose-500",
//   },
//   INACTIVE: {
//     label: "Inactive",
//     className: "bg-slate-200 text-slate-700 ring-slate-300",
//     dot: "bg-slate-500",
//   },
// };

// export function StatusBadge({ status }: StatusBadgeProps) {
//   const key = status.toUpperCase();

//   const config = statusStyles[key] ?? {
//     label: status.replaceAll("_", " "),
//     className: "bg-slate-100 text-slate-700 ring-slate-200",
//     dot: "bg-slate-500",
//   };

//   return (
//     <span
//       className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}
//     >
//       <span className={`size-1.5 rounded-full ${config.dot}`} />
//       {config.label}
//     </span>
//   );
// }

import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  // Payments
  PAID:      { label: "Paid",      cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  PARTIAL:   { label: "Partial",   cls: "bg-orange-50 text-orange-700 ring-orange-600/20",    dot: "bg-orange-500" },
  PENDING:   { label: "Not paid",  cls: "bg-red-50 text-red-700 ring-red-600/20",             dot: "bg-red-500" },
  UNPAID:    { label: "Not paid",  cls: "bg-red-50 text-red-700 ring-red-600/20",             dot: "bg-red-500" },
  REFUNDED:  { label: "Refunded",  cls: "bg-slate-100 text-slate-700 ring-slate-500/20",      dot: "bg-slate-400" },
  // Members and memberships
  ACTIVE:    { label: "Active",    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  INACTIVE:  { label: "Inactive",  cls: "bg-slate-100 text-slate-600 ring-slate-500/20",      dot: "bg-slate-400" },
  SUSPENDED: { label: "Suspended", cls: "bg-red-50 text-red-700 ring-red-600/20",             dot: "bg-red-500" },
  EXPIRED:   { label: "Expired",   cls: "bg-red-50 text-red-700 ring-red-600/20",             dot: "bg-red-500" },
  EXPIRING:  { label: "Expiring",  cls: "bg-amber-50 text-amber-800 ring-amber-600/20",       dot: "bg-amber-500" },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-600 ring-slate-500/20",      dot: "bg-slate-400" },
  FROZEN:    { label: "Frozen",    cls: "bg-sky-50 text-sky-700 ring-sky-600/20",          dot: "bg-sky-500" },
  UPCOMING:  { label: "Upcoming",  cls: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? {
    label: status.charAt(0) + status.slice(1).toLowerCase(),
    cls: "bg-slate-100 text-slate-700 ring-slate-500/20",
    dot: "bg-slate-400",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", s.cls)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}