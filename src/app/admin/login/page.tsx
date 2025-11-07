"use client";
import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const params = useSearchParams();
  const next = params ? params.get("next") || "/admin" : "/admin";

  useEffect(() => {
    // Redirect to unified login with admin context
    const timer = setTimeout(() => {
      window.location.href = `/u/login?next=${encodeURIComponent(next)}&from=admin`;
    }, 2000);

    return () => clearTimeout(timer);
  }, [next]);

  return (
    <main className="mx-auto max-w-md space-y-8 py-16 px-4">
      <div className="space-y-4 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Sistema Unificado de Autenticación
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          El sistema de autenticación ha sido unificado. Todos los usuarios ahora inician sesión desde el mismo lugar.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Para administradores:</strong> Use sus credenciales de usuario para acceder al panel de administración.
          </p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Redirigiendo al login unificado...
        </p>
      </div>
    </main>
  );
}
