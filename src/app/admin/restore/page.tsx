"use client";
import React, { useState } from 'react';

export default function AdminRestorePage() {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setOut("");
    try {
      const res = await fetch('/api/admin/restore', { method: 'POST', body: fd });
      const json = await res.json();
      setOut(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setOut(`error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Restaurar batches desde ZIPs</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="file" name="file" multiple accept=".zip" className="block" />
        <button disabled={busy} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50">
          {busy ? 'Procesando…' : 'Subir y restaurar'}
        </button>
      </form>
      {out && (
        <pre className="mt-4 p-2 bg-gray-100 rounded text-sm overflow-auto whitespace-pre-wrap">{out}</pre>
      )}
    </div>
  );
}
