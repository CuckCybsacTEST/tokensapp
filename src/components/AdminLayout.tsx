"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  basePath?: 'admin' | 'u';
}

export function AdminLayout({ children, title, breadcrumbs, basePath = 'admin' }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar - Fixed position */}
      <div className="fixed inset-y-0 left-0 z-50">
        <AdminSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          basePath={basePath}
        />
      </div>

      {/* Main Content - Offset by sidebar width */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} flex flex-col min-h-screen`}>
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {title && (
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                  </h1>
                  {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="flex mt-1" aria-label="Breadcrumb">
                      <ol className="flex items-center space-x-2">
                        {breadcrumbs.map((crumb, index) => (
                          <li key={index} className="flex items-center">
                            {index > 0 && (
                              <svg
                                className="flex-shrink-0 h-4 w-4 text-slate-400 mx-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {crumb.href ? (
                              <a
                                href={crumb.href}
                                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                              >
                                {crumb.label}
                              </a>
                            ) : (
                              <span className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                                {crumb.label}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </nav>
                  )}
                </div>
              )}
            </div>

            {/* User Menu / Actions */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Panel de Administración
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}