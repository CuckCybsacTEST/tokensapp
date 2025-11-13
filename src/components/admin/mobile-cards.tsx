"use client";

import React from 'react';
import Link from 'next/link';
import {
  IconDice6,
  IconUsers,
  IconPackage,
  IconCake,
  IconTicket,
  IconGlass,
  IconChartBar,
  IconGift,
  IconBox,
  IconPrinter,
  IconPuzzle,
  IconTag,
  IconClipboardList,
  IconCalendar,
  IconTrendingUp,
  IconBuildingStore,
  IconMusic,
  IconCreditCard,
  IconTable,
  IconMenu,
  IconEye
} from '@tabler/icons-react';

interface MainCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

export function MainCard({ title, description, icon, color, onClick }: MainCardProps) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all dark:bg-slate-800 border-${color}-200 dark:border-${color}-800/60 hover:border-${color}-300 dark:hover:border-${color}-700/60`}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
          {icon}
        </div>
        <div className="text-left flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {title}
          </h3>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-slate-300 text-left">
        {description}
      </p>
    </button>
  );
}

interface SubCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export function SubCard({ title, description, icon, href, color }: SubCardProps) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition dark:bg-slate-800 border-${color}-200 dark:border-${color}-800/60 hover:border-${color}-300 dark:hover:border-${color}-700/60`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-md bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
          {icon}
        </div>
        <h4 className="text-base font-medium text-gray-900 dark:text-slate-100">
          {title}
        </h4>
      </div>
      <p className="text-sm text-gray-600 dark:text-slate-300 ml-11">
        {description}
      </p>
    </Link>
  );
}

// Definición de categorías y sus sub-tarjetas
export const ADMIN_CATEGORIES = {
  tokens: {
    title: "Sistema de Tokens",
    description: "Ruleta, premios, trivias y tokens individuales",
    icon: <IconDice6 className="w-6 h-6" />,
    color: "emerald",
    subCards: [
      {
        title: "Panel de Control Ruleta",
        description: "Estado y control del sistema de ruleta",
        icon: <IconChartBar className="w-5 h-5" />,
        href: "/admin/tokens"
      },
      {
        title: "Premios Ruleta",
        description: "Gestionar premios disponibles en ruleta",
        icon: <IconGift className="w-5 h-5" />,
        href: "/admin/prizes"
      },
      {
        title: "Lotes Ruleta",
        description: "Crear y gestionar lotes de tokens",
        icon: <IconBox className="w-5 h-5" />,
        href: "/admin/roulettebatches"
      },
      {
        title: "Imprimir Pulseras Ruleta",
        description: "Generar e imprimir pulseras QR",
        icon: <IconPrinter className="w-5 h-5" />,
        href: "/admin/printroulette"
      },
      {
        title: "Premios Individuales",
        description: "Premios para tokens estáticos",
        icon: <IconGift className="w-5 h-5" />,
        href: "/admin/prizesstatics"
      },
      {
        title: "Lotes Individuales",
        description: "Lotes de tokens estáticos",
        icon: <IconBox className="w-5 h-5" />,
        href: "/admin/static-batches"
      },
      {
        title: "Imprimir Pulseras Individuales",
        description: "Imprimir tokens estáticos",
        icon: <IconPrinter className="w-5 h-5" />,
        href: "/admin/printstatics"
      },
      {
        title: "Gestión de Trivias",
        description: "Preguntas y premios de trivia",
        icon: <IconPuzzle className="w-5 h-5" />,
        href: "/admin/trivia"
      }
    ]
  },
  personal: {
    title: "Gestión de Personal",
    description: "Colaboradores, asistencia y tareas diarias",
    icon: <IconUsers className="w-6 h-6" />,
    color: "blue",
    subCards: [
      {
        title: "Colaboradores",
        description: "Gestionar personal del lounge",
        icon: <IconUsers className="w-5 h-5" />,
        href: "/admin/users"
      },
      {
        title: "Control de Asistencia",
        description: "Ver y gestionar asistencia",
        icon: <IconClipboardList className="w-5 h-5" />,
        href: "/admin/attendance"
      },
      {
        title: "Brief del Día",
        description: "Información diaria del negocio",
        icon: <IconCalendar className="w-5 h-5" />,
        href: "/admin/day-brief"
      },
      {
        title: "Gestión de Tareas",
        description: "Administrar tareas del personal",
        icon: <IconClipboardList className="w-5 h-5" />,
        href: "/admin/tasks"
      },
      {
        title: "Métricas de Tareas",
        description: "Estadísticas de cumplimiento",
        icon: <IconTrendingUp className="w-5 h-5" />,
        href: "/admin/tasks/metrics"
      }
    ]
  },
  inventory: {
    title: "Inventario y Abastecimiento",
    description: "Proveedores, stock y control de inventario",
    icon: <IconPackage className="w-6 h-6" />,
    color: "amber",
    subCards: [
      {
        title: "Proveedores",
        description: "Gestionar proveedores y contactos",
        icon: <IconBuildingStore className="w-5 h-5" />,
        href: "/admin/inventory/suppliers"
      },
      {
        title: "Control de Stock",
        description: "Ver y actualizar inventario",
        icon: <IconPackage className="w-5 h-5" />,
        href: "/admin/inventory/stock"
      },
      {
        title: "Alertas de Inventario",
        description: "Productos con stock bajo",
        icon: <IconTrendingUp className="w-5 h-5" />,
        href: "/admin/inventory/alerts"
      },
      {
        title: "Unidades de Medida",
        description: "Configurar unidades de productos",
        icon: <IconBox className="w-5 h-5" />,
        href: "/admin/inventory/units"
      }
    ]
  },
  events: {
    title: "Eventos y Celebraciones",
    description: "Cumpleaños, shows y eventos especiales",
    icon: <IconCake className="w-6 h-6" />,
    color: "pink",
    subCards: [
      {
        title: "Reservas de Cumpleaños",
        description: "Gestionar reservas de cumpleaños",
        icon: <IconCake className="w-5 h-5" />,
        href: "/admin/birthdays"
      },
      {
        title: "Gestión de Packs",
        description: "Configurar packs de cumpleaños",
        icon: <IconBox className="w-5 h-5" />,
        href: "/admin/birthdays/packs"
      },
      {
        title: "Sistema de Referrers",
        description: "Gestionar referidos y comisiones",
        icon: <IconUsers className="w-5 h-5" />,
        href: "/admin/birthdays/referrers"
      },
      {
        title: "Métricas de Cumpleaños",
        description: "Estadísticas de reservas",
        icon: <IconTrendingUp className="w-5 h-5" />,
        href: "/admin/birthdays/referrers/metrics"
      },
      {
        title: "Gestión de Shows",
        description: "Administrar shows y eventos",
        icon: <IconMusic className="w-5 h-5" />,
        href: "/admin/shows"
      },
      {
        title: "Ver Shows en Marketing",
        description: "Vista pública de shows",
        icon: <IconEye className="w-5 h-5" />,
        href: "/marketing#shows"
      }
    ]
  },
  sales: {
    title: "Ventas y Tickets",
    description: "Ofertas, tickets y ventas online",
    icon: <IconTicket className="w-6 h-6" />,
    color: "purple",
    subCards: [
      {
        title: "Panel de Ofertas",
        description: "Gestionar ofertas especiales",
        icon: <IconTag className="w-5 h-5" />,
        href: "/admin/offers"
      },
      {
        title: "Crear Nueva Oferta",
        description: "Agregar oferta promocional",
        icon: <IconTag className="w-5 h-5" />,
        href: "/admin/offers"
      },
      {
        title: "Ver Ofertas en Marketing",
        description: "Vista pública de ofertas",
        icon: <IconEye className="w-5 h-5" />,
        href: "/marketing#ofertas"
      },
      {
        title: "Gestión de Tickets",
        description: "Administrar venta de tickets",
        icon: <IconCreditCard className="w-5 h-5" />,
        href: "/admin/tickets"
      }
    ]
  },
  menu: {
    title: "Carta y Pedidos",
    description: "Menú, mesas y gestión de pedidos",
    icon: <IconGlass className="w-6 h-6" />,
    color: "orange",
    subCards: [
      {
        title: "Gestión de Mesas",
        description: "Configurar mesas y zonas",
        icon: <IconTable className="w-5 h-5" />,
        href: "/admin/mesas"
      },
      {
        title: "Gestión de Menú",
        description: "Editar carta y productos",
        icon: <IconMenu className="w-5 h-5" />,
        href: "/admin/menu"
      },
      {
        title: "Panel de Pedidos",
        description: "Ver y gestionar pedidos",
        icon: <IconClipboardList className="w-5 h-5" />,
        href: "/admin/pedidos"
      },
      {
        title: "Ver Menú Público",
        description: "Vista del menú para clientes",
        icon: <IconEye className="w-5 h-5" />,
        href: "/menu"
      }
    ]
  }
};

interface CategoryDetailViewProps {
  category: keyof typeof ADMIN_CATEGORIES;
}

export function CategoryDetailView({ category }: CategoryDetailViewProps) {
  const categoryData = ADMIN_CATEGORIES[category];

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg bg-${categoryData.color}-100 dark:bg-${categoryData.color}-900/30 text-${categoryData.color}-600 dark:text-${categoryData.color}-400`}>
            {categoryData.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {categoryData.title}
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-300 ml-11">
          {categoryData.description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {categoryData.subCards.map((card, index) => (
          <SubCard
            key={index}
            title={card.title}
            description={card.description}
            icon={card.icon}
            href={card.href}
            color={categoryData.color}
          />
        ))}
      </div>
    </div>
  );
}