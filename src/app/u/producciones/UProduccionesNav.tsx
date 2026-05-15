"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/u/producciones", label: "🎬 Producciones", exact: true },
  { href: "/u/producciones/ideas", label: "💡 Ideas", exact: false },
  { href: "/u/producciones/tareas", label: "🔁 Tareas", exact: false },
];

export function UProduccionesNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
      {TABS.map(tab => {
        const isActive = tab.exact
          ? pathname === tab.href
          : (pathname ?? "").startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300"
            }`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
