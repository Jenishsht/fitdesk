"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BLUE = "#4f6bed";
const GREEN = "#22c993";
const GRID = "#e5e8f0";
const AXIS = { fontSize: 12, fill: "#6b7491" };

const tooltipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: "1px solid #e5e8f0",
    boxShadow: "0 4px 16px rgba(20, 30, 70, 0.08)",
    fontSize: 13,
    padding: "8px 12px",
  },
  labelStyle: { fontWeight: 600, marginBottom: 2 },
};

const short = (v: number) =>
  v >= 100000 ? `${+(v / 100000).toFixed(1)}L` : v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v);

export function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -10, right: 4 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity={1} />
            <stop offset="100%" stopColor={BLUE} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} tickFormatter={(v) => short(Number(v))} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v) => [`Rs. ${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
          cursor={{ fill: "#eef1fb" }}
        />
        <Bar dataKey="revenue" fill="url(#revenueFill)" radius={[8, 8, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GrowthChart({ data }: { data: { label: string; members: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -20, right: 4 }}>
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
        <Tooltip {...tooltipStyle} formatter={(v) => [v, "Total members"]} />
        <Area
          type="monotone"
          dataKey="members"
          stroke={GREEN}
          strokeWidth={2.5}
          fill="url(#growthFill)"
          dot={{ r: 3, fill: "#fff", stroke: GREEN, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}