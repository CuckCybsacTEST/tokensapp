"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BackLink() {
  const pathname = usePathname();
  if (pathname === "/u") return null;
  return (
    <Link
      href="/u"
      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
    >
      ← Volver
    </Link>
  );
}
