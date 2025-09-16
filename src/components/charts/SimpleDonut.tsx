"use client";
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface DonutDatum { name: string; value: number; color?: string; }
export function SimpleDonut({ data, innerRadius=50, outerRadius=70 }: { data: DonutDatum[]; innerRadius?: number; outerRadius?: number; }) {
  const filtered = data.filter(d=>d.value>0);
  if (!filtered.length) return <div className="text-xs text-slate-400">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} strokeWidth={1}>
          {filtered.map((d,i)=>(<Cell key={i} fill={d.color || palette[i % palette.length]} />))}
        </Pie>
        <Tooltip formatter={(v:any, n:any)=>[v, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

const palette = ['#10b981','#6366f1','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#14b8a6','#f472b6'];
