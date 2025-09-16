"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../../globals.css";

type Mode = "IN" | "OUT";
type Recent = { scannedAt?: string; type?: Mode } | null;

function ymdUtc(date: Date): string { return date.toISOString().slice(0,10); }

function ensureDeviceId(): string {
  try {
    const key = "scannerDeviceId";
    let v = localStorage.getItem(key);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(key, v); }
    return v;
  } catch { return "manual"; }
}

export default function ManualAttendancePage() {
  const [me, setMe] = useState<{ username: string; personName?: string } | null>(null);
  const [recent, setRecent] = useState<Recent>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ variant: "success" | "error"; text: string } | null>(null);

  const nextAction: Mode = useMemo(() => {
    const t = recent?.type;
    if (t === "IN") return "OUT"; // si ya marcó entrada, ofrecer salida
    return "IN"; // por defecto entrada
  }, [recent]);

  useEffect(() => {
    (async () => {
      // Verificar sesión; si no está, redirigir a login
      try {
        const r = await fetch('/api/user/me', { cache: 'no-store' });
        if (r.status === 401) { window.location.href = '/u/login?next=' + encodeURIComponent('/u/manual'); return; }
        const j = await r.json();
        if (r.ok && j?.ok) setMe({ username: j.user.username, personName: j.user.personName });
      } catch {}
      // Reciente para sugerir acción
      try {
        const r2 = await fetch('/api/attendance/me/recent', { cache: 'no-store' });
        const j2 = await r2.json().catch(() => ({}));
        setRecent((j2?.recent ?? null) as Recent);
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (mode == null && !loading) setMode(nextAction);
  }, [loading, nextAction, mode]);

  const handleSubmit = async () => {
    if (!mode) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const deviceId = ensureDeviceId();
      const res = await fetch('/api/attendance/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode, deviceId }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setMsg({ variant: 'success', text: `${mode === 'IN' ? 'Entrada' : 'Salida'} registrada correctamente.` });
        // redirigir como el escáner
        const day = ymdUtc(new Date());
        setTimeout(() => {
          if (mode === 'IN') window.location.href = `/u/checklist?day=${day}&mode=IN`;
          else window.location.href = `/u/closed?day=${day}`;
        }, 700);
      } else {
        let code = String(json?.code || 'ERROR');
        if (code === 'DUPLICATE') code = 'REPLAY';
        const human = code === 'REPLAY' ? 'Intento duplicado (<10s)' :
                       code === 'PERSON_INACTIVE' ? 'Persona inactiva' :
                       code === 'ALREADY_TODAY' ? 'Ya registraste esta acción hoy' :
                       code === 'NO_IN_TODAY' ? 'No puedes registrar salida sin haber registrado entrada hoy' : code;
        setMsg({ variant: 'error', text: human });
      }
    } catch (e: any) {
      setMsg({ variant: 'error', text: `Fallo de red: ${String(e?.message || e)}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Ingreso manual</h1>
          {me && <span className="text-sm text-slate-600">{me.personName ? `${me.personName} · ` : ''}{me.username}</span>}
        </div>

        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Completá el formulario para registrar tu entrada o salida sin usar la cámara.</p>

        {msg && (
          <div className={"mb-4 rounded-md border p-3 text-sm " + (msg.variant === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800')}>{msg.text}</div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">Acción</label>
            <div className="flex items-center gap-6 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="mode" checked={mode === 'IN'} onChange={() => setMode('IN')} />
                <span>Entrada</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="mode" checked={mode === 'OUT'} onChange={() => setMode('OUT')} />
                <span>Salida</span>
              </label>
            </div>
            {!loading && recent?.scannedAt && (
              <p className="mt-1 text-xs text-slate-500">Tu última marca: {new Date(recent.scannedAt!).toLocaleString()} ({recent.type === 'IN' ? 'Entrada' : 'Salida'})</p>
            )}
          </div>

          <div className="mt-4">
            <button className="btn" disabled={submitting || mode == null} onClick={handleSubmit}>
              {submitting ? 'Enviando…' : 'Registrar'}
            </button>
            <Link href="/u/scanner" className="ml-3 align-middle text-sm text-blue-600 hover:underline dark:text-blue-400">Usar escáner</Link>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Para asegurar la trazabilidad, se registra la hora actual y tu usuario. Se aplican las mismas reglas del escaneo (una entrada y una salida por día, y salida solo después de entrada).
        </div>
      </div>
    </div>
  );
}
