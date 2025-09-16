"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  onCreated?: (person: any) => void;
};

export default function NewPersonForm({ onCreated }: Props) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const fe: Record<string, string> = {};
    const codeT = code.trim();
    const nameT = name.trim();
    if (!codeT || codeT.length < 3 || codeT.length > 40) fe.code = 'Entre 3 y 40 caracteres';
    if (!/^[A-Za-z0-9_.\-]+$/.test(codeT)) fe.code = 'Solo letras, números, guiones, guion bajo y punto';
    if (!nameT || nameT.length < 2 || nameT.length > 120) fe.name = 'Entre 2 y 120 caracteres';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), name: name.trim(), active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.error === 'VALIDATION' && data.details) {
          setFieldErrors(data.details);
          setError('Revisa los campos.');
        } else if (res.status === 409) {
          setFieldErrors({ code: 'Ya existe un registro con este código' });
          setError('Código duplicado.');
        } else if (res.status === 429) {
          setError('Demasiadas solicitudes, espera unos segundos.');
        } else if (res.status === 401 || res.status === 403) {
          setError('No autorizado.');
        } else {
          setError('Error inesperado.');
        }
        return;
      }
  const person = await res.json();
  setCode("");
  setName("");
  setActive(true);
  setFieldErrors({});
  if (onCreated) onCreated(person);
  else router.refresh();
    } catch (err: any) {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Nueva persona</h3>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Activa
        </label>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">Código</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="EMP-0001"
            className={`w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.code ? 'border-red-500' : 'border-gray-300'}`}
            maxLength={40}
            required
          />
          {fieldErrors.code && <p className="mt-1 text-xs text-red-600">{fieldErrors.code}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre y apellido"
            className={`w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'}`}
            maxLength={120}
            required
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? 'Guardando…' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
