"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "../../globals.css";

type Mode = "IN" | "OUT";
type Recent = { scannedAt?: string; type?: Mode; businessDay?: string } | null;

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
  const [me, setMe] = useState<{ personName?: string; dni?: string } | null>(null);
  const [recent, setRecent] = useState<Recent>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ variant: "success" | "error"; text: string } | null>(null);
  const [holdMs, setHoldMs] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  // Category tab: QR or MANUAL
  const [tab, setTab] = useState<"QR" | "MANUAL">("QR");
  // Scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const processingRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
        if (r.ok && j?.ok) setMe({ personName: j.user.personName, dni: j.user.dni });
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
      const json: any = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setMsg({ variant: 'success', text: `${mode === 'IN' ? 'Entrada' : 'Salida'} registrada correctamente.` });
        // redirigir como el escáner
        const day = ymdUtc(new Date());
        setTimeout(() => {
          if (mode === 'IN') window.location.href = `/u/checklist?day=${day}&mode=IN`;
          else {
            const usp = new URLSearchParams();
            usp.set('day', day);
            if (json.scanId) usp.set('scanId', json.scanId);
            if (json.undoWindowMs) usp.set('undoMs', String(json.undoWindowMs));
            window.location.href = `/u/closed?${usp.toString()}`;
          }
        }, 700);
      } else {
        let code = String(json?.code || 'ERROR');
        if (code === 'DUPLICATE') code = 'REPLAY';
        const human = code === 'REPLAY' ? 'Intento duplicado (<10s)' :
                       code === 'PERSON_INACTIVE' ? 'Persona inactiva' :
                       code === 'ALREADY_TODAY' ? 'Ya registraste esta acción hoy' :
                       code === 'NO_IN_TODAY' ? 'No puedes registrar salida sin haber registrado entrada hoy' :
                       code === 'OUT_COOLDOWN' ? `Debes esperar ${json?.waitSeconds ?? 60}s desde tu entrada antes de registrar salida` : code;
        setMsg({ variant: 'error', text: human });
      }
    } catch (e: any) {
      setMsg({ variant: 'error', text: `Fallo de red: ${String(e?.message || e)}` });
    } finally {
      setSubmitting(false);
    }
  };

  // --- QR Scanner integration ---
  function base64UrlToJson<T = unknown>(s: string): T | null {
    try {
      const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
      const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
      const str = atob(b64);
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  }

  function decodeGlobalModeFromQr(text: string): Mode | null {
    if (!text) return null;
    const raw = String(text).trim();
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === "object" && j.kind === "GLOBAL" && (j.mode === "IN" || j.mode === "OUT")) {
        return j.mode as Mode;
      }
    } catch {}
    const j = base64UrlToJson<{ kind: "GLOBAL"; mode: Mode; v?: number }>(raw);
    if (j && j.kind === "GLOBAL" && (j.mode === "IN" || j.mode === "OUT")) return j.mode;
    const upper = raw.toUpperCase();
    if (upper === 'IN' || upper === 'OUT') return upper as Mode;
    if (upper.startsWith('GLOBAL')) {
      if (upper.includes('IN')) return 'IN';
      if (upper.includes('OUT')) return 'OUT';
    }
    try {
      const url = new URL(raw);
      const q = (url.searchParams.get('mode') || '').toUpperCase();
      if (q === 'IN' || q === 'OUT') return q as Mode;
    } catch {}
    return null;
  }

  const markViaQr = useCallback(async (m: Mode) => {
    setMsg(null);
    try {
      const deviceId = ensureDeviceId();
      const res = await fetch('/api/attendance/mark', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: m, deviceId }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setMsg({ variant: 'success', text: `${m === 'IN' ? 'Entrada' : 'Salida'} registrada correctamente.` });
        const day = ymdUtc(new Date());
        setTimeout(() => {
          if (m === 'IN') window.location.href = `/u/checklist?day=${day}&mode=IN`;
          else window.location.href = `/u/closed?day=${day}`;
        }, 600);
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
    }
  }, []);

  const onScanResult = useCallback((result: any) => {
    if (!result || processingRef.current) return;
    processingRef.current = true;
    try {
      const text = result.getText ? result.getText() : String(result);
      const m = decodeGlobalModeFromQr(text);
      if (!m) {
        setMsg({ variant: 'error', text: 'QR inválido (no es póster GLOBAL)' });
        return;
      }
      setMode(m);
      void markViaQr(m);
    } finally {
      setTimeout(() => { processingRef.current = false; }, 900);
    }
  }, [markViaQr]);

  useEffect(() => {
    if (tab !== 'QR') return;
    setCameraError(null);
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    const videoEl = videoRef.current;
    const constraints = { video: { facingMode: "environment" as const } };
    reader.decodeFromConstraints(constraints, videoEl!, (res: any) => { if (res) onScanResult(res); })
      .catch((e: unknown) => {
        const msg = typeof e === 'object' && e && 'toString' in e ? (e as any).toString() : String(e);
        setCameraError(msg || "Permiso denegado o cámara no disponible");
        setMsg({ variant: 'error', text: `No se pudo abrir la cámara: ${msg}` });
      });
    return () => {
      try { readerRef.current?.reset(); } catch {}
      try {
        const s = videoRef.current?.srcObject as MediaStream | undefined;
        s?.getTracks().forEach((t) => t.stop());
      } catch {}
    };
  }, [tab, onScanResult]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Registrar entrada/salida</h1>
          {me && (
            <span className="text-sm text-slate-600">{me.personName || 'Colaborador'}{me?.dni ? ` · DNI: ${me.dni}` : ''}</span>
          )}
        </div>

        {msg && (
          <div className={"mb-4 rounded-md border p-3 text-sm " + (msg.variant === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800')}>{msg.text}</div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <button className={("px-3 py-1 rounded border text-sm " + (tab === 'QR' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'))} onClick={() => setTab('QR')}>Escanear QR</button>
          <button className={("px-3 py-1 rounded border text-sm " + (tab === 'MANUAL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'))} onClick={() => setTab('MANUAL')}>Manual</button>
        </div>

        {tab === 'QR' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Apunta la cámara al póster GLOBAL de Entrada o Salida.</p>
            <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-black shadow-sm">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
              {mode && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3">
                  <span className={("rounded px-2 py-1 text-xs font-medium " + (mode === 'IN' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'))}>{mode === 'IN' ? 'Entrada' : 'Salida'}</span>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-center text-white">
                  <div>
                    <p className="mb-2 font-medium">No se pudo acceder a la cámara</p>
                     <p className="text-sm opacity-90">Usa la pestaña "Manual" para registrar tu marca.</p>
                  </div>
                </div>
              )}
            </div>
              {!loading && recent?.scannedAt && (
                <div className="mt-2 text-xs text-slate-500">
                  Última marca: {new Date(recent.scannedAt!).toLocaleString()} ({recent.type === 'IN' ? 'Entrada' : 'Salida'})
                  {recent?.businessDay && (
                    <span className="block text-[10px] text-slate-400 mt-1">Día de trabajo: {recent.businessDay} (corte 10:00)</span>
                  )}
                </div>
              )}
          </div>
        ) : (
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
              <button
                className="btn relative"
                disabled={submitting || mode == null}
                onMouseDown={(e) => {
                  if (mode !== 'OUT') return; // no long-press for IN
                  setHoldMs(0);
                  const start = Date.now();
                  const id = window.setInterval(() => {
                    const ms = Date.now() - start;
                    setHoldMs(ms);
                    if (ms >= 2000) {
                      window.clearInterval(id);
                      setHoldMs(0);
                      handleSubmit();
                    }
                  }, 50);
                  holdTimerRef.current = id as unknown as number;
                }}
                onMouseUp={() => { if (holdTimerRef.current) { window.clearInterval(holdTimerRef.current); holdTimerRef.current = null; setHoldMs(0); } }}
                onMouseLeave={() => { if (holdTimerRef.current) { window.clearInterval(holdTimerRef.current); holdTimerRef.current = null; setHoldMs(0); } }}
                onClick={(e) => {
                  if (mode === 'OUT') { e.preventDefault(); return; }
                  handleSubmit();
                }}
              >
                {submitting ? 'Enviando…' : (mode === 'OUT' ? (holdMs > 0 ? `Mantén presionado… ${Math.ceil(Math.max(0, 2000 - holdMs)/1000)}s` : 'Mantén para Registrar Salida') : 'Registrar entrada')}
                {mode === 'OUT' && holdMs > 0 && (
                  <span className="absolute inset-x-0 bottom-0 h-1 rounded-b bg-orange-500" style={{ width: `${Math.min(100, (holdMs/2000)*100)}%` }} />
                )}
              </button>
              <Link href="/u/scanner" className="ml-3 align-middle text-sm text-blue-600 hover:underline dark:text-blue-400">Abrir escáner en página completa</Link>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-slate-500">
          Para asegurar la trazabilidad, se registra la hora actual y tu usuario. Se aplican las mismas reglas (una entrada y una salida por día, y salida solo después de entrada).
        </div>
      </div>
    </div>
  );
}
