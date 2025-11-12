"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme/ThemeToggle";

// Admin logout button component
function AdminLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/user/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/admin/login";
      } else {
        window.location.href = "/admin/login";
      }
    } catch {
      window.location.href = "/admin/login";
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1 rounded-md text-slate-800 dark:text-slate-200 transition-colors"
      aria-label="Cerrar sesión"
    >
      {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}

interface AdminMobileHeaderProps {
  userInfo?: {
    displayName?: string;
    dni?: string | null;
    role?: string;
    area?: string | null;
    jobTitle?: string | null;
  } | null;
  basePath?: 'admin' | 'u';
}

export function AdminMobileHeader({ userInfo, basePath = 'admin' }: AdminMobileHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Solo mostrar back en rutas profundas dentro de /admin
  let backHref: string | null = null;
  if (pathname && pathname.startsWith('/admin')) {
    const segments = pathname.split('/').filter(Boolean); // e.g. ['', 'admin', 'users', '123'] -> ['admin','users','123']
    if (segments.length > 1) {
      // Remove last segment to go up one level
      const parentSegments = segments.slice(0, segments.length - 1);
      backHref = '/' + parentSegments.join('/');
      // Special case: if parent is just 'admin', keep '/admin'
      if (backHref === '/admin') {
        // On the root admin page we hide the back button
        if (segments.length === 1) backHref = null;
      }
    }
  }

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.push('/admin');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 app-container py-2 sm:py-3 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <a href="/admin" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">Administración</a>
          {userInfo && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-200">{userInfo.displayName || 'Usuario'}</div>
              {typeof userInfo.dni === 'string' && userInfo.dni.trim() !== '' && (
                <div className="opacity-80">DNI: <span className="font-mono">{userInfo.dni}</span></div>
              )}
              {(userInfo.role || userInfo.area || userInfo.jobTitle) && (
                <div className="opacity-80">
                  {userInfo.role || userInfo.area || userInfo.jobTitle || 'Sin rol'}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {backHref && (
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
              title="Volver"
            >
              <span className="hidden sm:inline">← Atrás</span>
              <span className="sm:hidden">←</span>
            </button>
          )}
          {userInfo ? (
            <>
              <AdminLogoutButton />
              <ThemeToggle compact />
            </>
          ) : (
            <ThemeToggle compact />
          )}
        </div>
      </div>
    </header>
  );
}