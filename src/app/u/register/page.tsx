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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name || name.trim().length < 2) { setError("Nombre inválido"); return; }
    if (!dni || dni.trim().length < 3) { setError("DNI inválido"); return; }
    if (!ALLOWED_AREAS.includes(area as any)) { setError("Área inválida"); return; }
    if (!password || password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setPending(true);
    try {
      const res = await fetch("/api/user/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), dni: dni.trim(), area, password })
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border rounded-lg p-6 bg-white text-gray-900">
        <h1 className="text-xl font-semibold mb-4">Registro de colaborador</h1>
        {error && (
          <div className="mb-3 border border-red-600 bg-red-50 text-red-700 rounded p-2 text-sm">{error}</div>
        )}
        {done ? (
          <div className="text-sm">Registro completado. Redirigiendo…</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre y apellido</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Tu nombre" />
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
            <button disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 disabled:opacity-50">
              {pending ? "Registrando…" : "Crear cuenta"}
            </button>
            <p className="text-xs text-gray-500">El usuario se creará con tu DNI; el inicio de sesión es con DNI y contraseña.</p>
          </form>
        )}
      </div>
    </div>
  );
}
