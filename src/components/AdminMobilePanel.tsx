"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';
import { AdminMobileHeader } from "@/components/AdminMobileHeader";

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

// Dynamic import to avoid SSR issues
const AutoAttendanceCard = dynamic(() => import('@/app/admin/AutoAttendanceCard'), { ssr: false });

// Icon constants to reduce duplication
const ICONS = {
  roulette: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  users: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  chart: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    </svg>
  ),
  check: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  box: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 01-2-2v2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  film: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0V1m10 3V1m0 3l1 1v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5l1-1z" />
    </svg>
  ),
  book: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  tag: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  cake: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2.01" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12 2l2.09 6.26L20.97 9l-5.18 3.76L17.82 20 12 15.9 6.18 20l2.03-7.24L3.03 9l6.88-.74L12 2z" />
    </svg>
  ),
  clock: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  music: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 19V6l12-2v13" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  gift: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  ),
  qr: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 21h4.01M16 12v4.01M16 15v4.01M20 12v4.01M20 15v4.01M12 4h4.01M16 7h4.01M20 7h4.01M12 7h4.01M12 4v3m4-3v3m4-3v3" />
    </svg>
  ),
  settings: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  trash: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
};

interface SidebarItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  children?: SidebarItem[];
}

interface SidebarGroup {
  title: string;
  icon: React.ReactNode;
  items: SidebarItem[];
}

interface AdminMobilePanelProps {
  basePath?: 'admin' | 'u';
  userInfo?: {
    role: string;
    displayName: string;
    dni?: string | null;
    area?: string | null;
    jobTitle?: string | null;
    code?: string | null;
  } | null;
}

export default function AdminMobilePanel({ basePath = 'admin', userInfo }: AdminMobilePanelProps) {
  const pathname = usePathname();

  const [attendanceState, setAttendanceState] = useState<{
    lastType: 'IN' | 'OUT' | null;
    nextAction: 'IN' | 'OUT';
    dayClosed: boolean;
  }>({
    lastType: null,
    nextAction: 'IN',
    dayClosed: false
  });

  const [activeTab, setActiveTab] = useState<'herramientas' | 'upgrade' | 'purge'>('herramientas');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Función para actualizar el estado de asistencia
  const updateAttendanceState = async () => {
    try {
      const r = await fetch('/api/attendance/me/recent', { cache: 'no-store' });
      if (r.status === 401) return;
      const j = await r.json().catch(() => null);
      const last = j?.recent;
      const completed = !!j?.completed;
      const lastType = last && (last.type === 'IN' || last.type === 'OUT') ? last.type : null;
      const dayClosed = completed || lastType === 'OUT';
      const nextAction: 'IN' | 'OUT' = lastType === 'IN' ? 'OUT' : 'IN';

      setAttendanceState({
        lastType,
        nextAction,
        dayClosed
      });
    } catch (e) {
      // Error silencioso
    }
  };

  // Actualizar estado de asistencia al montar
  useEffect(() => {
    updateAttendanceState();
  }, []);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  // Configuración dinámica basada en basePath
  const getSidebarGroups = (basePath: 'admin' | 'u'): SidebarGroup[] => {
    const pathPrefix = basePath === 'admin' ? '/admin' : '/u';

    const groups = [
      ...(basePath === 'admin' ? [{
        title: "MARCAR ENTRADA/SALIDA",
        icon: ICONS.clock,
        items: [
          { href: "/admin/assistance", label: "Marcar Entrada/Salida", icon: ICONS.check }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "ESTADÍSTICAS GLOBALES",
        icon: ICONS.chart,
        items: [
          { href: `${pathPrefix}/statics`, label: "Estadísticas Globales", icon: ICONS.chart }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "REGLAMENTO",
        icon: ICONS.book,
        items: [
          { href: `${pathPrefix}/regulations`, label: "Reglamento Interno", icon: ICONS.book }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "ESCÁNER MULTI-USO",
        icon: ICONS.qr,
        items: [
          { href: `${pathPrefix}/scanner`, label: "Escáner", icon: ICONS.qr }
        ]
      }] : []),
      {
        title: "TOKENS RULETA",
        icon: ICONS.roulette,
        items: basePath === 'admin' ? [
          { href: `${pathPrefix}/tokens`, label: "Panel de Control", icon: ICONS.chart },
          { href: `${pathPrefix}/prizes`, label: "Premios", icon: ICONS.star },
          { href: `${pathPrefix}/roulettebatches`, label: "Lotes", icon: ICONS.box },
          { href: `${pathPrefix}/printroulette`, label: "Imprimir Pulseras", icon: ICONS.check },
          { href: `${pathPrefix}/themes`, label: "Temas", icon: ICONS.star },
          { href: `${pathPrefix}/roulettebatches/purge`, label: "Purge", icon: ICONS.check }
        ] : [
          { href: `${pathPrefix}/tokens`, label: "Panel de Control", icon: ICONS.chart }
        ]
      },
      ...(basePath === 'admin' ? [{
        title: "LOTES INDIVIDUALES",
        icon: ICONS.box,
        items: [
          { href: `${pathPrefix}/prizesstatics`, label: "Premios", icon: ICONS.star },
          { href: `${pathPrefix}/static-batches`, label: "Lotes", icon: ICONS.box },
          { href: `${pathPrefix}/printstatics`, label: "Imprimir Pulseras", icon: ICONS.check }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "TOKENS REUTILIZABLES",
        icon: ICONS.qr,
        items: [
          { href: `${pathPrefix}/reusable-tokens`, label: "Gestión de Tokens", icon: ICONS.qr },
          { href: `${pathPrefix}/reusable-tokens/purge`, label: "Purge", icon: ICONS.check }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "SORTEOS QR",
        icon: ICONS.qr,
        items: [
          { href: `${pathPrefix}/sorteos-qr?tab=batches`, label: "Lotes", icon: ICONS.qr },
          { href: `${pathPrefix}/sorteos-qr?tab=policies`, label: "Políticas", icon: ICONS.check },
          { href: `${pathPrefix}/sorteos-qr/purge`, label: "Purge", icon: ICONS.box },
          { href: `${pathPrefix}/sorteos-qr?tab=stats`, label: "Estadísticas", icon: ICONS.chart },
          { href: "/qr-generator", label: "Generador Público", icon: ICONS.star }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "INTERCAMBIO CLIENTE",
        icon: ICONS.qr,
        items: [
          { href: `${pathPrefix}/intercambiocliente`, label: "Intercambios", icon: ICONS.qr },
          { href: `${pathPrefix}/intercambiocliente?tab=lotes`, label: "Lotes", icon: ICONS.box },
          { href: `${pathPrefix}/intercambiocliente?tab=politicas`, label: "Políticas", icon: ICONS.check },
          { href: `${pathPrefix}/intercambiocliente?tab=stats`, label: "Estadísticas", icon: ICONS.chart },
          { href: "/intercambio", label: "Página Pública", icon: ICONS.star }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTION DE OFERTAS",
        icon: ICONS.tag,
        items: [
          { href: `${pathPrefix}/offers`, label: "Panel de Ofertas", icon: ICONS.tag },
          { href: "/marketing#ofertas", label: "Ver en marketing", icon: ICONS.star }
        ]
      }] : []),
      {
        title: "GESTIÓN DE PERSONAL",
        icon: ICONS.users,
        items: basePath === 'admin' ? [
          { href: `${pathPrefix}/users`, label: "Colaboradores", icon: ICONS.users },
          { href: `${pathPrefix}/attendance`, label: "Control de Asistencia", icon: ICONS.chart }
        ] : [
          { href: `${pathPrefix}/attendance`, label: "Mi Asistencia", icon: ICONS.chart }
        ]
      },
      ...(basePath === 'admin' ? [{
        title: "GESTIÓN DE TAREAS",
        icon: ICONS.check,
        items: [
          { href: `${pathPrefix}/day-brief`, label: "Brief del día", icon: ICONS.check },
          { href: `${pathPrefix}/tasks`, label: "Tareas", icon: ICONS.check },
          { href: `${pathPrefix}/tasks/status`, label: "Métricas por colaborador", icon: ICONS.users },
          { href: `${pathPrefix}/tasks/metrics`, label: "Métricas de Tareas", icon: ICONS.chart }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTIÓN DE INVENTARIO",
        icon: ICONS.box,
        items: [
          { href: `${pathPrefix}/inventory/suppliers`, label: "Proveedores", icon: ICONS.box },
          { href: `${pathPrefix}/inventory/stock`, label: "Control de Stock", icon: ICONS.box },
          { href: `${pathPrefix}/inventory/alerts`, label: "Alertas", icon: ICONS.check },
          { href: `${pathPrefix}/inventory/units`, label: "Unidades", icon: ICONS.box }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTIÓN DE CUMPLEAÑOS",
        icon: ICONS.cake,
        items: [
          { href: `${pathPrefix}/birthdays`, label: "Reservas", icon: ICONS.cake },
          { href: `${pathPrefix}/birthdays/packs`, label: "Gestión de packs", icon: ICONS.box },
          { href: `${pathPrefix}/birthdays/referrers`, label: "Referrers", icon: ICONS.users },
          { href: `${pathPrefix}/birthdays/referrers/metrics`, label: "Métricas", icon: ICONS.chart },
          { href: `${pathPrefix}/birthdays/special-bottle`, label: "Botella especial", icon: ICONS.settings },
          { href: `${pathPrefix}/birthdays/purge`, label: "Purge", icon: ICONS.check }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTIÓN DE SHOWS",
        icon: ICONS.film,
        items: [
          { href: `${pathPrefix}/shows`, label: "Shows", icon: ICONS.film },
          { href: "/marketing#shows", label: "Ver en marketing", icon: ICONS.star }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "CONTENIDO VISUAL",
        icon: ICONS.film,
        items: [
          { href: `${pathPrefix}/marketing/gallery`, label: "Galería de Fotos", icon: ICONS.film }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "VENTA DE TICKETS",
        icon: ICONS.check,
        items: [
          { href: `${pathPrefix}/tickets`, label: "Tickets", icon: ICONS.check }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "CARTA & PEDIDOS",
        icon: ICONS.book,
        items: [
          { href: `${pathPrefix}/mesas`, label: "Gestión de Mesas", icon: ICONS.check },
          { href: `${pathPrefix}/menu`, label: "Gestión de Menú", icon: ICONS.book },
          { href: `${pathPrefix}/pedidos`, label: "Panel de Pedidos", icon: ICONS.chart },
          { href: "/menu", label: "Menú Público", icon: ICONS.star }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "UPGRADE",
        icon: ICONS.star,
        items: [
          { href: "#", label: "Personalización de la App", icon: ICONS.star },
          { href: "#", label: "Gestión de Trivias", icon: ICONS.check },
          { href: "#", label: "Pedidos Musicales", icon: ICONS.music },
          { href: "#", label: "Gestión de Fidelidad", icon: ICONS.star },
          { href: "#", label: "Gestión Wifi", icon: ICONS.qr }
        ]
      }] : []),
    ];

    return groups;
  };

  const allGroups = getSidebarGroups(basePath);
  const sidebarGroups = allGroups.filter(group => {
    if (activeTab === 'upgrade') {
      return group.title === 'UPGRADE';
    }
    if (activeTab === 'purge') {
      return group.items.some(item => item.href.includes('/purge'));
    }
    return group.title !== 'UPGRADE';
  }).map(group => {
    if (activeTab === 'purge') {
      if (group.title === 'TOKENS RULETA') {
        return { ...group, title: 'Eliminar LOTES RULETAS/ESTÁTICOS' };
      }
      if (group.title === 'GESTIÓN DE CUMPLEAÑOS') {
        return { ...group, title: 'ELIMINAR RESERVAS' };
      }
    }
    return group;
  });

  const isItemActive = (href: string) => {
    if (href === "#") return false;
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="block md:hidden min-h-screen bg-slate-50 dark:bg-slate-900 p-2 sm:p-3 lg:p-6">
      {/* Header similar to /u layout */}
      <AdminMobileHeader userInfo={userInfo} />

      <div className="max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('herramientas')}
              className={cn(
                "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
                activeTab === 'herramientas'
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              Herramientas
            </button>
            <button
              onClick={() => setActiveTab('purge')}
              className={cn(
                "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
                activeTab === 'purge'
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
              )}
            >
              Purge
            </button>
            <button
              onClick={() => setActiveTab('upgrade')}
              className={cn(
                "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors relative",
                activeTab === 'upgrade'
                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <span className="flex items-center justify-center">
                Upgrade!
                {(activeTab === 'herramientas' || activeTab === 'purge') && (
                  <span className="ml-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Subtítulo para Upgrade */}
        {activeTab === 'upgrade' && (
          <div className="mb-4 sm:mb-6 text-center">
            <p className="text-sm sm:text-base text-amber-700 dark:text-amber-300 font-medium">
              🚀 Estas son herramientas premium que puedes desbloquear contactando con nuestro equipo de desarrollo
            </p>
            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-1">
              Mejora tu experiencia con funciones avanzadas de gestión
            </p>
          </div>
        )}

        {/* Subtítulo para Purge */}
        {activeTab === 'purge' && (
          <div className="mb-4 sm:mb-6 text-center">
            <p className="text-sm sm:text-base text-red-700 dark:text-red-300 font-medium">
              ⚠️ Herramientas de limpieza y mantenimiento del sistema
            </p>
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1">
              Usa con precaución - estas acciones no se pueden deshacer
            </p>
          </div>
        )}

        {/* Grid de categorías */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {sidebarGroups.map((group, groupIndex) => (
            <div
              key={group.title}
              className={cn(
                "bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden",
                group.title === "ESCÁNER INTEGRADO" ? "col-span-full sm:col-span-2 lg:col-span-3 xl:col-span-4" : ""
              )}
            >
              {/* Header de la categoría */}
              {group.title === "ESCÁNER INTEGRADO" ? (
                <Link
                  href={`${basePath === 'admin' ? '/admin' : '/u'}/scanner`}
                  className="block p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      {group.icon}
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {group.title}
                    </h2>
                  </div>
                </Link>
              ) : group.title.includes("PERSONALIZACIÓN APP UPGRADE") || group.title.includes("DISPONIBLE CON UN UPGRADE") || group.title.includes("PEDIDOS MUSICALES UPGRADE") || group.title.includes("GESTIÓN DE FIDELIDAD UPGRADE") || group.title.includes("GESTIÓN WIFI UPGRADE") ? (
                <div className="p-3 sm:p-4 border-b border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
                      {group.icon}
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-amber-800 dark:text-amber-200">
                      {group.title === "PERSONALIZACIÓN APP UPGRADE" ? "Personalización de la App" : group.title === "PEDIDOS MUSICALES UPGRADE" ? "Pedidos Musicales" : group.title === "GESTIÓN DE FIDELIDAD UPGRADE" ? "Gestión de Fidelidad" : group.title === "GESTIÓN WIFI UPGRADE" ? "Gestión Wifi" : "Gestión de Trivias"}
                    </h2>
                  </div>
                </div>
              ) : activeTab === 'purge' ? (
                <Link
                  href={group.items.find(item => item.href.includes('/purge'))?.href || '#'}
                  className="block p-3 sm:p-4 border-b border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400">
                      {ICONS.trash}
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-red-800 dark:text-red-200 uppercase">
                      {group.title}
                    </h2>
                    <svg
                      className="h-5 w-5 text-red-500 dark:text-red-400 ml-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ) : (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        {group.icon}
                      </div>
                      <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {group.title}
                      </h2>
                    </div>
                    <svg
                      className={cn(
                        "h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform",
                        expandedGroups.has(group.title) ? "rotate-180" : ""
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
              )}

              {/* Items de la categoría */}
              {(group.title === "MARCAR ENTRADA/SALIDA" || (activeTab === 'purge' ? false : expandedGroups.has(group.title) && !group.title.includes("PERSONALIZACIÓN APP UPGRADE") && !group.title.includes("DISPONIBLE CON UN UPGRADE") && !group.title.includes("PEDIDOS MUSICALES UPGRADE") && !group.title.includes("GESTIÓN DE FIDELIDAD UPGRADE") && !group.title.includes("GESTIÓN WIFI UPGRADE"))) && (
                <div className="p-3 sm:p-4">
                  {group.title === "MARCAR ENTRADA/SALIDA" ? (
                    <AutoAttendanceCard showDynamicTitle={false} />
                  ) : (
                    <div className="space-y-2">
                      {group.items.map((item, itemIndex) => (
                        <Link
                          key={`${group.title}-${itemIndex}`}
                          href={item.href}
                          className={cn(
                            "flex items-center space-x-3 p-2 sm:p-3 rounded-lg transition-all duration-200",
                            isItemActive(item.href)
                              ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "p-1 sm:p-1.5 rounded-md",
                            isItemActive(item.href)
                              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                          )}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              "text-sm font-medium block truncate",
                              isItemActive(item.href)
                                ? "text-blue-900 dark:text-blue-100"
                                : "text-slate-900 dark:text-slate-100"
                            )}>
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 mt-1">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <svg
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              isItemActive(item.href)
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-400 dark:text-slate-500"
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 lg:mt-12 text-center">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Panel de administración móvil · Go Lounge
          </p>
        </div>
      </div>
    </div>
  );
}