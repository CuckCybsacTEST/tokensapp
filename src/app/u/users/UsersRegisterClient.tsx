'use client';
import React, { useState, useEffect } from 'react';
import { ALLOWED_AREAS, type Area } from '@/lib/areas';
import { MONTHS_ES, buildBirthdaySubmission } from '@/lib/birthday';

interface UserRow { id: string; username: string; role: string; personCode: string|null; personName: string|null; dni: string|null; area: string|null; whatsapp?: string|null; birthday?: string|null; }

export default function UsersRegisterClient() {
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [area, setArea] = useState<Area>(ALLOWED_AREAS[0]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('01');
  const [birthdayMonth, setBirthdayMonth] = useState('01');
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
  const r = await fetch('/api/staff/users');
      const j = await r.json().catch(()=>({}));
      if (r.ok && j?.ok) setUsers(j.users || []);
    } finally { setLoadingUsers(false); }
  }
  useEffect(()=>{ loadUsers(); }, []);

  function normalizeDni(v: string) { return v.replace(/\D+/g,''); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    const n = name.trim();
    const d = normalizeDni(dni.trim());
    if (n.length < 2) { setErr('Nombre inválido'); return; }
    if (!d) { setErr('DNI inválido'); return; }
    if (!ALLOWED_AREAS.includes(area)) { setErr('Área inválida'); return; }
    if (!password || password.length < 8) { setErr('Password mínimo 8 caracteres'); return; }
    if (password !== confirm) { setErr('Las contraseñas no coinciden'); return; }
    const username = d; // username = DNI normalizado
    const whatsappDigits = (whatsapp||'').replace(/\D+/g,'');
    if (!whatsappDigits || whatsappDigits.length < 8) { setErr('WhatsApp inválido'); return; }
    const birthday = buildBirthdaySubmission(birthdayDay, birthdayMonth);
    const payload = { name: n, dni: d, area, password, whatsapp: whatsappDigits, birthday };
    try {
      setLoading(true);
      const res = await fetch('/api/staff/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json().catch(()=>({}));
      if (res.ok && j?.ok) {
        setMsg(`Colaborador creado: ${j.person.name} (${j.person.dni})`);
        setName(''); setDni(''); setArea(ALLOWED_AREAS[0]); setPassword(''); setConfirm(''); setWhatsapp(''); setBirthdayDay('01'); setBirthdayMonth('01');
        loadUsers();
      } else {
        const code = j?.code || j?.message || res.status;
        const map: Record<string,string> = {
          INVALID_PASSWORD: 'Password mínimo 8 caracteres',
          INVALID_DNI: 'DNI inválido o ya existe',
          DNI_TAKEN: 'DNI ya existe',
          CODE_TAKEN: 'Código ya existe',
          INVALID_AREA: 'Área inválida',
          INVALID_NAME: 'Nombre inválido',
          USERNAME_TAKEN: 'El DNI ya está registrado',
          INVALID_WHATSAPP: 'WhatsApp inválido',
          INVALID_BIRTHDAY: 'Cumpleaños inválido',
        };
        setErr(map[String(code)] || `Error: ${code}`);
      }
    } catch (e: any) {
      setErr(`Error de red: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string, username: string) {
    const sure = window.confirm(`¿Eliminar colaborador ${username}? Esta acción elimina también su persona y registros asociados.`);
    if (!sure) return;
    try {
      const r = await fetch(`/api/staff/users/${id}`, { method: 'DELETE' });
      const j = await r.json().catch(()=>({}));
      if (r.ok && j?.ok) {
        setMsg(`Eliminado usuario ${username}`);
        setErr(null);
        loadUsers();
      } else {
        setErr(`No se pudo eliminar (${j?.code||r.status})`);
      }
    } catch(e: any) {
      setErr(`Error al eliminar: ${String(e?.message||e)}`);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-3 sm:px-4 py-4 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <svg className="h-6 w-6 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
            </svg>
            Gestión de Colaboradores
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Administra los usuarios del sistema y registra nuevos colaboradores</p>
        </div>
        {/* Existing users table FIRST */}
        <div className="mb-6 sm:mb-10 border rounded border-slate-300 dark:border-slate-700 p-3 sm:p-4 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100">Colaboradores Registrados</h2>
            <button onClick={loadUsers} disabled={loadingUsers} type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50" title="Refrescar">
              <svg className={`h-4 w-4 ${loadingUsers?'animate-spin':''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9"/><path d="M3 12a9 9 0 0 0 9 9"/><path d="M7 17l-4-5 4-5"/><path d="M17 7l4 5-4 5"/></svg>
            </button>
          </div>
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="hidden md:table min-w-[900px] w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">DNI</th>
                  <th className="py-2 pr-4">Área</th>
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">WhatsApp</th>
                  <th className="py-2 pr-4">Cumpleaños</th>
                  <th className="py-2 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-4 font-mono text-xs">{u.personCode}</td>
                    <td className="py-2 pr-4">{u.personName}</td>
                    <td className="py-2 pr-4">{u.dni || '-'}</td>
                    <td className="py-2 pr-4">{u.area || '-'}</td>
                    <td className="py-2 pr-4">{u.username}</td>
                    <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[11px] font-mono">{u.role}</span></td>
                    <td className="py-2 pr-4">{u.whatsapp || '-'}</td>
                    <td className="py-2 pr-4">{u.birthday || '-'}</td>
                    <td className="py-2 pr-4">
                      {u.role === 'COLLAB' ? (
                        <button onClick={()=>onDelete(u.id, u.username)} className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50" disabled={loadingUsers}>Eliminar</button>
                      ) : (
                        <span className="text-xs text-slate-500">No permitido</span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length===0 && !loadingUsers && (
                  <tr><td colSpan={9} className="py-4 text-slate-500 text-sm">Sin usuarios</td></tr>
                )}
                {loadingUsers && (
                  <tr><td colSpan={9} className="py-4 text-slate-500 text-sm animate-pulse">Cargando…</td></tr>
                )}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {users.map(u => (
                <div key={u.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">{u.personName}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">{u.personCode}</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-[11px] font-mono">{u.role}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">DNI:</span>
                      <span className="ml-2">{u.dni || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Área:</span>
                      <span className="ml-2">{u.area || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Username:</span>
                      <span className="ml-2">{u.username}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">WhatsApp:</span>
                      <span className="ml-2">{u.whatsapp || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 dark:text-slate-400">Cumpleaños:</span>
                      <span className="ml-2">{u.birthday || '-'}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    {u.role === 'COLLAB' ? (
                      <button onClick={()=>onDelete(u.id, u.username)} className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 text-sm" disabled={loadingUsers}>Eliminar colaborador</button>
                    ) : (
                      <span className="text-xs text-slate-500">Eliminación no permitida</span>
                    )}
                  </div>
                </div>
              ))}
              {users.length===0 && !loadingUsers && (
                <div className="text-center py-8 text-slate-500 text-sm">Sin usuarios registrados</div>
              )}
              {loadingUsers && (
                <div className="text-center py-8 text-slate-500 text-sm animate-pulse">Cargando usuarios…</div>
              )}
            </div>
          </div>
        </div>

        <div className="border rounded border-slate-300 dark:border-slate-700 p-3 sm:p-4 bg-white dark:bg-slate-800">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Registrar Nuevo Colaborador</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4 sm:mb-6">Completa los datos para crear un colaborador con rol COLLAB</p>
        {msg && <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{msg}</div>}
        {err && <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">{err}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre completo</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">DNI</label>
              <input value={dni} onChange={e=>setDni(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" placeholder="Solo números" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Área</label>
              <select value={area} onChange={e=>setArea(e.target.value as Area)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                {ALLOWED_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">WhatsApp</label>
              <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" placeholder="9XXXXXXXX" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Fecha de cumpleaños</label>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Día</label>
                <select value={birthdayDay} onChange={e=>setBirthdayDay(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm">
                  {Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(d=> <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Mes</label>
                <select value={birthdayMonth} onChange={e=>setBirthdayMonth(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm">
                  {MONTHS_ES.map((m,idx)=> <option key={m} value={String(idx+1).padStart(2,'0')}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Contraseña</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="pt-2">
            <button disabled={loading} className="w-full sm:w-auto btn px-6 py-2">
              {loading ? 'Creando colaborador…' : 'Registrar colaborador'}
            </button>
          </div>
        </form>
        <div className="mt-4 sm:mt-6 text-xs text-slate-500 dark:text-slate-400">El colaborador podrá iniciar sesión usando su DNI como username.</div>
      </div>
    </div>
  );
}
