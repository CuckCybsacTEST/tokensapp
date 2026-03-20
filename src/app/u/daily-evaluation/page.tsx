'use client';

import React, { useState, useEffect, useCallback } from 'react';

type Rating = 'MALO' | 'REGULAR' | 'BUENO' | 'MUY_BUENO';

interface PersonInfo {
  id: string;
  name: string;
  code: string;
  area: string | null;
}

interface AttendanceEntry {
  person: PersonInfo;
  firstIn: string | null;
  lastOut: string | null;
  missingExit: boolean;
}

interface DeliveredPrize {
  label: string;
  count: number;
}

interface DayPrize {
  id: string;
  label: string;
}

interface ReusableGroupPrize {
  label: string;
  total: number;
  daySales: number;
}

interface ReusableGroup {
  id: string;
  name: string;
  color: string | null;
  totalTokens: number;
  activeTokens: number;
  daySales: number;
  prizes: ReusableGroupPrize[];
}

interface SummaryData {
  attendance: AttendanceEntry[];
  deliveredPrizes: DeliveredPrize[];
  totalDelivered: number;
  dayPrizes: DayPrize[];
  totalTokensInBatches: number;
  birthdays: {
    total: number;
    arrived: number;
    totalGuests: number;
    arrivedGuests: number;
    reservations: {
      id: string;
      celebrantName: string;
      timeSlot: string;
      status: string;
      guestsPlanned: number;
      guestArrivals: number;
      hostArrived: boolean;
      packName: string | null;
    }[];
  };
  specialGuests: {
    total: number;
    arrived: number;
    lastArrivalAt: string | null;
    events: {
      id: string;
      name: string;
      timeSlot: string;
      totalGuests: number;
      arrivedGuests: number;
    }[];
    guests: {
      id: string;
      guestName: string;
      guestCategory: string | null;
      status: string;
      arrivedAt: string | null;
      eventName: string;
      eventTime: string;
    }[];
  };
  reusableGroups: ReusableGroup[];
}

interface DailyEvaluation {
  id: string;
  businessDay: string;
  rating: Rating | null;
  comment: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  closedByName?: string | null;
  evaluatedByName?: string | null;
}

interface PersonRating {
  id: string;
  personId: string;
  rating: Rating;
  note: string | null;
  person: PersonInfo;
}

const RATING_OPTIONS: { value: Rating; label: string; color: string; emoji: string }[] = [
  { value: 'MALO', label: 'Malo', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700', emoji: '😞' },
  { value: 'REGULAR', label: 'Regular', color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700', emoji: '😐' },
  { value: 'BUENO', label: 'Bueno', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700', emoji: '😊' },
  { value: 'MUY_BUENO', label: 'Muy Bueno', color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700', emoji: '🤩' },
];

function getRatingOption(val: Rating) {
  return RATING_OPTIONS.find(r => r.value === val) || RATING_OPTIONS[1];
}

function formatTime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function toLimaDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

function getBusinessDay(): string {
  const now = new Date();
  const limaHour = Number(now.toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }));
  const d = limaHour < 10 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
  return toLimaDateStr(d);
}

function shiftDay(dayStr: string, delta: number): string {
  const d = new Date(dayStr + 'T12:00:00Z');
  d.setDate(d.getDate() + delta);
  return toLimaDateStr(d);
}

export default function DailyEvaluationPage() {
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [userArea, setUserArea] = useState<string>('');
  const [modalGroup, setModalGroup] = useState<ReusableGroup | null>(null);

  // Data for selected day
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [evaluation, setEvaluation] = useState<DailyEvaluation | null>(null);
  const [dayBrief, setDayBrief] = useState<{ title?: string | null; show?: string | null; promos?: string | null; notes?: string | null } | null>(null);

  // Fetch user role once
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setUserRole(d.role); if (d?.area) setUserArea(d.area); })
      .catch(() => {});
  }, []);

  // Form state
  const [evalRating, setEvalRating] = useState<Rating>('REGULAR');
  const [evalComment, setEvalComment] = useState('');
  const [personRatingsMap, setPersonRatingsMap] = useState<Map<string, { rating: Rating; note: string }>>(new Map());
  const [savingEval, setSavingEval] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [evalMsg, setEvalMsg] = useState('');
  const [ratingsMsg, setRatingsMsg] = useState('');
  const [closeMsg, setCloseMsg] = useState('');
  const [ratingsLocked, setRatingsLocked] = useState(false);

  // Initialize to today's business day
  useEffect(() => {
    setSelectedDay(getBusinessDay());
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedDay) return;
    setLoading(true);
    setSummary(null);
    setEvaluation(null);
    setDayBrief(null);
    setEvalRating('REGULAR');
    setEvalComment('');
    setPersonRatingsMap(new Map());
    setRatingsLocked(false);
    try {
      const [summaryRes, evalRes, ratingsRes, briefRes] = await Promise.all([
        fetch(`/api/admin/daily-evaluation/summary?day=${selectedDay}`),
        fetch(`/api/admin/daily-evaluation?day=${selectedDay}`),
        fetch(`/api/admin/daily-evaluation/ratings?day=${selectedDay}`),
        fetch(`/api/admin/day-brief?day=${selectedDay}`),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        if (evalData.evaluation) {
          setEvaluation(evalData.evaluation);
          setEvalRating(evalData.evaluation.rating);
          setEvalComment(evalData.evaluation.comment || '');
        }
      }
      if (ratingsRes.ok) {
        const rData = await ratingsRes.json();
        const map = new Map<string, { rating: Rating; note: string }>();
        for (const r of (rData.ratings || []) as PersonRating[]) {
          map.set(r.personId, { rating: r.rating as Rating, note: r.note || '' });
        }
        setPersonRatingsMap(map);
        setRatingsLocked(map.size > 0);
      }
      if (briefRes.ok) {
        const bData = await briefRes.json();
        if (bData.brief) setDayBrief(bData.brief);
      }
    } catch (err) {
      console.error('Error loading daily evaluation data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize person ratings from attendance when summary loads
  useEffect(() => {
    if (!summary) return;
    setPersonRatingsMap(prev => {
      const next = new Map(prev);
      for (const a of summary.attendance) {
        if (!next.has(a.person.id)) {
          next.set(a.person.id, { rating: 'REGULAR', note: '' });
        }
      }
      return next;
    });
  }, [summary]);

  const handleCloseDay = async (action: 'close' | 'reopen') => {
    setClosingDay(true);
    setCloseMsg('');
    try {
      const res = await fetch('/api/admin/daily-evaluation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDay: selectedDay, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data.evaluation);
        setCloseMsg(action === 'close' ? 'Jornada cerrada' : 'Jornada reabierta');
      } else {
        const err = await res.json();
        setCloseMsg(err.error || 'Error');
      }
    } catch {
      setCloseMsg('Error de conexión');
    } finally {
      setClosingDay(false);
      setTimeout(() => setCloseMsg(''), 3000);
    }
  };

  const handleSaveEvaluation = async () => {
    setSavingEval(true);
    setEvalMsg('');
    try {
      const res = await fetch('/api/admin/daily-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDay: selectedDay, rating: evalRating, comment: evalComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data.evaluation);
        setEvalMsg('Evaluación guardada');
      } else {
        const err = await res.json();
        setEvalMsg(err.error || 'Error al guardar');
      }
    } catch {
      setEvalMsg('Error de conexión');
    } finally {
      setSavingEval(false);
      setTimeout(() => setEvalMsg(''), 3000);
    }
  };

  const handleSaveRatings = async () => {
    setSavingRatings(true);
    setRatingsMsg('');
    try {
      const ratings = Array.from(personRatingsMap.entries()).map(([personId, data]) => ({
        personId,
        rating: data.rating,
        note: data.note || undefined,
      }));
      const res = await fetch('/api/admin/daily-evaluation/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDay: selectedDay, ratings }),
      });
      if (res.ok) {
        setRatingsLocked(true);
        setRatingsMsg('Calificaciones guardadas');
      } else {
        const err = await res.json();
        setRatingsMsg(err.error || 'Error al guardar');
      }
    } catch {
      setRatingsMsg('Error de conexión');
    } finally {
      setSavingRatings(false);
      setTimeout(() => setRatingsMsg(''), 3000);
    }
  };

  const updatePersonRating = (personId: string, field: 'rating' | 'note', value: string) => {
    setPersonRatingsMap(prev => {
      const next = new Map(prev);
      const existing = next.get(personId) || { rating: 'REGULAR' as Rating, note: '' };
      if (field === 'rating') {
        next.set(personId, { ...existing, rating: value as Rating });
      } else {
        next.set(personId, { ...existing, note: value });
      }
      return next;
    });
  };

  const isToday = selectedDay === getBusinessDay();
  const isFutureDay = selectedDay > getBusinessDay();
  const isClosed = !!evaluation?.closedAt;
  const canManage = ['ADMIN', 'COORDINATOR'].includes(userRole);
  const canClose = ['ADMIN', 'COORDINATOR'].includes(userRole);
  const isEvalFinalized = !!evaluation?.rating;
  const isMultimedia = userArea.toUpperCase() === 'MULTIMEDIA';
  const isSecurity = userArea.toUpperCase() === 'SEGURIDAD';

  // Modal detail sections state
  const [modalSection, setModalSection] = useState<string | null>(null);

  // QR's Disponibles section (reusable)
  const qrSection = summary && summary.reusableGroups && summary.reusableGroups.length > 0 ? (
    <>
      <div className="relative flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
          🔄 QR&apos;s Disponibles
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {summary.reusableGroups.map(g => (
            <button
              key={g.id}
              onClick={() => setModalGroup(g)}
              className="relative rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-600"
            >
              <div className="flex items-center gap-1.5 mb-1">
                {g.color && (
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                )}
                <span className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{g.name}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{g.daySales}</div>
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Utilizados</div>
              {g.totalTokens > 0 && (
                <div className="text-[10px] text-teal-600 dark:text-teal-400 mt-1">{g.totalTokens} tokens en grupo</div>
              )}
            </button>
        ))}
      </div>
    </>
  ) : null;

  // Special Guests section (reusable)
  const specialGuestsSection = summary ? (
    <>
      <div className="relative flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-violet-200 dark:bg-violet-700" />
        <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
          🎟️ Invitados Especiales
        </span>
        <div className="flex-1 h-px bg-violet-200 dark:bg-violet-700" />
      </div>

      <button
        onClick={() => setModalSection('guests')}
        className="w-full relative rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-600"
      >
        <div className="flex items-center gap-3">
          <div className="text-xl sm:text-2xl">🎟️</div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{summary.specialGuests?.total ?? 0}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Invitados</div>
          </div>
          {summary.specialGuests && summary.specialGuests.total > 0 && (
            <div className="ml-auto text-[10px] text-violet-600 dark:text-violet-400">{summary.specialGuests.arrived} llegaron</div>
          )}
        </div>
      </button>

      {summary.specialGuests && summary.specialGuests.total > 0 && (
        <button
          onClick={() => setModalSection('guests')}
          className="w-full relative rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md border-violet-200 dark:border-violet-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 hover:shadow-violet-100 dark:hover:shadow-none"
        >
          <div className="flex items-center gap-3">
            <div className="text-xl sm:text-2xl">✅</div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-violet-800 dark:text-violet-200">{summary.specialGuests.arrived}/{summary.specialGuests.total}</div>
              <div className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400 font-medium">Invitados llegaron</div>
            </div>
          </div>
        </button>
      )}

      {modalSection === 'guests' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalSection(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                🎟️ Invitados Especiales — {summary.specialGuests?.total ?? 0}
              </h3>
              <button onClick={() => setModalSection(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <span className="text-lg text-slate-400">&times;</span>
              </button>
            </div>
            {summary.specialGuests && summary.specialGuests.total > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {summary.specialGuests.arrived} llegaron
              </div>
            )}
            {!summary.specialGuests || summary.specialGuests.total === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No hay invitados especiales para este día.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {summary.specialGuests.events.map(ev => (
                  <div key={ev.id} className="text-[10px] sm:text-xs font-medium text-violet-700 dark:text-violet-300 px-1">
                    {ev.name} ({ev.timeSlot}) — {ev.arrivedGuests}/{ev.totalGuests}
                  </div>
                ))}
                {summary.specialGuests.guests.map(g => (
                  <div key={g.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-50 dark:bg-violet-900/10">
                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 flex-shrink-0 w-10 text-center">{g.eventTime}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{g.guestName}</div>
                      <div className="text-[10px] text-slate-500">{g.eventName}{g.guestCategory ? ` · ${g.guestCategory}` : ''}</div>
                    </div>
                    <div className="flex-shrink-0">
                      {g.status === 'arrived' ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">✅ {formatTime(g.arrivedAt)}</span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">⏳</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  ) : null;

  // Birthdays section (reusable to avoid duplication)
  const birthdaysSection = summary ? (
    <>
      <div className="relative flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-pink-200 dark:bg-pink-700" />
        <span className="flex items-center gap-1.5 text-xs font-semibold text-pink-700 dark:text-pink-400 uppercase tracking-wider">
          🎂 Cumpleaños
        </span>
        <div className="flex-1 h-px bg-pink-200 dark:bg-pink-700" />
      </div>

      <button
        onClick={() => setModalSection('birthdays')}
        className="w-full relative rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-600"
      >
        <div className="flex items-center gap-3">
          <div className="text-xl sm:text-2xl">🎂</div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{summary.birthdays?.total ?? 0}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Reservas</div>
          </div>
          {summary.birthdays && summary.birthdays.total > 0 && (
            <div className="ml-auto text-right">
              <div className="text-[10px] text-pink-600 dark:text-pink-400">{summary.birthdays.arrived} llegaron</div>
              <div className="text-[10px] text-slate-500">{summary.birthdays.arrivedGuests}/{summary.birthdays.totalGuests} invitados</div>
            </div>
          )}
        </div>
      </button>

      {/* Tarjeta: Cumpleañeros que llegaron */}
      {summary.birthdays && summary.birthdays.total > 0 && (
        <button
          onClick={() => setModalSection('birthdays')}
          className="w-full relative rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md border-pink-200 dark:border-pink-700 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/10 dark:to-rose-900/10 hover:shadow-pink-100 dark:hover:shadow-none"
        >
          <div className="flex items-center gap-3">
            <div className="text-xl sm:text-2xl">✅</div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-pink-800 dark:text-pink-200">{summary.birthdays.arrived}/{summary.birthdays.total}</div>
              <div className="text-[10px] sm:text-xs text-pink-600 dark:text-pink-400 font-medium">Cumpleañeros llegaron</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[10px] text-pink-600 dark:text-pink-400">{summary.birthdays.arrivedGuests}/{summary.birthdays.totalGuests} invitados</div>
            </div>
          </div>
        </button>
      )}

      {modalSection === 'birthdays' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalSection(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-pink-200 dark:border-pink-700 bg-white dark:bg-slate-800 p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                🎂 Cumpleaños — {summary.birthdays?.total ?? 0} reservas
              </h3>
              <button onClick={() => setModalSection(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <span className="text-lg text-slate-400">&times;</span>
              </button>
            </div>
            {summary.birthdays && summary.birthdays.total > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {summary.birthdays.arrived} llegaron · {summary.birthdays.arrivedGuests}/{summary.birthdays.totalGuests} invitados
              </div>
            )}
            {!summary.birthdays || summary.birthdays.total === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No hay reservas de cumpleaños para este día.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {summary.birthdays.reservations.map(r => (
                  <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-pink-50 dark:bg-pink-900/10">
                    <span className="text-xs font-semibold text-pink-700 dark:text-pink-300 flex-shrink-0 w-10 text-center">{r.timeSlot}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{r.celebrantName}</div>
                      {r.packName && <div className="text-[10px] text-slate-500">{r.packName}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-slate-500">{r.guestArrivals}/{r.guestsPlanned}</span>
                      {r.hostArrived ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">✅</span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">⏳</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  ) : null;

  return (
    <div className="space-y-4">
      {/* Header compacto con date picker inline */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
          {isToday ? '📋' : '📊'} Resumen
        </h1>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setSelectedDay(shiftDay(selectedDay, -1))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            &#8592;
          </button>
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
            className="w-[130px] sm:w-[160px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setSelectedDay(shiftDay(selectedDay, 1))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            &#8594;
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDay(getBusinessDay())}
              className="px-2 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Status badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{selectedDay}</span>
        {isClosed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-500">
            🔒 Cerrada
          </span>
        )}
        {evaluation?.rating && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRatingOption(evaluation.rating as Rating).color}`}>
            {getRatingOption(evaluation.rating as Rating).emoji} {getRatingOption(evaluation.rating as Rating).label}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ====== BRIEF DEL DÍA (siempre primero) ====== */}
          {dayBrief && (dayBrief.title || dayBrief.show || dayBrief.promos || dayBrief.notes) && (
            <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/10 dark:to-sky-900/10 p-3 sm:p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">Brief del Día</h3>
              </div>
              {dayBrief.title && (
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{dayBrief.title}</p>
              )}
              {dayBrief.show && (
                <div>
                  <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">🎤 Shows / Eventos</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {dayBrief.show.split(/\n|;|•/).filter(Boolean).map((s, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dayBrief.promos && (
                <div>
                  <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">🏷️ Promos</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {dayBrief.promos.split(/\n|;|•/).filter(Boolean).map((p, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                        {p.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dayBrief.notes && (
                <div>
                  <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">📋 Notas</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-line">{dayBrief.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ====== SECCIONES ORDENADAS POR ÁREA ====== */}
          {/* Multimedia: QR's → Cumpleaños → Ruleta → Invitados */}
          {/* Seguridad:  Cumpleaños → Invitados → Ruleta → QR's */}
          {/* Default:    Ruleta → Cumpleaños → Invitados → QR's */}

          {isMultimedia && qrSection}
          {(isMultimedia || isSecurity) && birthdaysSection}
          {isSecurity && specialGuestsSection}

          {/* ====== SECCIÓN: RULETA ====== */}
          {summary && (
            <>
              <div className="relative flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-amber-200 dark:bg-amber-700" />
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  🎰 Ruleta
                </span>
                <div className="flex-1 h-px bg-amber-200 dark:bg-amber-700" />
              </div>

              <button
                onClick={() => setModalSection('dayPrizes')}
                className="w-full rounded-xl border border-amber-200 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-3 sm:p-4 text-left transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl sm:text-2xl">🎰</div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-amber-800 dark:text-amber-200">{summary.dayPrizes.length}</div>
                    <div className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400 font-medium">Premios asignados</div>
                  </div>
                  {summary.totalTokensInBatches > 0 && (
                    <div className="ml-auto text-[10px] text-amber-600 dark:text-amber-400">{summary.totalTokensInBatches} pulseras</div>
                  )}
                </div>
              </button>

              {/* Day Prizes Modal */}
              {modalSection === 'dayPrizes' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalSection(null)}>
                  <div className="w-full max-w-sm rounded-2xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        🎰 Premios asignados — {summary.dayPrizes.length}
                      </h3>
                      <button onClick={() => setModalSection(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-lg text-slate-400">&times;</span>
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      {summary.totalTokensInBatches} pulseras en lotes activos
                    </div>
                    {summary.dayPrizes.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No hay premios configurados en la ruleta para este día.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto">
                        {summary.dayPrizes.map(p => (
                          <div key={p.id} className="flex items-center p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                            <span className="text-xs font-medium">🎁 {p.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stat card: Premios Entregados */}
              <button
                onClick={() => setModalSection('prizes')}
                className="w-full relative rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl sm:text-2xl">🎁</div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{summary.totalDelivered}/{summary.totalTokensInBatches}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Pulseras canjeadas</div>
                  </div>
                </div>
              </button>

              {/* Prizes Modal */}
              {modalSection === 'prizes' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalSection(null)}>
                  <div className="w-full max-w-sm rounded-2xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        🎁 Premios Entregados — {summary.totalDelivered}
                      </h3>
                      <button onClick={() => setModalSection(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-lg text-slate-400">&times;</span>
                      </button>
                    </div>
                    {summary.deliveredPrizes.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{isToday ? 'Sin premios entregados aún.' : 'No se entregaron premios.'}</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto">
                        {summary.deliveredPrizes.map(p => (
                          <div key={p.label} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                            <span className="text-xs font-medium">{p.label}</span>
                            <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">{p.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ====== CUMPLEAÑOS (para áreas que no lo mostraron arriba) ====== */}
          {!isMultimedia && !isSecurity && birthdaysSection}

          {/* ====== INVITADOS ESPECIALES (para áreas que no lo mostraron arriba) ====== */}
          {!isSecurity && specialGuestsSection}

          {/* ====== SECCIÓN: COLABORADORES (solo ADMIN/COORDINATOR) ====== */}
          {canManage && summary && (
            <>
              <div className="relative flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-blue-200 dark:bg-blue-700" />
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  👥 Colaboradores Presentes
                </span>
                <div className="flex-1 h-px bg-blue-200 dark:bg-blue-700" />
              </div>

              <button
                onClick={() => setModalSection('attendance')}
                className="w-full relative rounded-xl border p-3 sm:p-4 text-left transition-all hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl sm:text-2xl">👥</div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{summary.attendance.length}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Presentes</div>
                  </div>
                  {summary.attendance.filter(a => a.missingExit).length > 0 && (
                    <div className="ml-auto text-[10px] text-amber-600 dark:text-amber-400">{summary.attendance.filter(a => a.missingExit).length} sin salida</div>
                  )}
                </div>
              </button>

              {/* Attendance Modal */}
              {modalSection === 'attendance' && summary.attendance.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalSection(null)}>
                  <div className="w-full max-w-md rounded-2xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        👥 Colaboradores — {summary.attendance.length} presentes
                      </h3>
                      <button onClick={() => setModalSection(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="text-lg text-slate-400">&times;</span>
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                      {summary.attendance.map(a => (
                        <div key={a.person.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{a.person.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{a.person.area || '-'} · {formatTime(a.firstIn)} → {formatTime(a.lastOut)}</div>
                          </div>
                          <div className="flex-shrink-0">
                            {a.missingExit ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Sin salida</span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">OK</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ====== QR's DISPONIBLES (para áreas que no lo mostraron arriba) ====== */}
          {!isMultimedia && qrSection}

          {/* Modal for reusable group detail (shared) */}
          {modalGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalGroup(null)}>
              <div className="w-full max-w-sm rounded-2xl border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {modalGroup.color && (
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: modalGroup.color }} />
                    )}
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {modalGroup.name}
                    </h3>
                  </div>
                  <button onClick={() => setModalGroup(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="text-lg text-slate-400">&times;</span>
                  </button>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {modalGroup.daySales} utilizado{modalGroup.daySales !== 1 ? 's' : ''} · {modalGroup.totalTokens} tokens en grupo
                </div>
                <a href="/u/reusable-tokens" className="inline-flex items-center gap-1 px-3 py-1.5 mb-3 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors">
                  Ver QR&apos;s
                </a>
                {modalGroup.prizes.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sin premios configurados.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto">
                    {modalGroup.prizes.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/10">
                        <span className="text-xs font-medium">{p.label}</span>
                        <span className="font-bold text-xs text-teal-700 dark:text-teal-300">{p.daySales}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== CLOSE DAY SECTION ===== */}
          {canClose && !isFutureDay && (
          <>
          <div className="relative flex items-center gap-3 pt-3">
            <div className="flex-1 h-px bg-red-200 dark:bg-red-800" />
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
              🔒 Cierre de Jornada
            </span>
            <div className="flex-1 h-px bg-red-200 dark:bg-red-800" />
          </div>
          {!isClosed ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 text-center space-y-2">
              <div className="text-2xl">🔓</div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Jornada Abierta</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Cierra la jornada cuando termine el día operativo.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => handleCloseDay('close')}
                  disabled={closingDay}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {closingDay ? 'Cerrando...' : '🔒 Cerrar Jornada'}
                </button>
              </div>
              {closeMsg && (
                <p className={`text-sm font-medium ${closeMsg.includes('Error') || closeMsg.includes('Solo') ? 'text-red-600' : 'text-green-600'}`}>
                  {closeMsg}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Closed status — no reopen from /u, only from /admin */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-center space-y-1">
                <div className="text-2xl">🔒</div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Jornada Cerrada</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cerrada el {new Date(evaluation!.closedAt!).toLocaleString('es-PE')}
                  {evaluation?.closedByName && <> por <span className="font-medium text-slate-700 dark:text-slate-300">{evaluation.closedByName}</span></>}
                </p>
                {evaluation?.rating && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Evaluación: <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRatingOption(evaluation.rating as Rating).color}`}>
                      {getRatingOption(evaluation.rating as Rating).emoji} {getRatingOption(evaluation.rating as Rating).label}
                    </span>
                    {evaluation.evaluatedByName && <> por {evaluation.evaluatedByName}</>}
                  </p>
                )}
                {evaluation?.comment && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">&ldquo;{evaluation.comment}&rdquo;</p>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Solo un administrador puede reabrir la jornada.</p>
              </div>

              {/* ===== EVALUATION FORMS (only ADMIN/COORDINATOR) ===== */}
              {canManage && (
              <>
              {/* ===== EVALUATION GENERAL ===== */}
              {isEvalFinalized ? (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-3 sm:p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Evaluación General de la Jornada
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border ${getRatingOption(evaluation!.rating!).color}`}>
                      {getRatingOption(evaluation!.rating!).emoji} {getRatingOption(evaluation!.rating!).label}
                    </span>
                    {evaluation?.evaluatedByName && (
                      <span className="text-xs text-slate-500">por {evaluation.evaluatedByName}</span>
                    )}
                  </div>
                  {evaluation?.comment && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">&ldquo;{evaluation.comment}&rdquo;</p>
                  )}
                  <p className="text-xs text-green-600 dark:text-green-400">✅ Evaluación finalizada. Para editar, reabra la jornada desde el panel admin.</p>
                </div>
              ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Evaluación General de la Jornada
                </h3>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {RATING_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEvalRating(opt.value)}
                      className={`px-3 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                        evalRating === opt.value
                          ? opt.color + ' ring-2 ring-offset-1 ring-blue-400'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                      }`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Comentario / Observaciones
                  </label>
                  <textarea
                    value={evalComment}
                    onChange={(e) => setEvalComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notas sobre la jornada..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={handleSaveEvaluation}
                    disabled={savingEval}
                    className="w-full sm:w-auto px-5 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingEval ? 'Guardando...' : 'Guardar Evaluación General'}
                  </button>
                  {evalMsg && (
                    <span className={`text-xs sm:text-sm font-medium text-center sm:text-left ${evalMsg.includes('Error') || evalMsg.includes('debe') || evalMsg.includes('finalizada') ? 'text-red-600' : 'text-green-600'}`}>
                      {evalMsg}
                    </span>
                  )}
                </div>
              </div>
              )}

              {/* ===== INDIVIDUAL RATINGS ===== */}
              {summary && summary.attendance.length > 0 && (
                ratingsLocked ? (
                  <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-3 sm:p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Evaluación Individual — {summary.attendance.length} colaboradores
                    </h3>
                    <div className="space-y-1.5">
                      {summary.attendance.map(a => {
                        const pr = personRatingsMap.get(a.person.id) || { rating: 'REGULAR' as Rating, note: '' };
                        return (
                          <div key={a.person.id} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/50">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{a.person.name}</div>
                              <div className="text-xs text-slate-500">{a.person.area || '-'}</div>
                              {pr.note && <div className="text-xs text-slate-500 italic mt-0.5">{pr.note}</div>}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRatingOption(pr.rating).color}`}>
                              {getRatingOption(pr.rating).emoji} {getRatingOption(pr.rating).label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">✅ Calificaciones guardadas. Para editar, reabra la jornada desde el panel admin.</p>
                  </div>
                ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Evaluación Individual — {summary.attendance.length} colaboradores
                  </h3>

                  <div className="space-y-2">
                    {summary.attendance.map(a => {
                      const pr = personRatingsMap.get(a.person.id) || { rating: 'REGULAR' as Rating, note: '' };
                      return (
                        <div key={a.person.id} className="flex flex-col gap-2 p-2.5 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <div className="flex items-start sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{a.person.name}</div>
                              <div className="text-xs text-slate-500">{a.person.area || '-'} · {formatTime(a.firstIn)} - {formatTime(a.lastOut)}</div>
                              {a.missingExit && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ Sin salida</span>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {RATING_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updatePersonRating(a.person.id, 'rating', opt.value)}
                                  className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-2 sm:py-1 flex items-center justify-center rounded text-xs font-medium border transition-all ${
                                    pr.rating === opt.value
                                      ? opt.color + ' ring-1 ring-blue-400'
                                      : 'bg-white dark:bg-slate-600 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-500 hover:bg-slate-100'
                                  }`}
                                  title={opt.label}
                                >
                                  {opt.emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={pr.note}
                            onChange={(e) => updatePersonRating(a.person.id, 'note', e.target.value)}
                            placeholder="Nota..."
                            className="w-full rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={handleSaveRatings}
                      disabled={savingRatings}
                      className="w-full sm:w-auto px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {savingRatings ? 'Guardando...' : 'Guardar Calificaciones'}
                    </button>
                    {ratingsMsg && (
                      <span className={`text-xs sm:text-sm font-medium text-center sm:text-left ${ratingsMsg.includes('Error') || ratingsMsg.includes('guardadas') ? 'text-red-600' : 'text-green-600'}`}>
                        {ratingsMsg}
                      </span>
                    )}
                  </div>
                </div>
                )
              )}
            </>
          )}
          </>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
}
