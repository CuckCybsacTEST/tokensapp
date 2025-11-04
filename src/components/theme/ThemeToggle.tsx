"use client";
import React from 'react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { resolved, theme, toggle, setTheme } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
          "border border-slate-200 dark:border-slate-600",
          "bg-slate-50 dark:bg-slate-800",
          "hover:bg-slate-100 dark:hover:bg-slate-700",
          "text-slate-700 dark:text-slate-300",
          "hover:scale-105 active:scale-95"
        )}
        title={"Cambiar a modo " + next}
        aria-label="Toggle theme"
      >
        <span className="text-lg">
          {resolved === 'dark' ? '🌙' : '☀️'}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
          "border border-slate-200 dark:border-slate-600",
          "bg-slate-50 dark:bg-slate-800",
          "hover:bg-slate-100 dark:hover:bg-slate-700",
          "text-slate-700 dark:text-slate-300",
          "hover:scale-105 active:scale-95"
        )}
        title={"Cambiar a modo " + next}
        aria-label="Toggle theme"
      >
        <span className="text-lg">
          {resolved === 'dark' ? '🌙' : '☀️'}
        </span>
      </button>
      <select
        aria-label="Seleccionar tema"
        className={cn(
          "hidden sm:block text-xs px-3 py-1.5 rounded-lg transition-all duration-200",
          "border border-slate-200 dark:border-slate-600",
          "bg-white dark:bg-slate-800",
          "text-slate-700 dark:text-slate-300",
          "hover:bg-slate-50 dark:hover:bg-slate-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
          "cursor-pointer"
        )}
        value={theme}
        onChange={(e)=> setTheme(e.target.value as any)}
      >
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
        <option value="system">Sistema</option>
      </select>
    </div>
  );
};

export default ThemeToggle;
