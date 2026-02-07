"use client";

import { useEffect, useState } from "react";

type GlobalStats = {
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  totalInvitations: number;
  totalArrived: number;
  totalPending: number;
  totalConfirmed: number;
  totalCancelled: number;
  totalWithCode: number;
};

export function StatsClient() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/invitations?stats=1");
        const j = await res.json();
        if (j?.globalStats) setStats(j.globalStats);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="p-6 text-slate-500">Cargando estadísticas...</div>;
  if (!stats) return <div className="p-6 text-red-500">No se pudieron cargar las estadísticas</div>;

  const arrivalRate = stats.totalInvitations > 0 ? ((stats.totalArrived / stats.totalInvitations) * 100).toFixed(1) : '0';

  const sections = [
    {
      title: "Eventos",
      items: [
        { label: "Total eventos", value: stats.totalEvents, color: "text-slate-800 dark:text-white" },
        { label: "Activos", value: stats.activeEvents, color: "text-emerald-600" },
        { label: "Completados", value: stats.completedEvents, color: "text-blue-600" },
        { label: "Cancelados", value: stats.cancelledEvents, color: "text-rose-600" },
      ],
    },
    {
      title: "Invitaciones",
      items: [
        { label: "Total invitaciones", value: stats.totalInvitations, color: "text-slate-800 dark:text-white" },
        { label: "Pendientes", value: stats.totalPending, color: "text-amber-600" },
        { label: "Confirmados", value: stats.totalConfirmed, color: "text-blue-600" },
        { label: "Llegaron", value: stats.totalArrived, color: "text-green-600" },
        { label: "Cancelados", value: stats.totalCancelled, color: "text-rose-600" },
        { label: "Con QR", value: stats.totalWithCode, color: "text-purple-600" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <a href="/admin/generadorinvitaciones" className="text-blue-600 hover:underline text-sm">← Eventos</a>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Estadísticas de Invitaciones</h1>
        </div>

        {/* Arrival rate highlight */}
        <div className="rounded-xl border-2 border-emerald-400 p-6 bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <div className="text-5xl font-extrabold text-emerald-600">{arrivalRate}%</div>
          <div className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Tasa de asistencia global</div>
          <div className="text-xs text-slate-500 mt-1">{stats.totalArrived} de {stats.totalInvitations} invitados llegaron</div>
        </div>

        {sections.map(section => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">{section.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {section.items.map(item => (
                <div key={item.label} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 text-center">
                  <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
