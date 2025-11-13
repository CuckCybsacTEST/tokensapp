"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { StaffRole } from '@prisma/client';

interface AdminHeaderProps {
  userData?: {
    personName?: string | null;
    dni?: string | null;
    jobTitle?: string | null;
    role?: string | null;
    staffRole?: StaffRole | null;
  } | null;
}

export default function AdminHeader({ userData }: AdminHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    // Si estamos en una página específica de admin, volver al dashboard principal
    if (window.location.pathname !== '/admin') {
      router.push('/admin');
    } else {
      // Si ya estamos en /admin, podríamos ir a /u o a otra página
      router.push('/u');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-2 sm:py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          {userData && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-200">
                {userData.personName || 'Administrador'}
              </div>
              {typeof userData.dni === 'string' && userData.dni.trim() !== '' && (
                <div className="opacity-80">
                  DNI: <span className="font-mono">{userData.dni}</span>
                </div>
              )}
              {(userData.jobTitle || userData.role) && (
                <div className="opacity-80">
                  {userData.role ? userData.role : (userData.jobTitle || 'Sin puesto')}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          {userData && (
            <button
              onClick={() => {
                // Logout functionality
                document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                window.location.href = '/u/login';
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Salir
            </button>
          )}
          <ThemeToggle compact />
        </div>
      </div>
    </header>
  );
}