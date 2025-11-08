"use client";

import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { ArrowLeft } from 'lucide-react';

export default function SmartBackLink() {
  const { getPreviousPage, navigateBack, currentPath } = useNavigationHistory();

  // Don't show back link on main /u page
  if (currentPath === "/u") return null;

  const previousPage = getPreviousPage();
  const fallbackToHome = !previousPage;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigateBack();
  };

  // Get display text based on destination
  const getDisplayText = () => {
    if (fallbackToHome) return "← Volver";

    // Extract meaningful name from path
    const pathSegments = previousPage!.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Map common paths to friendly names
    const pathNames: Record<string, string> = {
      'trabajo': 'Trabajo',
      'birthdays': 'Cumpleaños',
      'menu': 'Menú',
      'pedidos': 'Pedidos',
      'caja': 'Caja',
      'mesas': 'Mesas',
      'profile': 'Perfil',
      'attendance': 'Asistencia',
      'checklist': 'Checklist',
      'tokens': 'Tokens',
      'users': 'Usuarios',
      'restaurant': 'Restaurante',
      'scanner': 'Scanner',
      'tasks': 'Tareas',
      'history': 'Historial'
    };

    return `← ${pathNames[lastSegment] || 'Atrás'}`;
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
      title={fallbackToHome ? "Volver al inicio" : `Volver a ${getDisplayText().substring(2)}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">{getDisplayText()}</span>
      <span className="sm:hidden">←</span>
    </button>
  );
}