'use client';

import React, { useState, useEffect, useCallback } from 'react';

/* ─── types ─────────────────────────────────────────────────── */
interface DeliveredPrize { label: string; count: number; }
interface ReusableGroupPrize { label: string; total: number; daySales: number; }
interface ReusableGroup {
  id: string; name: string; color: string | null;
  totalTokens: number; activeTokens: number; daySales: number;
  prizes: ReusableGroupPrize[];
}
interface BirthdaySummary {
  total: number; arrived: number; totalGuests: number; arrivedGuests: number;
  reservations: { id: string; celebrantName: string; timeSlot: string; status: string; guestsPlanned: number; guestArrivals: number; hostArrived: boolean; packName: string | null }[];
}
interface SpecialGuestsSummary {
  total: number; arrived: number;
  events: { id: string; name: string; timeSlot: string; totalGuests: number; arrivedGuests: number }[];
}
interface DaySummary {
  day: string;
  attendance: { person: { id: string; name: string; code: string; area: string | null }; firstIn: string | null; lastOut: string | null; missingExit: boolean }[];
  deliveredPrizes: DeliveredPrize[];
  totalDelivered: number;
  totalTokensInBatches: number;
  totalReusableSales: number;
  reusableGroups: ReusableGroup[];
  birthdays: BirthdaySummary;
  specialGuests: SpecialGuestsSummary;
  evaluation: { rating: string | null; comment: string | null; closedAt: string | null } | null;
}

/* ─── helpers ───────────────────────────────────────────────── */
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getCurrentMonday(): string {
  const now = new Date();
  return formatDateStr(getMonday(now));
}

function shiftWeek(mondayStr: string, delta: number): string {
  const d = new Date(mondayStr + 'T12:00:00Z');
  d.setDate(d.getDate() + 7 * delta);
  return formatDateStr(d);
}

function formatShortDate(dayStr: string): string {
  const d = new Date(dayStr + 'T12:00:00Z');
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function formatTime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

const RATING_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  MALO:      { label: 'Malo',      emoji: '😞', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  REGULAR:   { label: 'Regular',   emoji: '😐', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  BUENO:     { label: 'Bueno',     emoji: '😊', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  MUY_BUENO: { label: 'Muy Bueno', emoji: '🤩', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

/* ─── component ─────────────────────────────────────────────── */
export default function AdminWeeklyEvaluationPage() {
  const [monday, setMonday] = useState('');
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setMonday(getCurrentMonday()); }, []);

  const exportPdf = async () => {
    if (!monday || exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/weekly-evaluation/export-pdf?week=${monday}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluacion-semanal-${monday}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!monday) return;
    setLoading(true);
    setDays([]);
    try {
      const res = await fetch(`/api/admin/weekly-evaluation/summary?week=${monday}`);
      if (res.ok) {
        const data = await res.json();
        setDays(data.days ?? []);
      }
    } catch (err) {
      console.error('Error loading weekly data:', err);
    } finally {
      setLoading(false);
    }
  }, [monday]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Aggregated week totals ─────────────────────────────────
  const weekTotals = days.reduce(
    (acc, d) => {
      acc.attendance += d.attendance.length;
      acc.missingExits += d.attendance.filter(a => a.missingExit).length;
      acc.delivered += d.totalDelivered;
      acc.bracelets += d.totalTokensInBatches;
      acc.reusableSales += d.totalReusableSales;
      acc.birthdays += d.birthdays.total;
      acc.birthdaysArrived += d.birthdays.arrived;
      acc.specialGuests += d.specialGuests.total;
      acc.specialGuestsArrived += d.specialGuests.arrived;
      return acc;
    },
    { attendance: 0, missingExits: 0, delivered: 0, bracelets: 0, reusableSales: 0, birthdays: 0, birthdaysArrived: 0, specialGuests: 0, specialGuestsArrived: 0 }
  );

  // Aggregate reusable sales by group
  const weekReusableByGroup = new Map<string, { name: string; color: string | null; sales: number; prizes: Map<string, { label: string; count: number }> }>();
  for (const d of days) {
    for (const g of d.reusableGroups) {
      if (g.daySales === 0) continue;
      if (!weekReusableByGroup.has(g.id)) {
        weekReusableByGroup.set(g.id, { name: g.name, color: g.color, sales: 0, prizes: new Map() });
      }
      const wg = weekReusableByGroup.get(g.id)!;
      wg.sales += g.daySales;
      for (const p of g.prizes) {
        if (p.daySales === 0) continue;
        const existing = wg.prizes.get(p.label);
        if (existing) existing.count += p.daySales;
        else wg.prizes.set(p.label, { label: p.label, count: p.daySales });
      }
    }
  }

  // Aggregate delivered prizes across week
  const weekDeliveredMap = new Map<string, number>();
  for (const d of days) {
    for (const p of d.deliveredPrizes) {
      weekDeliveredMap.set(p.label, (weekDeliveredMap.get(p.label) || 0) + p.count);
    }
  }
  const weekDeliveredPrizes = Array.from(weekDeliveredMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const sundayStr = monday ? shiftWeek(monday, 0).replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => {
    const sun = new Date(`${y}-${m}-${d}T12:00:00Z`);
    sun.setDate(sun.getDate() + 6);
    return formatDateStr(sun);
  }) : '';

  const weekLabel = monday
    ? `${formatShortDate(monday)} — ${formatShortDate((() => { const s = new Date(monday + 'T12:00:00Z'); s.setDate(s.getDate() + 6); return formatDateStr(s); })())}`
    : '';

  return (
    <div className="space-y-6">
      {/* Header + Week Picker */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">📅 Evaluación Semanal</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setMonday(shiftWeek(monday, -1))} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">&#8592;</button>
          <span className="flex-1 min-w-[160px] max-w-[220px] text-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {weekLabel}
          </span>
          <button onClick={() => setMonday(shiftWeek(monday, 1))} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">&#8594;</button>
          <button onClick={() => setMonday(getCurrentMonday())} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">Esta semana</button>
          <button
            onClick={exportPdf}
            disabled={loading || exporting || days.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? 'Exportando...' : '📄 Exportar PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="text-slate-500 dark:text-slate-400">Cargando semana {weekLabel}...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ===== WEEKLY OVERVIEW CARDS ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard emoji="⚠️" label="Jornadas incompletas" value={weekTotals.missingExits} sub={weekTotals.missingExits > 0 ? `de ${weekTotals.attendance} registros` : 'Todo en orden'} />
            <StatCard emoji="🎁" label="Productos canjeados" value={weekTotals.delivered} sub={`con ${weekTotals.bracelets} pulseras`} />
            <StatCard emoji="🔄" label="Tokens reutilizables" value={weekTotals.reusableSales} sub={`veces escaneados`} />
            <StatCard emoji="🎂" label="Cumpleaños" value={`${weekTotals.birthdaysArrived} de ${weekTotals.birthdays}`} />
            <StatCard emoji="🎟️" label="Inv. especiales" value={weekTotals.specialGuests} sub={`${weekTotals.specialGuestsArrived} llegaron`} />
          </div>

          {/* ===== WEEKLY DELIVERED PRIZES ===== */}
          {weekDeliveredPrizes.length > 0 && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3">🎰 Premios entregados esta semana — {weekTotals.delivered}</h3>
              <div className="flex flex-wrap gap-2">
                {weekDeliveredPrizes.map(p => (
                  <span key={p.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                    {p.label} <strong className="text-emerald-600 dark:text-emerald-400">×{p.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ===== WEEKLY REUSABLE SALES ===== */}
          {weekTotals.reusableSales > 0 && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">🔄 Ventas reutilizables esta semana — {weekTotals.reusableSales}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from(weekReusableByGroup.values()).sort((a, b) => b.sales - a.sales).map(g => (
                  <div key={g.name} className="rounded-lg border border-slate-200 dark:border-slate-600 p-3" style={g.color ? { borderLeftColor: g.color, borderLeftWidth: '4px' } : {}}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate">{g.name}</span>
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{g.sales} ventas</span>
                    </div>
                    <div className="space-y-0.5">
                      {Array.from(g.prizes.values()).sort((a, b) => b.count - a.count).map(p => (
                        <div key={p.label} className="flex items-center justify-between text-xs">
                          <span className="truncate text-slate-600 dark:text-slate-400">{p.label}</span>
                          <span className="font-medium text-purple-600 dark:text-purple-400 ml-1">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== DAILY BREAKDOWN ===== */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Desglose diario</h2>
            {days.map((d, idx) => {
              const isExpanded = expandedDay === d.day;
              const hasActivity = d.attendance.length > 0 || d.totalDelivered > 0 || d.totalReusableSales > 0;
              const missingExits = d.attendance.filter(a => a.missingExit).length;

              return (
                <div key={d.day} className={`rounded-xl border ${hasActivity ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-60'} bg-white dark:bg-slate-800 overflow-hidden`}>
                  {/* Day header — always visible */}
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : d.day)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-8">{DAY_NAMES[idx]}</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 w-20">{formatShortDate(d.day)}</span>
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                      {d.attendance.length > 0 && <MiniPill emoji="👥" value={d.attendance.length} />}
                      {d.totalDelivered > 0 && <MiniPill emoji="🎁" value={`${d.totalDelivered}/${d.totalTokensInBatches}`} />}
                      {d.totalReusableSales > 0 && <MiniPill emoji="🔄" value={d.totalReusableSales} />}
                      {d.birthdays.total > 0 && <MiniPill emoji="🎂" value={`${d.birthdays.arrived}/${d.birthdays.total}`} />}
                      {d.specialGuests.total > 0 && <MiniPill emoji="🎟️" value={`${d.specialGuests.arrived}/${d.specialGuests.total}`} />}
                      {missingExits > 0 && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">⚠ {missingExits} sin salida</span>}
                      {!hasActivity && <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sin actividad</span>}
                    </div>
                    {d.evaluation?.rating && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RATING_MAP[d.evaluation.rating]?.color ?? ''}`}>
                        {RATING_MAP[d.evaluation.rating]?.emoji} {RATING_MAP[d.evaluation.rating]?.label}
                      </span>
                    )}
                    <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Evaluation comment — always visible */}
                  {d.evaluation?.comment && (
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">💬 {d.evaluation.comment}</p>
                    </div>
                  )}

                  {/* Expanded detail */}
                  {isExpanded && hasActivity && (
                    <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-4 space-y-4">
                      {/* Attendance */}
                      {d.attendance.length > 0 && (
                        <section>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Asistencia — {d.attendance.length} colaboradores</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                  <th className="text-left py-1.5 px-1 text-slate-500">Nombre</th>
                                  <th className="text-left py-1.5 px-1 text-slate-500">Área</th>
                                  <th className="text-center py-1.5 px-1 text-slate-500">Entrada</th>
                                  <th className="text-center py-1.5 px-1 text-slate-500">Salida</th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.attendance.map(a => (
                                  <tr key={a.person.id} className="border-b border-slate-50 dark:border-slate-800">
                                    <td className="py-1 px-1 font-medium">{a.person.name}</td>
                                    <td className="py-1 px-1 text-slate-500">{a.person.area || '-'}</td>
                                    <td className="py-1 px-1 text-center">{formatTime(a.firstIn)}</td>
                                    <td className="py-1 px-1 text-center">
                                      {a.missingExit
                                        ? <span className="text-amber-600 dark:text-amber-400 font-medium">Sin salida</span>
                                        : formatTime(a.lastOut)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}

                      {/* Delivered prizes */}
                      {d.deliveredPrizes.length > 0 && (
                        <section>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Premios entregados — {d.totalDelivered}</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {d.deliveredPrizes.map(p => (
                              <span key={p.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                                {p.label} <strong>×{p.count}</strong>
                              </span>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Reusable sales */}
                      {d.totalReusableSales > 0 && (
                        <section>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ventas reutilizables — {d.totalReusableSales}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {d.reusableGroups.filter(g => g.daySales > 0).map(g => (
                              <div key={g.id} className="rounded-lg border border-slate-200 dark:border-slate-600 p-2" style={g.color ? { borderLeftColor: g.color, borderLeftWidth: '3px' } : {}}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium truncate">{g.name}</span>
                                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">{g.daySales}</span>
                                </div>
                                {g.prizes.filter(p => p.daySales > 0).map(p => (
                                  <div key={p.label} className="flex items-center justify-between text-[10px]">
                                    <span className="truncate text-slate-500 dark:text-slate-400">{p.label}</span>
                                    <span className="text-purple-600 dark:text-purple-400 font-medium ml-1">{p.daySales}</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Birthdays */}
                      {d.birthdays.total > 0 && (
                        <section>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Cumpleaños — {d.birthdays.total} ({d.birthdays.arrived} llegaron, {d.birthdays.arrivedGuests}/{d.birthdays.totalGuests} inv.)
                          </h4>
                          <div className="space-y-1">
                            {d.birthdays.reservations.map(r => (
                              <div key={r.id} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-pink-50 dark:bg-pink-900/10">
                                <span className="font-medium text-pink-700 dark:text-pink-300 w-10 text-center">{r.timeSlot}</span>
                                <span className="truncate flex-1">{r.celebrantName}</span>
                                <span className="text-slate-500">{r.guestArrivals}/{r.guestsPlanned} inv.</span>
                                {r.hostArrived
                                  ? <span className="text-green-600 dark:text-green-400 text-[10px] font-medium">✅</span>
                                  : <span className="text-amber-600 dark:text-amber-400 text-[10px] font-medium">⏳</span>}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Special guests */}
                      {d.specialGuests.total > 0 && (
                        <section>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Invitados especiales — {d.specialGuests.total} ({d.specialGuests.arrived} llegaron)</h4>
                          <div className="space-y-1">
                            {d.specialGuests.events.map(ev => (
                              <div key={ev.id} className="text-xs text-violet-700 dark:text-violet-300">
                                {ev.name} ({ev.timeSlot}) — {ev.arrivedGuests}/{ev.totalGuests} llegaron
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Evaluation */}
                      {d.evaluation && (
                        <section>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Evaluación</h4>
                          <div className="flex items-center gap-2">
                            {d.evaluation.rating ? (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${RATING_MAP[d.evaluation.rating]?.color ?? ''}`}>
                                {RATING_MAP[d.evaluation.rating]?.emoji} {RATING_MAP[d.evaluation.rating]?.label}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Sin calificar</span>
                            )}
                            {d.evaluation.closedAt && <span className="text-[10px] text-slate-400">🔒 Cerrada</span>}
                          </div>
                          {d.evaluation.comment && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{d.evaluation.comment}</p>}
                        </section>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────── */
function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center">
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniPill({ emoji, value }: { emoji: string; value: number | string }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
      {emoji} {value}
    </span>
  );
}
