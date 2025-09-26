"use client";
import { useEffect, useState } from 'react';
import { ALLOWED_AREAS } from '@/lib/areas';

interface UsersClientProps { role: string; }

export function UsersClient({ role }: UsersClientProps) {
  const isStaffReadOnly = role === 'STAFF';
  const [users, setUsers] = useState<any[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [msg, setMsg] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true); setErr(null);
    try { const r = await fetch('/api/admin/users'); const j = await r.json(); if (r.ok && j?.ok) setUsers(j.users||[]); } catch {}
    setLoading(false);
  }
  useEffect(()=>{ load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios (Admin)</h1>
        {isStaffReadOnly && <span className="text-xs rounded bg-slate-700/60 px-2 py-1">Vista sólo lectura STAFF</span>}
      </div>
      {msg && <div className="border border-green-700 bg-green-950/30 text-green-200 rounded p-3 text-sm">{msg}</div>}
      {err && <div className="border border-red-700 bg-red-950/30 text-red-200 rounded p-3 text-sm">{err}</div>}
      {!isStaffReadOnly && (
        <div className="rounded border border-amber-500/40 bg-amber-900/20 p-4 text-xs">
          La creación / edición completa permanece en la versión anterior (formulario completo). Este modo staff no crea usuarios.
        </div>
      )}

      <div className="border rounded p-4">
        <h2 className="text-lg font-medium mb-4">Usuarios existentes</h2>
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
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{u.personCode}</td>
                  <td className="py-2 pr-4">{u.personName}</td>
                  <td className="py-2 pr-4">{u.dni || '-'}</td>
                  <td className="py-2 pr-4">{u.area || '-'}</td>
                  <td className="py-2 pr-4">{u.username}</td>
                  <td className="py-2 pr-4"><span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-700/60">{u.role}</span></td>
                </tr>
              ))}
              {users.length===0 && !loading && (
                <tr><td className="py-3 text-gray-500" colSpan={6}>Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
