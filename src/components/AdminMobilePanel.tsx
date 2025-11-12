"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
}

export function AdminMobilePanel({ basePath = 'admin' }: AdminMobilePanelProps) {
  const pathname = usePathname();

  // Configuración dinámica basada en basePath
  const getSidebarGroups = (basePath: 'admin' | 'u'): SidebarGroup[] => {
    const pathPrefix = basePath === 'admin' ? '/admin' : '/u';

    const groups = [
      ...(basePath === 'admin' ? [{
        title: "ESCÁNER INTEGRADO",
        icon: ICONS.qr,
        items: [
          { href: `${pathPrefix}/scanner`, label: "Escáner", icon: ICONS.qr }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "MARCAR ENTRADA/SALIDA",
        icon: ICONS.clock,
        items: [
          { href: "/admin/assistance", label: "Marcar Entrada/Salida", icon: ICONS.check }
        ]
      }] : []),
      {
        title: "TOKENS RULETA",
        icon: ICONS.roulette,
        items: basePath === 'admin' ? [
          { href: `${pathPrefix}/tokens`, label: "Panel de Control", icon: ICONS.chart },
          { href: `${pathPrefix}/prizes`, label: "Premios", icon: ICONS.star },
          { href: `${pathPrefix}/roulettebatches`, label: "Lotes", icon: ICONS.box },
          { href: `${pathPrefix}/printroulette`, label: "Imprimir Pulseras", icon: ICONS.check }
        ] : [
          { href: `${pathPrefix}/tokens`, label: "Panel de Control", icon: ICONS.chart }
        ]
      },
      ...(basePath === 'admin' ? [{
        title: "TOKENS INDIVIDUALES",
        icon: ICONS.box,
        items: [
          { href: `${pathPrefix}/prizesstatics`, label: "Premios", icon: ICONS.star },
          { href: `${pathPrefix}/static-batches`, label: "Lotes", icon: ICONS.box },
          { href: `${pathPrefix}/printstatics`, label: "Imprimir Pulseras", icon: ICONS.check }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTION DE TRIVIAS",
        icon: ICONS.check,
        items: [
          { href: `${pathPrefix}/trivia`, label: "Preguntas", icon: ICONS.check }
        ]
      }] : []),
      ...(basePath === 'admin' ? [{
        title: "GESTION DE OFERTAS",
        icon: ICONS.tag,
        items: [
          { href: `${pathPrefix}/offers`, label: "Panel de Ofertas", icon: ICONS.tag },
          { href: `${pathPrefix}/offers`, label: "Crear Oferta", icon: ICONS.star },
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
          { href: `${pathPrefix}/tasks`, label: "Gestión de tareas", icon: ICONS.check },
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
          { href: `${pathPrefix}/birthdays/referrers/metrics`, label: "Métricas", icon: ICONS.chart }
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
      }] : [])
    ];

    return groups;
  };

  const sidebarGroups = getSidebarGroups(basePath);

  const isItemActive = (href: string) => {
    if (href === "#") return false;
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="block md:hidden min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Panel de Administración
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Selecciona una categoría para acceder a sus funciones
          </p>
        </div>

        {/* Grid de categorías */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sidebarGroups.map((group, groupIndex) => (
            <div
              key={group.title}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Header de la categoría */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    {group.icon}
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {group.title}
                  </h2>
                </div>
              </div>

              {/* Items de la categoría */}
              <div className="p-4">
                <div className="space-y-2">
                  {group.items.map((item, itemIndex) => (
                    <Link
                      key={`${group.title}-${itemIndex}`}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg transition-all duration-200",
                        isItemActive(item.href)
                          ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-md",
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 mt-1">
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
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Panel de administración móvil · Go Lounge
          </p>
        </div>
      </div>
    </div>
  );
}