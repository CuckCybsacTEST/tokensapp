"use client";
import { useState } from "react";
import { ALLOWED_AREAS } from "@/lib/areas";
import { MONTHS_ES, buildBirthdaySubmission } from '@/lib/birthday';

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [area, setArea] = useState<string>(ALLOWED_AREAS[0]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("01");
  const [birthdayMonth, setBirthdayMonth] = useState("01");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  function isNombreApellidoValid(raw: string) {
    if (!raw || typeof raw !== 'string') return false;
    const cleaned = raw.trim().replace(/\s+/g, ' ');
    const parts = cleaned.split(' ');
    if (parts.length < 2) return false; // requiere al menos nombre y un apellido
    // Cada parte al menos 2 caracteres alfabéticos (permitimos acentos, ñ, apóstrofe y guion)
    return parts.every(p => /^(?=.{2,})([A-Za-zÁÉÍÓÚÜÑáéíóúüñ'-])+$/u.test(p));
  }

  function normalizeNombre(raw: string) {
    return raw.trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isNombreApellidoValid(name)) { setError("Ingresa nombre y apellido (mínimo dos palabras)"); return; }
    if (!dni || dni.trim().length < 3) { setError("DNI inválido"); return; }
  const whatsappDigits = (whatsapp || '').replace(/\D+/g,'');
  if (!whatsappDigits || whatsappDigits.length < 8) { setError("WhatsApp obligatorio (mín 8 dígitos)"); return; }
  const birthday = buildBirthdaySubmission(birthdayDay, birthdayMonth); // "D Mes"
    if (!ALLOWED_AREAS.includes(area as any)) { setError("Área inválida"); return; }
    if (!password || password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setPending(true);
    try {
      const res = await fetch("/api/user/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: normalizeNombre(name), dni: dni.trim(), area, password, whatsapp: whatsappDigits, birthday })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        const map: Record<string, string> = {
          INVALID_NAME: "Nombre inválido",
          INVALID_DNI: "DNI inválido",
          INVALID_AREA: "Área inválida",
          INVALID_PASSWORD: "La contraseña debe tener al menos 8 caracteres",
          DNI_TAKEN: "El DNI ya está registrado",
          CODE_TAKEN: "El DNI ya está registrado",
          USERNAME_TAKEN: "Ya existe un usuario con ese DNI",
          INVALID_WHATSAPP: "WhatsApp inválido (8-15 dígitos)",
          INVALID_BIRTHDAY: "Fecha de cumpleaños inválida",
        };
        setError(map[j?.code] || (j?.code ? `Error: ${j.code}` : j?.message) || "Error al registrar");
        return;
      }
      setDone(true);
      // Auto-redirect tras breve confirmación
      setTimeout(() => { window.location.href = "/u"; }, 600);
    } catch (e: any) {
      setError(String(e?.message || e) || "Error de red");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col px-4 pt-16 pb-10 sm:pt-10 bg-slate-900 text-slate-100">
  <div className="w-full max-w-md mx-auto">
  <h1 className="text-2xl font-bold tracking-tight mb-2 text-white text-center">¡Bienvenido al equipo El Lounge!</h1>
  <p className="text-sm text-slate-300 mb-5 max-w-prose mx-auto text-center">Registra tus datos para activar tu acceso. Este usuario te permitirá registrar asistencia, tareas y métricas que impulsan el funcionamiento diario.</p>
        {error && (
          <div className="mb-3 border border-red-600 bg-red-50 text-red-700 rounded p-2 text-sm">{error}</div>
        )}
        {done ? (
          <div className="text-sm">Registro completado. Redirigiendo…</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre y apellido <span className="text-red-600">*</span></label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 rounded px-3 py-2 text-slate-900 dark:text-slate-100" placeholder="Ej: Juan Pérez" />
            </div>
            <div>
              <label className="block text-sm mb-1">DNI</label>
              <input value={dni} onChange={e=>setDni(e.target.value)} className="w-full border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 rounded px-3 py-2 text-slate-900 dark:text-slate-100" placeholder="Solo números" />
            </div>
            <div>
              <label className="block text-sm mb-1">Área</label>
              <select className="w-full border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/60 rounded px-3 py-2 text-slate-900 dark:text-slate-100" value={area} onChange={e=>setArea(e.target.value)}>
                {ALLOWED_AREAS.map(a => (<option key={a} value={a}>{a}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">WhatsApp <span className="text-red-500">*</span></label>
                <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 rounded px-3 py-2 text-slate-900 dark:text-slate-100" placeholder="9XXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm mb-1">Cumpleaños (día y mes) <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <select value={birthdayDay} onChange={e=>setBirthdayDay(e.target.value)} className="border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 rounded px-2 py-2 text-slate-900 dark:text-slate-100">
                    {Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(d=> <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={birthdayMonth} onChange={e=>setBirthdayMonth(e.target.value)} className="border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 rounded px-2 py-2 text-slate-900 dark:text-slate-100">
                    {MONTHS_ES.map((m,idx)=> <option key={m} value={String(idx+1).padStart(2,'0')}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  className="w-full pr-10 border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 rounded px-3 py-2 text-slate-900 dark:text-slate-100"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={()=>setShowPw(s=>!s)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                  aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPw ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a21.77 21.77 0 0 1 5.06-7.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a21.83 21.83 0 0 1-2.16 3.19M14.12 14.12A3 3 0 0 1 9.88 9.88M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e=>setConfirm(e.target.value)}
                  className="w-full pr-10 border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 rounded px-3 py-2 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={()=>setShowConfirmPw(s=>!s)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                  aria-label={showConfirmPw ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                >
                  {showConfirmPw ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a21.77 21.77 0 0 1 5.06-7.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 8 10 8a21.83 21.83 0 0 1-2.16 3.19M14.12 14.12A3 3 0 0 1 9.88 9.88M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 font-medium tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow focus:outline-none focus:ring-2 focus:ring-blue-500/60">
              {pending ? "Registrando…" : "Crear cuenta"}
            </button>
            <p className="text-xs text-gray-400">El usuario se creará con tu DNI; el inicio de sesión es con DNI y contraseña.</p>
          </form>
        )}
      </div>
    </div>
  );
}
