"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Theme tokens supported
export type AppTheme = 'light' | 'dark' | 'system';

interface ThemeCtx {
  theme: AppTheme;              // user selected (or 'system')
  resolved: 'light' | 'dark';   // actual applied
  setTheme: (t: AppTheme) => void;
  toggle: () => void;           // light <-> dark (keeping system if explicitly chosen)
}

const ThemeContext = createContext<ThemeCtx | null>(null);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const STORAGE_KEY = 'app-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode; initial?: AppTheme }>= ({ children, initial = 'system' }) => {
  const [theme, setThemeState] = useState<AppTheme>(initial);
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => initial === 'system' ? getSystemTheme() : (initial as 'light' | 'dark'));

  // Apply class to <html>
  const apply = useCallback((mode: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.classList.remove('light','dark');
    html.classList.add(mode);
  }, []);

  const syncServer = useCallback((t: AppTheme) => {
    // Heurística simple: si existe algún cookie de sesión, intentamos persistir en servidor.
    try {
      if (typeof document !== 'undefined' && /(?:admin_session|user_session|session)=/.test(document.cookie)) {
        fetch('/api/theme', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ theme: t }) }).catch(()=>{});
      }
    } catch {}
  }, []);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
    syncServer(t);
  }, [syncServer]);

  const toggle = useCallback(() => {
    setThemeState(prev => {
      let next: AppTheme;
      if (prev === 'system') {
        const sys = getSystemTheme();
        next = sys === 'dark' ? 'light' : 'dark';
      } else {
        next = prev === 'dark' ? 'light' : 'dark';
      }
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      syncServer(next);
      return next;
    });
  }, [syncServer]);

  // On mount: read storage & watch system preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
      if (saved && ['light','dark','system'].includes(saved)) {
        setThemeState(saved);
        setResolved(saved === 'system' ? getSystemTheme() : (saved as 'light' | 'dark'));
        apply(saved === 'system' ? getSystemTheme() : (saved as 'light' | 'dark'));
      } else {
        apply(resolved);
      }
    } catch {}
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setResolved(prev => {
        const next = theme === 'system' ? getSystemTheme() : (theme as 'light' | 'dark');
        apply(next);
        return next;
      });
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [apply, theme, resolved]);

  // When theme state changes (explicit), update resolved + DOM
  useEffect(() => {
    const next = theme === 'system' ? getSystemTheme() : theme;
    setResolved(next);
    apply(next);
  }, [theme, apply]);

  const value: ThemeCtx = { theme, resolved, setTheme, toggle };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
