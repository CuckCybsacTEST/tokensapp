"use client";
import React from 'react';
import { useTheme } from './ThemeProvider';

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { resolved, theme, toggle, setTheme } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <div className={`inline-flex items-center gap-1 ${compact ? '' : 'text-xs'}`}>
      <button
        type="button"
        onClick={toggle}
        className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        title={"Cambiar a modo " + next}
        aria-label="Toggle theme"
      >
        {resolved === 'dark' ? '🌙' : '☀️'}
      </button>
      <select
        aria-label="Seleccionar tema"
        className="hidden sm:inline-block input-xs w-auto cursor-pointer !py-1 !px-2"
        value={theme}
        onChange={(e)=> setTheme(e.target.value as any)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
};

export default ThemeToggle;
