"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/theme/ThemeToggle";

// Icon constants to reduce duplication
const ICONS = {
  roulette: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  rouletteSmall: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  users: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  usersSmall: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  chart: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    </svg>
  ),
  check: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  checkSmall: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  box: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  film: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0V1m10 3V1m0 3l1 1v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5l1-1z" />
    </svg>
  ),
  filmSmall: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0V1m10 3V1m0 3l1 1v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5l1-1z" />
    </svg>
  ),
  book: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  tag: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  cake: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2.01" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2l2.09 6.26L20.97 9l-5.18 3.76L17.82 20 12 15.9 6.18 20l2.03-7.24L3.03 9l6.88-.74L12 2z" />
    </svg>
  ),
  starSmall: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 2l2.09 6.26L20.97 9l-5.18 3.76L17.82 20 12 15.9 6.18 20l2.03-7.24L3.03 9l6.88-.74L12 2z" />
    </svg>
  ),
  clock: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  music: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 19V6l12-2v13" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  gift: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  ),
  qr: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 21h4.01M16 12v4.01M16 15v4.01M20 12v4.01M20 15v4.01M12 4h4.01M16 7h4.01M20 7h4.01M12 7h4.01M12 4v3m4-3v3m4-3v3" />
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

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  basePath?: 'admin' | 'u';
}

export function AdminSidebar({ isCollapsed = false, onToggle, basePath = 'admin' }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["TOKENS RULETA"]));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userInfo, setUserInfo] = useState<{ 
    role: string; 
    displayName: string;
    dni: string | null;
    area: string | null;
    jobTitle: string | null;
    code: string | null;
  } | null>(null);

  // Función para obtener información del usuario desde las cookies
  const getUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
      } else {
        // Si no hay sesión, mostrar como invitado
        setUserInfo({ role: 'GUEST', displayName: 'Invitado', dni: null, area: null, jobTitle: null, code: null });
      }
    } catch (error) {
      console.error('Error obteniendo información del usuario:', error);
      setUserInfo({ role: 'GUEST', displayName: 'Invitado', dni: null, area: null, jobTitle: null, code: null });
    }
  };

  // Obtener información del usuario al montar el componente
  useEffect(() => {
    getUserInfo();
  }, []);

  // Configuración dinámica basada en basePath
  const getSidebarGroups = (basePath: 'admin' | 'u'): SidebarGroup[] => {
    const pathPrefix = basePath === 'admin' ? '/admin' : '/u';

    return [
      {
        title: "TOKENS RULETA",
        icon: ICONS.roulette,
        items: basePath === 'admin' ? [
          { href: `${pathPrefix}/tokens`, label: "Panel de Control", icon: ICONS.chart },
          { href: `${pathPrefix}/prizes`, label: "Premios", icon: ICONS.starSmall },
          { href: `${pathPrefix}/roulettebatches`, label: "Lotes", icon: ICONS.box },
          { href: `${pathPrefix}/printroulette`, label: "Imprimir Pulseras", icon: ICONS.checkSmall },
          { href: `${pathPrefix}/themes`, label: "Temas", icon: ICONS.starSmall },
          { href: `${pathPrefix}/roulettebatches/purge`, label: "Purge", icon: ICONS.check }
        ] : [
          { href: `${pathPrefix}/tokens`, label: "Panel de Control", icon: ICONS.chart }
        ]
      },
      ...(basePath === 'admin' ? [{
        title: "LOTES INDIVIDUALES",
        icon: ICONS.box,
        items: [
          { href: `${pathPrefix}/prizesstatics`, label: "Premios", icon: ICONS.starSmall },
          { href: `${pathPrefix}/static-batches`, label: "Lotes", icon: ICONS.box },
          { href: `${pathPrefix}/printstatics`, label: "Imprimir Pulseras", icon: ICONS.checkSmall }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "TOKENS REUTILIZABLES",
        icon: ICONS.qr,
        items: [
          { href: `${pathPrefix}/reusable-tokens`, label: "Gestión de Tokens", icon: ICONS.qr }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "QR PERSONALIZADOS",
        icon: ICONS.qr,
        items: [
          { href: `${pathPrefix}/custom-qrs`, label: "Gestión de QR", icon: ICONS.qr },
          { href: "/qr-generator", label: "Generador Público", icon: ICONS.starSmall }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTION DE OFERTAS",
        icon: ICONS.tag,
        items: [
          { href: `${pathPrefix}/offers`, label: "Panel de Ofertas", icon: ICONS.tag },
          { href: "/marketing#ofertas", label: "Ver en marketing", icon: ICONS.starSmall }
        ]
      }] : []),
      {
        title: "GESTIÓN DE PERSONAL",
        icon: ICONS.users,
        items: basePath === 'admin' ? [
          // Reordered: Colaboradores first, then Control de Asistencia
          { href: `${pathPrefix}/users`, label: "Colaboradores", icon: ICONS.usersSmall },
          { href: `${pathPrefix}/attendance`, label: "Control de Asistencia", icon: ICONS.chart }
        ] : [
          { href: `${pathPrefix}/attendance`, label: "Mi Asistencia", icon: ICONS.chart }
        ]
      },
      ...(basePath === 'admin' ? [{
        title: "GESTIÓN DE TAREAS",
        icon: ICONS.check,
        items: [
          // Put Brief del día first
          { href: `${pathPrefix}/day-brief`, label: "Brief del día", icon: ICONS.checkSmall },
          { href: `${pathPrefix}/tasks`, label: "Tareas", icon: ICONS.checkSmall },
          { href: `${pathPrefix}/tasks/status`, label: "Métricas por colaborador", icon: ICONS.usersSmall },
          { href: `${pathPrefix}/tasks/metrics`, label: "Métricas de Tareas", icon: ICONS.chart }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTIÓN DE INVENTARIO",
        icon: ICONS.box,
        items: [
          { href: `${pathPrefix}/inventory/suppliers`, label: "Proveedores", icon: ICONS.box },
          { href: `${pathPrefix}/inventory/stock`, label: "Control de Stock", icon: ICONS.box },
          { href: `${pathPrefix}/inventory/alerts`, label: "Alertas", icon: ICONS.checkSmall },
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
          { href: `${pathPrefix}/birthdays/purge`, label: "Purge", icon: ICONS.check }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTIÓN DE SHOWS",
        icon: ICONS.film,
        items: [
          { href: `${pathPrefix}/shows`, label: "Shows", icon: ICONS.filmSmall },
          { href: "/marketing#shows", label: "Ver en marketing", icon: ICONS.starSmall }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "VENTA DE TICKETS",
        icon: ICONS.check,
        items: [
          { href: `${pathPrefix}/tickets`, label: "Tickets", icon: ICONS.checkSmall }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "CARTA & PEDIDOS",
        icon: ICONS.book,
        items: [
          { href: `${pathPrefix}/mesas`, label: "Gestión de Mesas", icon: ICONS.checkSmall },
          { href: `${pathPrefix}/menu`, label: "Gestión de Menú", icon: ICONS.book },
          { href: `${pathPrefix}/pedidos`, label: "Panel de Pedidos", icon: ICONS.chart },
          { href: "/menu", label: "Menú Público", icon: ICONS.starSmall }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "UPGRADE",
        icon: ICONS.star,
        items: [
          { href: "#", label: "Personalización de la App", icon: ICONS.star },
          { href: "#", label: "Gestión de Trivias", icon: ICONS.checkSmall },
          { href: "#", label: "Pedidos Musicales", icon: ICONS.music },
          { href: "#", label: "Gestión de Fidelidad", icon: ICONS.star },
          { href: "#", label: "Gestión Wifi", icon: ICONS.qr }
        ]
      }] : [])
    ];
  };

  const sidebarGroups = getSidebarGroups(basePath);

  const toggleGroup = (groupTitle: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
  };

  const handleGroupClick = (groupTitle: string) => {
    if (isCollapsed && onToggle) {
      // If collapsed, expand sidebar first
      onToggle();
    }
    // Then toggle the group
    toggleGroup(groupTitle);
  };

  const isItemActive = (href: string) => {
    if (href === "#") return false;
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isGroupActive = (group: SidebarGroup) => {
    return group.items.some(item => isItemActive(item.href));
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: "POST" });
      if (res.ok) {
        // Clear user info immediately after successful logout
        setUserInfo({ role: 'GUEST', displayName: 'Invitado', dni: null, area: null, jobTitle: null, code: null });
        // Use window.location for full page reload to re-evaluate server-side layout
        window.location.href = '/u/login';
      } else {
        // Clear user info even on logout failure to be safe
        setUserInfo({ role: 'GUEST', displayName: 'Invitado', dni: null, area: null, jobTitle: null, code: null });
        window.location.href = '/u/login';
      }
    } catch {
      // Clear user info on error as well
  setUserInfo({ role: 'GUEST', displayName: 'Invitado', dni: null, area: null, jobTitle: null, code: null });
  window.location.href = '/u/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Ensure the group for the current route is expanded so the active item is visible/highlighted
  useEffect(() => {
    const next = new Set(expandedGroups);
    sidebarGroups.forEach((group) => {
      if (group.items.some((it) => isItemActive(it.href))) {
        next.add(group.title);
      }
    });
    // Only update state if something actually changed to avoid unnecessary renders
    if (next.size !== expandedGroups.size || Array.from(next).some((k) => !expandedGroups.has(k))) {
      setExpandedGroups(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, basePath]);

  return (
    <div className={cn(
      "flex flex-col h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {userInfo ? userInfo.displayName.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm truncate">
                {userInfo ? userInfo.displayName : 'Cargando...'}
              </span>
              {userInfo && userInfo.role !== 'GUEST' && (
                <div className="space-y-0.5 mt-1">
                  {userInfo.dni && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      DNI: {userInfo.dni}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Rol: {userInfo.role}
                  </span>
                  {userInfo.area && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Área: {userInfo.area}
                    </span>
                  )}
                  {userInfo.jobTitle && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Cargo: {userInfo.jobTitle}
                    </span>
                  )}
                </div>
              )}
              {userInfo && userInfo.role === 'GUEST' && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {userInfo.role}
                </span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Theme Toggle Container */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Tema
            </span>
          )}
          <ThemeToggle compact={isCollapsed} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-2 px-3">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {/* Group Header */}
              {group.title === "UPGRADE" ? (
                <button
                  onClick={() => handleGroupClick(group.title)}
                  className={cn(
                    "w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-md transition-colors hover:opacity-80",
                    isCollapsed && "justify-center",
                    isGroupActive(group) && "text-amber-700 dark:text-amber-300"
                  )}
                >
                  <span className="flex-shrink-0">{group.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{group.title}</span>
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          expandedGroups.has(group.title) ? "rotate-90" : ""
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleGroupClick(group.title)}
                  className={cn(
                    "w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors",
                    isCollapsed && "justify-center",
                    isGroupActive(group) && "text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800"
                  )}
                >
                  <span className="flex-shrink-0">{group.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{group.title}</span>
                      <svg
                        className={cn(
                          "w-4 h-4 transition-transform",
                          expandedGroups.has(group.title) ? "rotate-90" : ""
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {/* Group Items */}
              {!isCollapsed && expandedGroups.has(group.title) && (
                <div className="ml-4 space-y-1">
                  {group.items.map((item) => (
                    <div key={item.href}>
                      {item.children ? (
                        <div className="space-y-1">
                          <div className={cn(
                            "flex items-center space-x-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors",
                            isItemActive(item.href) && "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                          )}>
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <span className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 space-y-1">
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "block px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors",
                                  isItemActive(child.href) && "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                                )}
                                aria-current={isItemActive(child.href) ? "page" : undefined}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center space-x-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors",
                            isItemActive(item.href) && "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400",
                            item.href === "#" && "opacity-75 cursor-not-allowed bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800"
                          )}
                          aria-current={isItemActive(item.href) ? "page" : undefined}
                        >
                          <span className="flex-shrink-0">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-800 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-700">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Scanner Button - Prominent and separated */}
      {basePath === 'admin' && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <Link
            href="/admin/scanner"
            className={cn(
              "w-full flex items-center justify-center space-x-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]",
              isCollapsed ? "px-3" : ""
            )}
          >
            <span className="flex-shrink-0">{ICONS.qr}</span>
            {!isCollapsed && (
              <div className="flex flex-col items-center">
                <span className="font-semibold text-sm">Escanear Códigos</span>
                <span className="text-xs opacity-90">Acceso rápido al scanner</span>
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Footer with Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full flex items-center space-x-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors",
            isCollapsed && "justify-center px-2",
            isLoggingOut && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Cerrar sesión"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && (
            <span>{isLoggingOut ? "Saliendo..." : "Cerrar sesión"}</span>
          )}
        </button>
        {!isCollapsed && (
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-500">
            <div>Versión 1.0.0</div>
            <div className="mt-1">Última actualización: {new Date().toLocaleDateString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}