"use client";
import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function ChangePasswordClient() {
  const params = useSearchParams();
  const next = params ? params.get("next") || "/u" : "/u";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden");
      setPending(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres");
      setPending(false);
      return;
    }

    try {
      const res = await fetch("/api/user/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error cambiando contraseña");
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = next;
      }, 2000);
      return;
    } catch (er: any) {
      setError(er.message);
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block rounded-full h-16 w-16 bg-green-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-green-600">Contraseña cambiada exitosamente</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-sm space-y-8 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Cambiar Contraseña</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Por seguridad, debes cambiar tu contraseña antes de continuar.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-6 card">
        <div className="card-body space-y-4">
          <div className="form-row">
            <label className="text-xs font-medium">Contraseña Actual</label>
            <div className="relative">
              <input
                type={showCurrentPwd ? "text" : "password"}
                className="input pr-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                aria-label={showCurrentPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showCurrentPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowCurrentPwd(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-500 hover:text-slate-700"
              >
                {showCurrentPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 4.24A9.53 9.53 0 0112 4c5 0 9 4 9 8 0 1.41-.43 2.73-1.17 3.86M6.17 6.17C4.43 7.27 3 9.1 3 12c0 4 4 8 9 8 1.41 0 2.73-.43 3.86-1.17" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="form-row">
            <label className="text-xs font-medium">Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showNewPwd ? "text" : "password"}
                className="input pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                aria-label={showNewPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showNewPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowNewPwd(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-500 hover:text-slate-700"
              >
                {showNewPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58M9.88 4.24A9.53 9.53 0 0112 4c5 0 9 4 9 8 0 1.41-.43 2.73-1.17 3.86M6.17 6.17C4.43 7.27 3 9.1 3 12c0 4 4 8 9 8 1.41 0 2.73-.43 3.86-1.17" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="form-row">
            <label className="text-xs font-medium">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button disabled={pending} className="btn w-full" type="submit">
            {pending ? "Cambiando…" : "Cambiar Contraseña"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Cargando…</div>}>
      <ChangePasswordClient />
    </Suspense>
  );
}