"use client";
import { useState } from "react";
import { ALLOWED_AREAS } from "@/lib/areas";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [area, setArea] = useState<string>(ALLOWED_AREAS[0]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
    if (!ALLOWED_AREAS.includes(area as any)) { setError("Área inválida"); return; }
    if (!password || password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setPending(true);
    try {
      const res = await fetch("/api/user/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizeNombre(name), dni: dni.trim(), area, password })
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
        };
        setError(map[j?.code] || j?.message || "Error al registrar");
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
    <div className="min-h-[100dvh] flex flex-col justify-center px-4 py-10 sm:py-4 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-md border rounded-xl p-6 bg-white text-gray-900 shadow-sm mx-auto">
        <h1 className="text-xl font-semibold mb-4">Registro de colaborador</h1>
        {error && (
          <div className="mb-3 border border-red-600 bg-red-50 text-red-700 rounded p-2 text-sm">{error}</div>
        )}
        {done ? (
          <div className="text-sm">Registro completado. Redirigiendo…</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre y apellido <span className="text-red-600">*</span></label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ej: Juan Pérez" />
            </div>
            <div>
              <label className="block text-sm mb-1">DNI</label>
              <input value={dni} onChange={e=>setDni(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Solo números" />
            </div>
            <div>
              <label className="block text-sm mb-1">Área</label>
              <select className="w-full border rounded px-3 py-2" value={area} onChange={e=>setArea(e.target.value)}>
                {ALLOWED_AREAS.map(a => (<option key={a} value={a}>{a}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label className="block text-sm mb-1">Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <button disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 font-medium tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {pending ? "Registrando…" : "Crear cuenta"}
            </button>
            <p className="text-xs text-gray-500">El usuario se creará con tu DNI; el inicio de sesión es con DNI y contraseña.</p>
          </form>
        )}
      </div>
    </div>
  );
}
