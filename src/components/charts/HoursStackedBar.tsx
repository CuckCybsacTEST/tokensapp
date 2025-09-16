"use client";
import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export type HourDatum = { hour: number; in: number; out: number };

export function HoursStackedBar({ data }: { data: HourDatum[] }) {
  const filtered = (data || []).map(d => ({ ...d, label: `${d.hour}:00` }));
  if (!filtered.length) return <div className="text-xs text-slate-400">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={filtered} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} fontSize={10} width={30} />
        <Tooltip />
        <Legend />
        <Bar stackId="a" name="IN" dataKey="in" fill="#10b981" radius={[4,4,0,0]} />
        <Bar stackId="a" name="OUT" dataKey="out" fill="#3b82f6" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default HoursStackedBar;
