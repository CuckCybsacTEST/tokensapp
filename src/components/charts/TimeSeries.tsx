"use client";
import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export type TimeSeriesPoint = {
  day: string; // YYYY-MM-DD
  in: number;
  out: number;
  uniquePersons: number;
  completionRatePct?: number;
};

export function TimeSeries({ data }: { data: TimeSeriesPoint[] }) {
  const filtered = data || [];
  if (!filtered.length) return <div className="text-xs text-slate-400">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={filtered} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={10} width={30} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(v)=>`${v}%`} tickLine={false} axisLine={false} fontSize={10} width={36} />
        <Tooltip formatter={(v:any, n:any)=>[n?.includes('%')? `${v}%`: v, n]} />
        <Legend />
        <Bar yAxisId="left" name="IN" dataKey="in" fill="#10b981" radius={[4,4,0,0]} />
        <Bar yAxisId="left" name="OUT" dataKey="out" fill="#3b82f6" radius={[4,4,0,0]} />
        <Line yAxisId="left" type="monotone" name="Personas únicas" dataKey="uniquePersons" stroke="#6366f1" strokeWidth={2} dot={false} />
        <Line yAxisId="right" type="monotone" name="% cumplimiento" dataKey="completionRatePct" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default TimeSeries;
