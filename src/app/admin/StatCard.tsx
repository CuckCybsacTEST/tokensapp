"use client";

// Componente para las tarjetas de estadísticas
export default function StatCard({ 
  label, 
  value, 
  description, 
  color = "text-slate-900 dark:text-white",
  compact = false,
  icon = null
}: {
  label: string;
  value: number;
  description: string;
  color?: string;
  compact?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm ${compact ? 'px-4 py-3' : 'p-6'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
      <div className={`mt-2 ${color} font-bold ${compact ? 'text-xl' : 'text-3xl'}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</div>
    </div>
  );
}
