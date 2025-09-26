"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "../../globals.css";

type Mode = "IN" | "OUT";
type GlobalQrPayload = { kind: "GLOBAL"; mode: Mode; v?: number };

function ensureDeviceId(): string {
  const key = "scannerDeviceId";
  let v = localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(key, v);
  }
  return v;
}

function ymdUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  // Try JSON direct
  try {
    const j = JSON.parse(raw);
    if (j && typeof j === "object" && j.kind === "GLOBAL" && (j.mode === "IN" || j.mode === "OUT")) {
      return j.mode as Mode;
    }
  } catch {}
  // Try base64url JSON
  const j = base64UrlToJson<GlobalQrPayload>(raw);
  if (j && j.kind === "GLOBAL" && (j.mode === "IN" || j.mode === "OUT")) return j.mode;
  // Fallbacks:
  // 1) Plain strings like "IN" or "OUT"
  if (raw === 'IN' || raw === 'OUT') return raw as Mode;
  // 2) Legacy formats like "GLOBAL:IN" or "GLOBAL|OUT"
  const upper = raw.toUpperCase();
  if (upper.startsWith('GLOBAL')) {
    if (upper.includes('IN')) return 'IN';
    if (upper.includes('OUT')) return 'OUT';
  }
  // 3) URLs that include ?mode=IN|OUT
  try {
    const url = new URL(raw);
    const q = (url.searchParams.get('mode') || '').toUpperCase();
    if (q === 'IN' || q === 'OUT') return q as Mode;
  } catch {}
  return null;
}

function beep(freq = 880, duration = 120, type: OscillatorType = "sine", volume = 0.08) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.value = volume;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, duration);
  } catch {}
}

function vibrate(ms = 80) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
}

type Recent = { scannedAt?: string; type?: Mode; businessDay?: string } | null;

export default function UserScannerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const processingRef = useRef(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [flash, setFlash] = useState<{ mode: Mode; ts: number } | null>(null); // full-screen confirmation flash
  const [mode, setMode] = useState<Mode | null>(null);
  const [me, setMe] = useState<{ personName?: string; dni?: string } | null>(null);
  const [recent, setRecent] = useState<Recent>(null);
  const [fromChecklist, setFromChecklist] = useState(false);
  const [dni, setDni] = useState("");

  const inCooldown = useMemo(() => Date.now() < cooldownUntil, [cooldownUntil]);

  const markAttendance = useCallback(async (m: Mode) => {
    const deviceId = ensureDeviceId();
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: m, deviceId })
      });
      const json: any = await res.json();
      if (res.ok && json?.ok) {
        const already = json.alerts?.includes('already_marked');
        const same = json.alerts?.includes('same_direction');
        const extraAlready = already ? ` · Ya estaba registrada hoy${json.alreadyMarkedAt ? ` (${new Date(json.alreadyMarkedAt).toLocaleTimeString()})` : ''}` : '';
        const extraSame = !already && same ? ` · Nota: misma dirección que tu última marca${json.lastSameAt ? ` (${new Date(json.lastSameAt).toLocaleTimeString()})` : ''}` : '';
  const msgText = `${m === 'IN' ? 'Entrada' : 'Salida'} registrada${extraAlready}${extraSame}`;
  setBanner({ variant: "success", message: msgText });
  setFlash({ mode: m, ts: Date.now() });
        beep(880, 120, "sine");
        vibrate(60);
        setCooldownUntil(Date.now() + 1000);

        // Redirecciones: IN -> checklist; OUT -> página de cierre (siempre)
        const day = (json && typeof json.businessDay === 'string' && json.businessDay) || ymdUtc();
        setTimeout(() => {
          if (m === 'IN') {
            window.location.href = `/u/checklist?day=${day}&mode=IN`;
          } else {
            const params = new URLSearchParams();
            params.set('day', day);
            if (json.scanId) params.set('scanId', json.scanId);
            window.location.href = `/u/closed?${params.toString()}`;
          }
        }, 700);
      } else {
        let msg = json?.code || "ERROR";
        if (msg === "DUPLICATE") msg = "REPLAY";
        let human: string;
        switch (msg) {
          case 'REPLAY': human = 'Intento duplicado (<10s)'; break;
          case 'PERSON_INACTIVE': human = 'Persona inactiva'; break;
          case 'ALREADY_TODAY': human = 'Ya registraste esta acción hoy'; break;
          case 'NO_IN_TODAY': human = 'No puedes registrar salida sin haber registrado entrada hoy'; break;
          case 'OUT_COOLDOWN': human = `Debes esperar ${json?.waitSeconds ?? 60}s desde tu entrada antes de registrar salida`; break;
          default: human = String(msg);
        }
        setBanner({ variant: "error", message: human });
        beep(220, 150, "square");
        vibrate(120);
        setCooldownUntil(Date.now() + 1000);
      }
    } catch (e: any) {
      setBanner({ variant: "error", message: `Fallo de red: ${String(e?.message || e)}` });
      beep(220, 150, "square");
      vibrate(120);
      setCooldownUntil(Date.now() + 1000);
    }
  }, [fromChecklist]);

  const processDecodedText = useCallback(async (text: string) => {
    if (!text || processingRef.current || inCooldown) return;
    processingRef.current = true;
    const m = decodeGlobalModeFromQr(text);
    if (!m) {
      setBanner({ variant: "error", message: "QR inválido (no es póster GLOBAL)" });
      beep(220, 150, "square");
      vibrate(120);
      setCooldownUntil(Date.now() + 800);
      processingRef.current = false;
      return;
    }
    setMode(m);
    await markAttendance(m);
    processingRef.current = false;
  }, [inCooldown, markAttendance]);

  const handleResult = useCallback((result: any) => {
    if (!result) return;
    processDecodedText(result.getText());
  }, [processDecodedText]);

  useEffect(() => {
    // Load current user info
    (async () => {
      try {
        const res = await fetch('/api/user/me');
        const json = await res.json();
        if (res.ok && json?.ok) {
          setMe({ personName: json.user.personName, dni: json.user.dni });
        }
      } catch {}
      // Load recent scan to guide next suggested action
      try {
        const r2 = await fetch('/api/attendance/me/recent', { cache: 'no-store' });
        const j2 = await r2.json().catch(() => ({}));
        setRecent((j2?.recent ?? null) as Recent);
      } catch {}
    })();

    // Leer query param from=checklist para ajustar redirección tras OUT
    try {
      const sp = new URLSearchParams(window.location.search);
      setFromChecklist(sp.get('from') === 'checklist');
    } catch {}

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    const videoEl = videoRef.current;
    const constraints = { video: { facingMode: "environment" as const } };
    reader
      .decodeFromConstraints(constraints, videoEl!, (result: any) => {
        if (result) handleResult(result);
      })
      .catch((e: unknown) => {
        const msg = typeof e === 'object' && e && 'toString' in e ? (e as any).toString() : String(e);
        setCameraError(msg || "Permiso denegado o cámara no disponible");
        setBanner({ variant: "error", message: `No se pudo abrir la cámara: ${msg}` });
      });
    return () => {
      try { readerRef.current?.reset(); } catch {}
      try {
        const s = videoRef.current?.srcObject as MediaStream | undefined;
        s?.getTracks().forEach((t) => t.stop());
      } catch {}
    };
  }, [handleResult]);
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registrar entrada/salida</h1>
          <p className="mt-1 text-xs text-slate-500">Apunta la cámara al póster GLOBAL. {mode ? (mode === 'IN' ? 'Detectamos: Entrada.' : 'Detectamos: Salida.') : 'Se detectará automáticamente.'}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {me && (
            <span className="text-slate-600">{me.personName || 'Colaborador'}{me?.dni ? ` · DNI: ${me.dni}` : ''}</span>
          )}
          <button
            className="btn-outline"
            onClick={async () => {
              try {
                await fetch('/api/user/auth/logout', { method: 'POST' });
              } finally {
                window.location.href = '/u/login';
              }
            }}
          >Cerrar sesión</button>
        </div>
      </div>
      {banner && (
        <div className={"mb-4 rounded-md border p-3 text-sm transition-all duration-500 " + (banner.variant === "success" ? "border-green-300 bg-green-50 text-green-800 shadow-green-200/50" : "border-red-300 bg-red-50 text-red-800 shadow-red-200/50")}>{banner.message}</div>
      )}

      {/* Suggested next action */}
      <div className="mb-3">
        {recent?.scannedAt && (
          <div className="text-xs text-slate-500">
            Última marca: {new Date(recent.scannedAt!).toLocaleString()} ({recent.type === 'IN' ? 'Entrada' : 'Salida'}) · Sugerencia: {recent.type === 'IN' ? 'Escanea Salida para finalizar' : 'Escanea Entrada para comenzar'}
            {recent?.businessDay && (
              <span className="block text-[10px] text-slate-400 mt-1">Día de trabajo: {recent.businessDay} (corte 10:00)</span>
            )}
          </div>
        )}
      </div>

  <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl border border-slate-300 bg-black shadow-md">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
        {/* Stylized overlay with corners */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-6 rounded-xl border-2 border-white/30" />
          <div className="absolute left-6 top-6 h-6 w-6 border-l-4 border-t-4 border-[var(--color-accent,#22c55e)]" />
          <div className="absolute right-6 top-6 h-6 w-6 border-r-4 border-t-4 border-[var(--color-accent,#f59e0b)]" />
          <div className="absolute bottom-6 left-6 h-6 w-6 border-b-4 border-l-4 border-[var(--color-accent,#22c55e)]" />
          <div className="absolute bottom-6 right-6 h-6 w-6 border-b-4 border-r-4 border-[var(--color-accent,#f59e0b)]" />
        </div>
        {mode && (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3 animate-fade-in">
            <span className={"rounded px-2 py-1 text-xs font-medium shadow " + (mode === 'IN' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white')}>{mode === 'IN' ? 'Entrada' : 'Salida'}</span>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-center text-white">
            <div>
              <p className="mb-2 font-medium">No se pudo acceder a la cámara</p>
              <p className="text-sm opacity-90">Usa el formulario manual para registrar tu marca.</p>
            </div>
          </div>
        )}
        {/* Flash overlay after success */}
        {flash && Date.now() - flash.ts < 1200 && (
          <div className={"pointer-events-none absolute inset-0 flex items-center justify-center animate-pop scale-100"}>
            <div className={"text-center"}>
              <div className={"mx-auto mb-3 h-24 w-24 rounded-full flex items-center justify-center shadow-lg ring-4 " + (flash.mode === 'IN' ? 'bg-green-500/90 ring-green-300' : 'bg-orange-500/90 ring-orange-300')}>
                <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {flash.mode === 'IN' ? (
                    <path d="M5 13l4 4L19 7" />
                  ) : (
                    <>
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </>
                  )}
                </svg>
              </div>
              <p className="text-white font-semibold text-xl drop-shadow">{flash.mode === 'IN' ? 'ENTRADA OK' : 'SALIDA OK'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Toast style fixed notification (extra clarity) */}
      {flash && Date.now() - flash.ts < 1800 && (
        <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex justify-center z-40">
          <div className={"px-6 py-4 rounded-2xl font-semibold tracking-wide shadow-xl backdrop-blur-md text-white text-lg animate-scale-fade " + (flash.mode === 'IN' ? 'bg-green-600/90' : 'bg-orange-600/90')}>
            {flash.mode === 'IN' ? 'Entrada registrada' : 'Salida registrada'}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
  <p className="text-sm text-gray-600">Consejo: si vas a empezar tu turno, escanea el póster de <span className="font-medium">Entrada</span>. Al finalizar, escanea el de <span className="font-medium">Salida</span>.</p>
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 text-slate-700 dark:text-slate-200">¿Problemas con la cámara? Puedes registrar tu marca manualmente.</p>
          <a href="/u/manual" className="btn inline-block">Abrir formulario manual</a>
        </div>
      </div>
      <style jsx global>{`
        @keyframes popIn {
          0% { transform: scale(0.6); opacity: 0; }
          40% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.98); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleFade {
          0% { transform: scale(0.85); opacity: 0; }
          30% { transform: scale(1); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.98); opacity: 0; }
        }
        .animate-pop { animation: popIn 450ms cubic-bezier(.16,.8,.3,1); }
        .animate-fade-in { animation: fadeIn 350ms ease-out; }
        .animate-scale-fade { animation: scaleFade 1600ms cubic-bezier(.16,.8,.3,1); }
      `}</style>
    </div>
  );
}
