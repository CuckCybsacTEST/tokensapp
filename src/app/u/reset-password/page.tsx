"use client";

import { useState } from 'react';

function onlyDigits(s: string) { return (s || '').replace(/\D+/g, ''); }

export default function ResetPasswordPage() {
  const [dni, setDni] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (!dni || dni.length < 6) { setErr('DNI inválido'); return; }
    if (!code || code.length < 4) { setErr('Código inválido'); return; }
    if (!password || password.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirm) { setErr('Las contraseñas no coinciden'); return; }
    try {
      setLoading(true);
      const res = await fetch('/api/user/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, code, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        setMsg('Contraseña actualizada. Ya puedes iniciar sesión.');
        setDni(""); setCode(""); setPassword(""); setConfirm("");
      } else {
        const back = j?.error || j?.message || res.status;
        const map: Record<string, string> = {
          RATE_LIMIT: 'Demasiados intentos, espera un momento',
          INVALID_INPUT: 'Datos inválidos',
          INVALID_DNI_OR_CODE: 'DNI o código inválido / vencido',
          MUST_LOGOUT: 'Cierra sesión primero para cambiar la contraseña desde aquí',
        };
        setErr(map[String(back)] || `Error: ${back}`);
      }
    } catch (e: any) {
      setErr(`Error de red: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Restablecer contraseña</h1>
  <p className="text-sm text-gray-400">Ingresa tu DNI, el código de un solo uso que te dio el STAFF y define una nueva contraseña.</p>
      {msg && <div className="border border-green-700 bg-green-950/30 text-green-200 rounded p-3 text-sm">{msg}</div>}
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm text-gray-300">DNI</label>
          <input value={dni} onChange={(e)=> setDni(onlyDigits(e.target.value))} inputMode="numeric" pattern="[0-9]*" placeholder="12345678" className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1" />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-gray-300">Código (OTP)</label>
          <input value={code} onChange={(e)=> setCode((e.target.value||'').trim())} placeholder="AB12CD" className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1 uppercase" />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-gray-300">Nueva contraseña</label>
          <input type="password" value={password} onChange={(e)=> setPassword(e.target.value)} placeholder="mínimo 8 caracteres" className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1" />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-gray-300">Confirmar contraseña</label>
          <input type="password" value={confirm} onChange={(e)=> setConfirm(e.target.value)} className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1" />
        </div>
        <button disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-2 disabled:opacity-50">{loading ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </div>
  );
}
