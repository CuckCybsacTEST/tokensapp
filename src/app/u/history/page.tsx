"use client";
import { useEffect, useState } from "react";
// Uso de estilos tailwind proviene del root layout (no importar globals.css localmente)

type Item = { id: string; scannedAt: string; type: 'IN'|'OUT'; deviceId?: string|null };

export default function UserHistoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/attendance/me/history');
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.code || 'ERROR');
        setItems(json.items || []);
      } catch (e: any) {
        setError(e?.message || 'ERROR');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Mi historial</h1>
      {loading && <div className="text-sm text-slate-500">Cargando…</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {!loading && !error && (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">{new Date(it.scannedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={"rounded px-2 py-0.5 text-xs font-medium " + (it.type === 'IN' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white')}>
                      {it.type === 'IN' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="px-3 py-2">{it.deviceId || '-'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-500">Sin registros todavía</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
