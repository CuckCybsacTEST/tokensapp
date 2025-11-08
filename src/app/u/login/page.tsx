"use client";
import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function LoginClient() {
  const params = useSearchParams();
  const requestedNext = params ? params.get("next") || "" : "";
  const from = params ? params.get("from") || "" : "";
  const [dniOrUser, setDniOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  // AVISO TEMPORAL: Modal de mantenimiento post incidente de datos

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/user/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: dniOrUser, dni: dniOrUser, password })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "LOGIN_FAIL");
      }

  const data = await res.json().catch(() => ({}));
  const role: string | undefined = data.role;
  const defaultByRole = role === 'ADMIN' ? '/admin' : role === 'STAFF' ? '/u' : '/u';
  const next = requestedNext && requestedNext.trim() !== '' ? requestedNext : defaultByRole;
      
      if (data.forcePasswordChange) {
        // Redirect to password change page
        setRedirecting(true);
        setTimeout(() => {
          window.location.href = "/u/change-password?next=" + encodeURIComponent(next);
        }, 100);
        return;
      }

      setRedirecting(true);
      setTimeout(() => {
        window.location.href = next;
      }, 100);
      return;
    } catch (er: any) {
      setError(er.message === "INVALID_CREDENTIALS" ? "Credenciales inválidas" : er.message);
    } finally {
      setPending(false);
    }
  }

  return redirecting ? (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ingresando…</p>
      </div>
    </div>
  ) : (
    <main className="mx-auto max-w-sm space-y-8 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Acceso Colaborador</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Inicia sesión para usar el scanner.</p>
      </div>
      <form onSubmit={submit} className="space-y-6 card">
        <div className="card-body space-y-4">
          <div className="form-row">
            <label className="text-xs font-medium">DNI o Usuario</label>
            <input
              type="text"
              className="input"
              value={dniOrUser}
              onChange={(e) => setDniOrUser(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-row">
            <label className="text-xs font-medium">Contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                className="input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPwd(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-500 hover:text-slate-700"
              >
                {showPwd ? (
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
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button disabled={pending} className="btn w-full" type="submit">
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function UserLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Cargando…</div>}>
      <LoginClient />
    </Suspense>
  );
}
