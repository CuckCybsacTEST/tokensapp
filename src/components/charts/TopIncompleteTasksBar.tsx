"use client";
import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export type IncompleteTaskDatum = { label: string; missingCount: number };

function truncateLabel(s: string, n = 24) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function TopIncompleteTasksBar({ data }: { data: IncompleteTaskDatum[] }) {
  const filtered = (data || []).map(d => ({ name: truncateLabel(d.label), value: d.missingCount }));
  if (!filtered.length) return <div className="text-xs text-slate-400">Sin datos</div>;
  const height = Math.max(160, filtered.length * 36);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={filtered} layout="vertical" margin={{ top: 10, right: 16, left: 40, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={10} width={120} />
        <Tooltip />
        <Bar dataKey="value" fill="#ef4444" radius={[0,4,4,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default TopIncompleteTasksBar;
