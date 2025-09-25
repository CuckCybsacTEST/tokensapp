"use client";

import { useEffect, useMemo, useState } from "react";
import { ALLOWED_AREAS } from "@/lib/areas";

export default function AdminUsersPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Always create person + user (legacy link mode removed)
  // Person fields
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [area, setArea] = useState<string>(ALLOWED_AREAS[0]);
  const [role, setRole] = useState("COLLAB");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pwEdit, setPwEdit] = useState<Record<string, { open: boolean; value: string; saving?: boolean }>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [otp, setOtp] = useState<Record<string, { code: string; expiresAt: string; generating?: boolean }>>({});

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const j = await res.json();
      if (res.ok && j?.ok) setUsers(j.users || []);
    } catch {}
  }

  async function deleteUser(userId: string) {
    setMsg(null); setErr(null);
    const u = users.find(x => x.id === userId);
    const name = u ? `${u.personName} (${u.personCode})` : userId;
    if (!confirm(`¿Eliminar usuario ${name}? Se borrará también su persona, scans y estados de tareas.`)) return;
    try {
      setDeleting(prev => ({ ...prev, [userId]: true }));
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        setUsers(prev => prev.filter(x => x.id !== userId));
        setMsg(`Usuario eliminado: ${name}`);
      } else {
        const back = j?.code || j?.message || res.status;
        setErr(`No se pudo eliminar: ${back}`);
      }
    } catch (e: any) {
      setErr(`Error de red: ${String(e?.message || e)}`);
    } finally {
      setDeleting(prev => ({ ...prev, [userId]: false }));
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function generateOtp(userId: string) {
    setMsg(null); setErr(null);
    try {
      setOtp(prev => ({ ...prev, [userId]: { code: prev[userId]?.code || '', expiresAt: prev[userId]?.expiresAt || '', generating: true } }));
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/password-otp`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok && j?.code) {
        setOtp(prev => ({ ...prev, [userId]: { code: j.code, expiresAt: j.expiresAt, generating: false } }));
        setMsg('Código generado');
      } else {
        const back = j?.code || j?.message || res.status;
        setErr(`No se pudo generar: ${back}`);
        setOtp(prev => ({ ...prev, [userId]: { code: prev[userId]?.code || '', expiresAt: prev[userId]?.expiresAt || '', generating: false } }));
      }
    } catch (e: any) {
      setErr(`Error de red: ${String(e?.message || e)}`);
      setOtp(prev => ({ ...prev, [userId]: { code: prev[userId]?.code || '', expiresAt: prev[userId]?.expiresAt || '', generating: false } }));
    }
  }

  async function changePassword(userId: string) {
    const state = pwEdit[userId];
    if (!state || !state.value || state.value.length < 8) { setErr('Password mínimo 8 caracteres'); return; }
    try {
      setPwEdit(prev => ({ ...prev, [userId]: { ...prev[userId], saving: true } }));
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: state.value })
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        setMsg('Contraseña actualizada'); setErr(null);
        setPwEdit(prev => ({ ...prev, [userId]: { open: false, value: '', saving: false } }));
      } else {
        const back = j?.code || j?.message || res.status;
        setErr(`Error al actualizar contraseña: ${back}`);
        setPwEdit(prev => ({ ...prev, [userId]: { ...prev[userId], saving: false } }));
      }
    } catch (e: any) {
      setErr(`Error de red: ${String(e?.message || e)}`);
      setPwEdit(prev => ({ ...prev, [userId]: { ...prev[userId], saving: false } }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    // Client-side validation
    if (!username || username.trim().length < 3) { setErr('Username inválido'); return; }
    if (!password || password.length < 8) { setErr('Password mínimo 8 caracteres'); return; }
    if (!name || name.trim().length < 2) { setErr('Nombre es obligatorio'); return; }
    if (!dni || dni.trim().length < 3) { setErr('DNI es obligatorio'); return; }
    if (!(ALLOWED_AREAS as readonly string[]).includes(area as any)) { setErr('Área inválida'); return; }
    try {
      const payload = { username: username.trim(), password, role, person: { name: name.trim(), dni: dni.trim(), area } };
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (res.ok && j?.ok) {
        setMsg(`Usuario creado: ${j.user.username} → ${j.person.code}`);
        setUsername(""); setPassword(""); setName(""); setDni(""); setArea(ALLOWED_AREAS[0]);
        loadUsers();
      } else {
        const back = j?.code || j?.message || res.status;
        const map: Record<string, string> = {
          INVALID_USERNAME: 'Username inválido',
          INVALID_PASSWORD: 'Password mínimo 8 caracteres',
          INVALID_NAME: 'Nombre es obligatorio',
          INVALID_DNI: 'DNI es obligatorio',
          INVALID_AREA: 'Área inválida',
          INVALID_CODE: 'Código inválido',
          USERNAME_TAKEN: 'El username ya existe',
          DNI_TAKEN: 'El DNI ya existe',
          CODE_TAKEN: 'El código ya existe',
          PERSON_ALREADY_LINKED: 'La persona ya tiene usuario',
          PERSON_NOT_FOUND: 'Persona no encontrada',
        };
        setErr(map[String(back)] || `Error: ${back}`);
      }
    } catch (e: any) {
      setErr(`Error de red: ${String(e?.message || e)}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios (Admin)</h1>
      {msg && <div className="border border-green-700 bg-green-950/30 text-green-200 rounded p-3 text-sm">{msg}</div>}
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}
      <form onSubmit={onSubmit} className="max-w-xl space-y-3 border rounded p-3">
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Username</label>
          <input value={username} onChange={(e)=>setUsername(e.target.value)} required className="border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Nombre</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} className="border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Nombre y Apellido" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">DNI</label>
          <input
            value={dni}
            onChange={(e)=> setDni((e.target.value || '').replace(/\D+/g, ''))}
            className="border border-gray-700 bg-gray-900 text-gray-100 placeholder:text-gray-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="12345678"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <p className="text-xs text-gray-400">Se usará solo números como código</p>
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Área</label>
          <select value={area} onChange={(e)=>setArea(e.target.value)} required className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
            {ALLOWED_AREAS.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Rol</label>
          <select value={role} onChange={(e)=>setRole(e.target.value)} className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
            <option value="COLLAB">COLLAB</option>
            <option value="STAFF">STAFF</option>
          </select>
        </div>
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={!dni || !(ALLOWED_AREAS as readonly string[]).includes(area as any)}
          aria-disabled={!dni || !(ALLOWED_AREAS as readonly string[]).includes(area as any)}
        >
          Crear usuario
        </button>
      </form>
      <div className="border rounded p-3">
        <h2 className="text-lg font-medium mb-3">Usuarios existentes</h2>
        <div className="overflow-x-auto">
          <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Código</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">DNI</th>
                <th className="py-2 pr-4">Área</th>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Rol</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u)=> (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{u.personCode}</td>
                  <td className="py-2 pr-4">{u.personName}</td>
                  <td className="py-2 pr-4">{u.dni || '-'}</td>
                  <td className="py-2 pr-4">{u.area || '-'}</td>
                  <td className="py-2 pr-4">{u.username}</td>
                  <td className="py-2 pr-4">{u.role}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                        onClick={() => setPwEdit(prev => ({ ...prev, [u.id]: { open: !prev[u.id]?.open, value: prev[u.id]?.value || '' } }))}
                      >Cambiar contraseña</button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50"
                        disabled={otp[u.id]?.generating}
                        onClick={() => generateOtp(u.id)}
                      >{otp[u.id]?.generating ? 'Generando…' : 'Generar OTP'}</button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-50"
                        disabled={!!deleting[u.id]}
                        onClick={() => deleteUser(u.id)}
                      >{deleting[u.id] ? 'Eliminando…' : 'Eliminar'}</button>
                    </div>
                    {otp[u.id]?.code && (
                      <div className="mt-2 text-xs p-2 rounded border border-emerald-700 bg-emerald-900/30 text-emerald-100 flex items-center justify-between gap-2">
                        <div>
                          <div><span className="opacity-70">Código:</span> <span className="font-mono tracking-wider text-base">{otp[u.id].code}</span></div>
                          <div className="opacity-80">Vence: {new Date(otp[u.id].expiresAt).toLocaleTimeString()}</div>
                        </div>
                        <button
                          className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600"
                          onClick={() => navigator.clipboard?.writeText(otp[u.id].code)}
                        >Copiar</button>
                      </div>
                    )}
                    {pwEdit[u.id]?.open && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="password"
                          value={pwEdit[u.id]?.value || ''}
                          onChange={(e)=> setPwEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], value: e.target.value } }))}
                          placeholder="Nueva contraseña (min 8)"
                          className="border border-gray-700 bg-gray-900 text-gray-100 rounded px-2 py-1 text-xs"
                        />
                        <button
                          className="text-xs px-2 py-1 rounded bg-blue-600 disabled:opacity-50"
                          disabled={(pwEdit[u.id]?.value || '').length < 8 || pwEdit[u.id]?.saving}
                          onClick={() => changePassword(u.id)}
                        >{pwEdit[u.id]?.saving ? 'Guardando…' : 'Guardar'}</button>
                        <button
                          className="text-xs px-2 py-1 rounded bg-slate-600"
                          onClick={() => setPwEdit(prev => ({ ...prev, [u.id]: { open: false, value: '' } }))}
                        >Cancelar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="py-3 text-gray-500" colSpan={7}>Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
