"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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

const sidebarGroups: SidebarGroup[] = [
  {
    title: "JUEGOS & SORTEOS",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      {
        href: "/admin/tokens",
        label: "Ruleta",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        children: [
          { href: "/admin/tokens", label: "Panel de Control" },
          { href: "/admin/prizes", label: "Premios" },
          { href: "/admin/roulettebatches", label: "Lotes" },
          { href: "/admin/printroulette", label: "Imprimir Pulseras" },
        ]
      },
      {
        href: "/admin/prizesstatics",
        label: "Tokens Individuales",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        ),
        children: [
          { href: "/admin/prizesstatics", label: "Premios" },
          { href: "/admin/static-batches", label: "Lotes" },
          { href: "/admin/printstatics", label: "Imprimir Pulseras" },
        ]
      },
      {
        href: "/admin/trivia",
        label: "Trivia",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        children: [
          { href: "/admin/trivia", label: "Preguntas" },
        ]
      }
    ]
  },
  {
    title: "GESTIÓN HUMANA",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    items: [
      {
        href: "/admin/attendance",
        label: "Personal & Asistencia",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          </svg>
        ),
        children: [
          { href: "/admin/attendance", label: "Control de Asistencia" },
          { href: "/admin/users", label: "Colaboradores" },
          { href: "/admin/scanner", label: "Escáner" },
        ]
      },
      {
        href: "/admin/customers",
        label: "Clientes",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        children: [
          { href: "/admin/customers", label: "Clientes" },
          { href: "/admin/customers/visits", label: "Registro de Visitas" },
          { href: "/admin/customers/analytics", label: "Analytics" },
        ]
      }
    ]
  },
  {
    title: "OPERACIONES",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    items: [
      {
        href: "/admin/tasks",
        label: "Tareas",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        children: [
          { href: "/admin/tasks", label: "Gestión de tareas" },
          { href: "/admin/tasks/metrics", label: "Métricas de Tareas" },
          { href: "/admin/day-brief", label: "Brief del día" },
        ]
      },
      {
        href: "/admin/inventory/suppliers",
        label: "Inventario",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        children: [
          { href: "/admin/inventory/suppliers", label: "Proveedores" },
          { href: "/admin/inventory/stock", label: "Control de Stock" },
          { href: "/admin/inventory/alerts", label: "Alertas" },
          { href: "/admin/inventory/units", label: "Unidades" },
        ]
      }
    ]
  },
  {
    title: "ENTRETENIMIENTO",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.09 6.26L20.97 9l-5.18 3.76L17.82 20 12 15.9 6.18 20l2.03-7.24L3.03 9l6.88-.74L12 2z" />
      </svg>
    ),
    items: [
      {
        href: "/admin/shows",
        label: "Shows & Tickets",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.09 6.26L20.97 9l-5.18 3.76L17.82 20 12 15.9 6.18 20l2.03-7.24L3.03 9l6.88-.74L12 2z" />
          </svg>
        ),
        children: [
          { href: "/admin/shows", label: "Shows" },
          { href: "/admin/tickets", label: "Tickets" },
          { href: "/marketing#shows", label: "Ver en marketing" },
        ]
      },
      {
        href: "/admin/birthdays",
        label: "Cumpleaños",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          </svg>
        ),
        children: [
          { href: "/admin/birthdays", label: "Reservas" },
          { href: "/admin/birthdays/referrers", label: "Referrers" },
          { href: "/admin/birthdays/referrers/metrics", label: "Métricas" },
        ]
      }
    ]
  },
  {
    title: "COMERCIAL",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      {
        href: "/admin/offers",
        label: "Ofertas",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        children: [
          { href: "/admin/offers", label: "Panel de Ofertas" },
          { href: "/admin/offers", label: "Crear Oferta" },
          { href: "/marketing#ofertas", label: "Ver en marketing" },
        ]
      },
      {
        href: "/admin/mesas",
        label: "Carta & Pedidos",
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
        children: [
          { href: "/admin/mesas", label: "Gestión de Mesas" },
          { href: "/admin/menu", label: "Gestión de Menú" },
          { href: "/admin/pedidos", label: "Panel de Pedidos" },
          { href: "/menu", label: "Menú Público" },
        ]
      }
    ]
  },
  {
    title: "PRÓXIMAMENTE",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      {
        href: "#",
        label: "Pedidos Musicales",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 19V6l12-2v13" />
            <circle cx="6" cy="19" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        ),
        badge: "Próximamente"
      },
      {
        href: "#",
        label: "Recompensas & Fidelización",
        icon: (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ),
        badge: "Próximamente"
      }
    ]
  }
];

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  basePath?: 'admin' | 'u';
}

export function AdminSidebar({ isCollapsed = false, onToggle, basePath = 'admin' }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["JUEGOS & SORTEOS"]));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleGroup = (groupTitle: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
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
      const logoutEndpoint = basePath === 'admin' ? '/api/auth/logout' : '/api/user/auth/logout';
      const loginPath = basePath === 'admin' ? '/admin/login' : '/u/login';

      const res = await fetch(logoutEndpoint, { method: "POST" });
      if (res.ok) {
        router.push(loginPath);
      } else {
        router.push(loginPath);
      }
    } catch {
      router.push(basePath === 'admin' ? '/admin/login' : '/u/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Configuración dinámica basada en basePath
  const getSidebarGroups = (basePath: 'admin' | 'u'): SidebarGroup[] => {
    const pathPrefix = basePath === 'admin' ? '/admin' : '/u';

    return [
      {
        title: "JUEGOS & SORTEOS",
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        items: [
          {
            href: `${pathPrefix}/tokens`,
            label: "Ruleta",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            children: basePath === 'admin' ? [
              { href: `${pathPrefix}/tokens`, label: "Panel de Control" },
              { href: `${pathPrefix}/prizes`, label: "Premios" },
              { href: `${pathPrefix}/roulettebatches`, label: "Lotes" },
              { href: `${pathPrefix}/printroulette`, label: "Imprimir Pulseras" },
            ] : [
              { href: `${pathPrefix}/tokens`, label: "Panel de Control" },
            ]
          },
          ...(basePath === 'admin' ? [{
            href: `${pathPrefix}/prizesstatics`,
            label: "Tokens Individuales",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            ),
            children: [
              { href: `${pathPrefix}/prizesstatics`, label: "Premios" },
              { href: `${pathPrefix}/static-batches`, label: "Lotes" },
              { href: `${pathPrefix}/printstatics`, label: "Imprimir Pulseras" },
            ]
          }] : [])
        ]
      },
      {
        title: "GESTIÓN HUMANA",
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        items: [
          {
            href: `${pathPrefix}/attendance`,
            label: "Asistencia",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
            ),
            children: basePath === 'admin' ? [
              { href: `${pathPrefix}/attendance`, label: "Control de Asistencia" },
              { href: `${pathPrefix}/users`, label: "Colaboradores" },
              { href: `${pathPrefix}/scanner`, label: "Escáner" },
            ] : [
              { href: `${pathPrefix}/attendance`, label: "Mi Asistencia" },
            ]
          },
          ...(basePath === 'admin' ? [{
            href: `${pathPrefix}/customers`,
            label: "Clientes",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
            children: [
              { href: `${pathPrefix}/customers`, label: "Clientes" },
              { href: `${pathPrefix}/customers/visits`, label: "Registro de Visitas" },
              { href: `${pathPrefix}/customers/analytics`, label: "Analytics" },
            ]
          }] : [])
        ]
      },
      {
        title: "OPERACIONES",
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        items: [
          ...(basePath === 'admin' ? [{
            href: `${pathPrefix}/tasks`,
            label: "Tareas",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            ),
            children: [
              { href: `${pathPrefix}/tasks`, label: "Lista de Tareas" },
            ]
          }] : []),
          {
            href: `${pathPrefix}/menu`,
            label: "Carta del Menú",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            ),
            children: [
              { href: `${pathPrefix}/menu`, label: "Ver Carta" },
            ]
          }
        ]
      },
      ...(basePath === 'admin' ? [{
        title: "ENTRETENIMIENTO",
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 2l2.09 6.26L20.97 9l-5.18 3.76L17.82 20 12 15.9 6.18 20l2.03-7.24L3.03 9l6.88-.74L12 2z" />
          </svg>
        ),
        items: [
          {
            href: `${pathPrefix}/shows`,
            label: "Shows",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ),
            children: [
              { href: `${pathPrefix}/shows`, label: "Lista de Shows" },
            ]
          },
          {
            href: `${pathPrefix}/birthdays`,
            label: "Cumpleaños",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 010 3.848 2.701 2.701 0 003 0 2.704 2.704 0 013 0 2.704 2.704 0 003 0 2.701 2.701 0 010-3.848 2.701 2.701 0 003 0 2.704 2.704 0 013 0 2.704 2.704 0 003 0 .986.986 0 001.5-.454M9.5 12h.01M16.5 12h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18z" />
              </svg>
            ),
            children: [
              { href: `${pathPrefix}/birthdays`, label: "Reservas" },
            ]
          }
        ]
      },
      {
        title: "COMERCIAL",
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        items: [
          {
            href: `${pathPrefix}/offers`,
            label: "Ofertas",
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            ),
            children: [
              { href: `${pathPrefix}/offers`, label: "Lista de Ofertas" },
            ]
          }
        ]
      }] : [])
    ];
  };

  const sidebarGroups = getSidebarGroups(basePath);

  return (
    <div className={cn(
      "flex flex-col h-screen bg-slate-900 text-white transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-sm">Admin Panel</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-2 px-3">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  "w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors",
                  isCollapsed && "justify-center",
                  isGroupActive(group) && "text-blue-400 bg-slate-800"
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

              {/* Group Items */}
              {!isCollapsed && expandedGroups.has(group.title) && (
                <div className="ml-4 space-y-1">
                  {group.items.map((item) => (
                    <div key={item.href}>
                      {item.children ? (
                        <div className="space-y-1">
                          <div className={cn(
                            "flex items-center space-x-2 px-3 py-2 text-sm hover:bg-slate-800 rounded-md transition-colors",
                            isItemActive(item.href) && "bg-slate-800 text-blue-400"
                          )}>
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
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
                                  "block px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors",
                                  isItemActive(child.href) && "bg-slate-800 text-blue-400"
                                )}
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
                            "flex items-center space-x-2 px-3 py-2 text-sm hover:bg-slate-800 rounded-md transition-colors",
                            isItemActive(item.href) && "bg-slate-800 text-blue-400",
                            item.href === "#" && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <span className="flex-shrink-0">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
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

      {/* Footer with Logout */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full flex items-center space-x-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors",
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
          <div className="mt-3 text-xs text-slate-500">
            <div>Versión 1.0.0</div>
            <div className="mt-1">Última actualización: {new Date().toLocaleDateString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}