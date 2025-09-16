"use client";
import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../../globals.css";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
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
      
      // Mostrar un estado de redirección
      setRedirecting(true);
      
      // Pequeño retraso para asegurar que la cookie se ha establecido
      setTimeout(() => {
        // Usar una redirección completa en lugar de router.replace
        window.location.href = next;
      }, 100);
      
      return; // Importante para evitar que el código continúe
    } catch (er: any) {
      setError(er.message === "INVALID_CREDENTIALS" ? "Credenciales inválidas" : er.message);
    } finally {
      setPending(false);
    }
  }
  
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
        {redirecting ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Accediendo al panel de administración...</p>
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
                <button 
                  disabled={pending} 
                  className="btn w-full" 
                  type="submit"
                >
                  {pending ? "Entrando…" : "Entrar"}
                </button>
              </div>
            </form>
          </main>
        )}
      </body>
    </html>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Cargando…</div>}>
      <LoginClient />
    </Suspense>
  );
}
