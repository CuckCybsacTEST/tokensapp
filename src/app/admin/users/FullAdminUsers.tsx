"use client";
import { useEffect, useState } from 'react';
import { ALLOWED_AREAS } from '@/lib/areas';
import { MONTHS_ES, buildBirthdaySubmission } from '@/lib/birthday';

// Full admin CRUD users management component (original functionality)
export default function FullAdminUsers() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [area, setArea] = useState<string>(ALLOWED_AREAS[0]);
  const [whatsapp, setWhatsapp] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("01");
  const [birthdayMonth, setBirthdayMonth] = useState("01");
  const [role, setRole] = useState("COLLAB");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [pwEdit, setPwEdit] = useState<Record<string, { open: boolean; value: string; saving?: boolean }>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [otp, setOtp] = useState<Record<string, { code: string; expiresAt: string; generating?: boolean }>>({});
  const [nameEdit, setNameEdit] = useState<Record<string, { open: boolean; value: string; saving?: boolean }>>({});
  const [areaEdit, setAreaEdit] = useState<Record<string, { open: boolean; value: string; saving?: boolean }>>({});
  const [waEdit, setWaEdit] = useState<Record<string, { open: boolean; value: string; saving?: boolean }>>({});

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const j = await res.json();
      if (res.ok && j?.ok) setUsers(j.users || []);
    } catch {}
  }
  useEffect(()=>{ loadUsers(); }, []);

  async function deleteUser(userId: string) {
    setMsg(null); setErr(null);
    const u = users.find(x => x.id === userId);
    const nameLabel = u ? `${u.personName} (${u.personCode})` : userId;
    if (!confirm(`¿Eliminar usuario ${nameLabel}? Se borrará también su persona, scans y estados de tareas.`)) return;
    try {
      setDeleting(prev => ({ ...prev, [userId]: true }));
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const j = await res.json().catch(()=>({}));
      if (res.ok && j?.ok) {
        setUsers(prev => prev.filter(x => x.id !== userId));
        setMsg(`Usuario eliminado: ${nameLabel}`);
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

  async function generateOtp(userId: string) {
    setMsg(null); setErr(null);
    try {
      setOtp(prev => ({ ...prev, [userId]: { code: prev[userId]?.code || '', expiresAt: prev[userId]?.expiresAt || '', generating: true } }));
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/password-otp`, { method: 'POST' });
      const j = await res.json().catch(()=>({}));
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
      const j = await res.json().catch(()=>({}));
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
    if (!username || username.trim().length < 3) { setErr('Username inválido'); return; }
    if (!password || password.length < 8) { setErr('Password mínimo 8 caracteres'); return; }
    if (!name || name.trim().length < 2) { setErr('Nombre es obligatorio'); return; }
  if (!dni || dni.trim().length < 3) { setErr('DNI es obligatorio'); return; }
  if (!whatsapp || whatsapp.replace(/\D+/g,'').length < 8) { setErr('WhatsApp inválido'); return; }
  const birthday = buildBirthdaySubmission(birthdayDay, birthdayMonth); // "D Mes"
    if (!(ALLOWED_AREAS as readonly string[]).includes(area as any)) { setErr('Área inválida'); return; }
    try {
  const payload = { username: username.trim(), password, role, person: { name: name.trim(), dni: dni.trim(), area, whatsapp, birthday } };
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json().catch(()=>({}));
      if (res.ok && j?.ok) {
        setMsg(`Usuario creado: ${j.user.username} → ${j.person.code}`);
  setUsername(''); setPassword(''); setName(''); setDni(''); setArea(ALLOWED_AREAS[0]); setRole('COLLAB'); setWhatsapp(''); setBirthdayMonth('01'); setBirthdayDay('01');
        loadUsers();
      } else {
        const back = j?.code || j?.message || res.status;
        const map: Record<string,string> = {
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
          PERSON_NOT_FOUND: 'Persona no encontrada'
        };
        setErr(map[String(back)] || `Error: ${back}`);
      }
    } catch (e: any) {
      setErr(`Error de red: ${String(e?.message || e)}`);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold flex items-center justify-between">
        <span>Usuarios (Admin)</span>
        <span className="text-xs font-normal text-slate-500">Gestión de colaboradores (rol, nombre, credenciales)</span>
      </h1>
      {msg && <div className="border border-green-700 bg-green-950/30 text-green-200 rounded p-3 text-sm">{msg}</div>}
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}
  <form onSubmit={onSubmit} className="card max-w-xl space-y-3 p-4">
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} required className="input-sm" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="input-sm" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Nombre</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="input-sm" placeholder="Nombre y Apellido" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">DNI</label>
          <input value={dni} onChange={e=> setDni((e.target.value||'').replace(/\D+/g,''))} className="input-sm" placeholder="12345678" inputMode="numeric" />
        </div>
        <div className="flex gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-gray-700">WhatsApp</label>
            <input value={whatsapp} onChange={e=> setWhatsapp(e.target.value.replace(/[^0-9+]/g,''))} className="input-sm" placeholder="999888777" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-gray-700">Cumpleaños (día y mes)</label>
            <div className="flex gap-2">
              <select value={birthdayDay} onChange={e=> setBirthdayDay(e.target.value)} className="input-sm">
                {Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={birthdayMonth} onChange={e=> setBirthdayMonth(e.target.value)} className="input-sm">
                {MONTHS_ES.map((m,idx) => <option key={m} value={String(idx+1).padStart(2,'0')}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-gray-700">Área</label>
            <select value={area} onChange={e=> setArea(e.target.value)} className="input-sm">
              {ALLOWED_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-gray-700">Rol</label>
            <select value={role} onChange={e=> setRole(e.target.value)} className="input-sm">
              <option value="COLLAB">COLLAB</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>
        </div>
        <div className="pt-2">
          <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm">Crear usuario</button>
        </div>
      </form>
  <div className="card p-4">
        <h2 className="text-lg font-medium mb-4">Usuarios existentes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Código</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">DNI</th>
                <th className="py-2 pr-4">Área</th>
                <th className="py-2 pr-4">Username</th>
                 <th className="py-2 pr-4">Rol</th>
                 <th className="py-2 pr-4">WhatsApp</th>
                 <th className="py-2 pr-4">Cumpleaños</th>
                 <th className="py-2 pr-4">Credenciales</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-4 font-mono text-xs">{u.personCode}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{u.personName}</span>
                      <button
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600"
                        onClick={() => setNameEdit(prev => ({ ...prev, [u.id]: { open: !prev[u.id]?.open, value: prev[u.id]?.value ?? (u.personName || '') } }))}
                      >Editar</button>
                    </div>
                    {nameEdit[u.id]?.open && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={nameEdit[u.id]?.value || ''}
                          onChange={e=> setNameEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], value: e.target.value } }))}
                          placeholder="Nombre completo"
                          className="input-xs w-[280px]"
                        />
                        <button
                          className="text-xs px-2 py-1 rounded bg-blue-600 disabled:opacity-50"
                          disabled={(nameEdit[u.id]?.value || '').trim().length < 2 || nameEdit[u.id]?.saving}
                          onClick={async () => {
                            try {
                              setNameEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: true } }));
                              const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ personName: (nameEdit[u.id]?.value || '').trim() }),
                              });
                              const j = await res.json().catch(()=>({}));
                              if (res.ok && j?.ok) {
                                setUsers(prev => prev.map(x => x.id === u.id ? { ...x, personName: (nameEdit[u.id]?.value || '').trim() } : x));
                                setMsg('Nombre actualizado'); setErr(null);
                                setNameEdit(prev => ({ ...prev, [u.id]: { open: false, value: '', saving: false } }));
                              } else {
                                const back = j?.code || j?.message || res.status;
                                setErr(`Error al actualizar nombre: ${back}`);
                                setNameEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: false } }));
                              }
                            } catch (e: any) {
                              setErr(`Error de red: ${String(e?.message || e)}`);
                              setNameEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: false } }));
                            }
                          }}
                        >{nameEdit[u.id]?.saving ? 'Guardando…' : 'Guardar'}</button>
                        <button
                          className="text-xs px-2 py-1 rounded bg-slate-600"
                          onClick={() => setNameEdit(prev => ({ ...prev, [u.id]: { open: false, value: '' } }))}
                        >Cancelar</button>
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">{u.dni || '-'}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{u.area || '-'}</span>
                      <button
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600"
                        onClick={() => setAreaEdit(prev => ({ ...prev, [u.id]: { open: !prev[u.id]?.open, value: prev[u.id]?.value ?? (u.area || ALLOWED_AREAS[0]) } }))}
                      >Editar</button>
                    </div>
                    {areaEdit[u.id]?.open && (
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={areaEdit[u.id]?.value || ''}
                          onChange={e=> setAreaEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], value: e.target.value } }))}
                          className="input-xs"
                        >
                          {ALLOWED_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <button
                          className="text-xs px-2 py-1 rounded bg-blue-600 disabled:opacity-50"
                          disabled={!areaEdit[u.id]?.value || areaEdit[u.id]?.saving}
                          onClick={async () => {
                            try {
                              setAreaEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: true } }));
                              const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ area: areaEdit[u.id]?.value })
                              });
                              const j = await res.json().catch(()=>({}));
                              if (res.ok && j?.ok) {
                                setUsers(prev => prev.map(x => x.id === u.id ? { ...x, area: areaEdit[u.id]?.value } : x));
                                setMsg('Área actualizada'); setErr(null);
                                setAreaEdit(prev => ({ ...prev, [u.id]: { open: false, value: '', saving: false } }));
                              } else {
                                const back = j?.code || j?.message || res.status;
                                setErr(`Error al actualizar área: ${back}`);
                                setAreaEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: false } }));
                              }
                            } catch (e: any) {
                              setErr(`Error de red: ${String(e?.message || e)}`);
                              setAreaEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: false } }));
                            }
                          }}
                        >{areaEdit[u.id]?.saving ? 'Guardando…' : 'Guardar'}</button>
                        <button className="text-xs px-2 py-1 rounded bg-slate-600" onClick={() => setAreaEdit(prev => ({ ...prev, [u.id]: { open: false, value: '' } }))}>Cancelar</button>
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">{u.username}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-700/60">{u.role}</span>
                      <button
                        className="text-[11px] px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600"
                        onClick={async () => {
                          const next = u.role === 'STAFF' ? 'COLLAB' : 'STAFF';
                          if (!confirm(`Cambiar rol de ${u.username} (${u.personCode}) a ${next}?`)) return;
                          try {
                            const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ role: next })
                            });
                            const j = await res.json().catch(()=>({}));
                            if (res.ok && j?.ok) {
                              setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: next } : x));
                              setMsg(`Rol actualizado a ${next}`); setErr(null);
                            } else {
                              const back = j?.code || j?.message || res.status;
                              setErr(`No se pudo cambiar rol: ${back}`);
                            }
                          } catch (e: any) {
                            setErr(`Error de red: ${String(e?.message || e)}`);
                          }
                        }}
                      >Cambiar</button>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{u.whatsapp || '-'}</span>
                      <button
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600"
                        onClick={() => setWaEdit(prev => ({ ...prev, [u.id]: { open: !prev[u.id]?.open, value: prev[u.id]?.value ?? (u.whatsapp || '') } }))}
                      >Editar</button>
                    </div>
                    {waEdit[u.id]?.open && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={waEdit[u.id]?.value || ''}
                          onChange={e=> setWaEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], value: e.target.value.replace(/[^0-9+]/g,'') } }))}
                          placeholder="WhatsApp"
                          className="input-xs w-[140px]"
                        />
                        <button
                          className="text-xs px-2 py-1 rounded bg-blue-600 disabled:opacity-50"
                          disabled={!waEdit[u.id]?.value || (waEdit[u.id]?.value||'').replace(/\D+/g,'').length < 8 || waEdit[u.id]?.saving}
                          onClick={async () => {
                            try {
                              setWaEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: true } }));
                              const res = await fetch(`/api/admin/users/${encodeURIComponent(u.id)}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ whatsapp: waEdit[u.id]?.value })
                              });
                              const j = await res.json().catch(()=>({}));
                              if (res.ok && j?.ok) {
                                setUsers(prev => prev.map(x => x.id === u.id ? { ...x, whatsapp: waEdit[u.id]?.value.replace(/\D+/g,'') } : x));
                                setMsg('WhatsApp actualizado'); setErr(null);
                                setWaEdit(prev => ({ ...prev, [u.id]: { open: false, value: '', saving: false } }));
                              } else {
                                const back = j?.code || j?.message || res.status;
                                setErr(`Error al actualizar WhatsApp: ${back}`);
                                setWaEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: false } }));
                              }
                            } catch (e: any) {
                              setErr(`Error de red: ${String(e?.message || e)}`);
                              setWaEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], saving: false } }));
                            }
                          }}
                        >{waEdit[u.id]?.saving ? 'Guardando…' : 'Guardar'}</button>
                        <button className="text-xs px-2 py-1 rounded bg-slate-600" onClick={() => setWaEdit(prev => ({ ...prev, [u.id]: { open: false, value: '' } }))}>Cancelar</button>
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">{u.birthday || '-'}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
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
                        <div className="text-xs p-2 rounded border border-emerald-700 bg-emerald-900/30 text-emerald-100 flex items-center justify-between gap-2">
                          <div>
                            <div><span className="opacity-70">Código:</span> <span className="font-mono tracking-wider text-base">{otp[u.id].code}</span></div>
                            <div className="opacity-80">Vence: {new Date(otp[u.id].expiresAt).toLocaleTimeString()}</div>
                          </div>
                          <button className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600" onClick={() => navigator.clipboard?.writeText(otp[u.id].code)}>Copiar</button>
                        </div>
                      )}
                      {pwEdit[u.id]?.open && (
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={pwEdit[u.id]?.value || ''}
                            onChange={e=> setPwEdit(prev => ({ ...prev, [u.id]: { ...prev[u.id], value: e.target.value } }))}
                            placeholder="Nueva contraseña (min 8)"
                            className="input-xs"
                          />
                          <button
                            className="text-xs px-2 py-1 rounded bg-blue-600 disabled:opacity-50"
                            disabled={(pwEdit[u.id]?.value || '').length < 8 || pwEdit[u.id]?.saving}
                            onClick={() => changePassword(u.id)}
                          >{pwEdit[u.id]?.saving ? 'Guardando…' : 'Guardar'}</button>
                          <button className="text-xs px-2 py-1 rounded bg-slate-600" onClick={() => setPwEdit(prev => ({ ...prev, [u.id]: { open: false, value: '' } }))}>Cancelar</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="py-3 text-gray-500" colSpan={9}>Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
