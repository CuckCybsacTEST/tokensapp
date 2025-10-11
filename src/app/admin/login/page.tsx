"use client";
import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function LoginClient() {
  const params = useSearchParams();
  const next = params ? params.get("next") || "/admin" : "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "LOGIN_FAIL");
      }
      setRedirecting(true);
      setTimeout(() => { window.location.href = next; }, 100);
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
        <p className="text-sm text-slate-500 dark:text-slate-400">Ingresando al panel de administración...</p>
      </div>
    </div>
  ) : (
    <main className="mx-auto max-w-sm space-y-8 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Acceso Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Introduce tus credenciales para acceder.</p>
      </div>
      <form onSubmit={submit} className="space-y-6 card">
        <div className="card-body space-y-4">
          <div className="form-row">
            <label className="text-xs font-medium">Usuario</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-row">
            <label className="text-xs font-medium">Contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Cargando…</div>}>
      <LoginClient />
    </Suspense>
  );
}
