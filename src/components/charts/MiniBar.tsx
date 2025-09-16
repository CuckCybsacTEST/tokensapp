"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface MiniBarPoint { name: string; value: number; }
export function MiniBar({ data }: { data: MiniBarPoint[] }) {
  const filtered = data.filter(d=>d.value>0);
  if (!filtered.length) return <div className="text-xs text-slate-400">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={filtered} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-30} textAnchor="end" height={50} />
        <YAxis tickLine={false} axisLine={false} fontSize={10} width={30} />
        <Tooltip />
        <Bar dataKey="value" radius={[4,4,0,0]} fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  );
}
