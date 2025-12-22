"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import AdminMobilePanel from "@/components/AdminMobilePanel";
import { AdminMobileHeader } from "@/components/AdminMobileHeader";
import { useUser } from "@/components/UserProvider";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  basePath?: 'admin' | 'u';
  hasSession?: boolean;
}

export function AdminLayout({ children, title, breadcrumbs, basePath = 'admin', hasSession = true }: AdminLayoutProps) {
  // Function to check if we're on mobile - only call after hydration
  const isMobile = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768; // md breakpoint in Tailwind
    }
    return false;
  };

  // Start with sidebar collapsed on mobile by default, but use useState with proper hydration
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Get user info from context
  const { userInfo } = useUser();

  // Update sidebar state when window resizes and after hydration
  useEffect(() => {
    setIsHydrated(true);
    setSidebarCollapsed(isMobile());

    const handleResize = () => {
      setSidebarCollapsed(isMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use default collapsed state during SSR to prevent hydration mismatch
  const currentSidebarCollapsed = isHydrated ? sidebarCollapsed : false;

  const pathname = usePathname();

  console.log('AdminLayout pathname:', JSON.stringify(pathname));

  // If no session, show content without sidebar
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col min-h-screen">
          {/* Header - Only show if title or breadcrumbs exist */}
          {(title || (breadcrumbs && breadcrumbs.length > 0)) && (
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
                                    className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                  >
                                    {crumb.label}
                                  </a>
                                ) : (
                                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
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
              </div>
            </header>
          )}

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Check if we're on mobile after hydration
  const isMobileView = isMobile();
  const isAdminRoot = pathname && pathname.startsWith('/admin') && !pathname.includes('/admin/');

  // For all admin pages (including root), use the same layout logic
  // Only show AdminMobilePanel for the root page on mobile
  if (isAdminRoot && isMobileView) {
    return (
      <div className="block md:hidden">
        <AdminMobilePanel basePath={basePath} userInfo={userInfo} />
      </div>
    );
  }

  // For desktop root page or any other admin page, use standard layout
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar - Fixed position - Hidden on mobile */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-50">
        <AdminSidebar
          isCollapsed={currentSidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!currentSidebarCollapsed)}
          basePath={basePath}
          userInfo={userInfo}
        />
      </div>

      {/* Main Content - Offset by sidebar width - Full width on mobile */}
      <div className={`transition-all duration-300 ${currentSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} flex flex-col min-h-screen`}>
        {/* Mobile Header - Only show on mobile for all admin pages */}
        {isMobileView && hasSession && (
          <AdminMobileHeader userInfo={userInfo} basePath={basePath} />
        )}

        {/* Header - Only show if title or breadcrumbs exist */}
        {(title || (breadcrumbs && breadcrumbs.length > 0)) && (
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
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 ${(title || (breadcrumbs && breadcrumbs.length > 0) || (isMobileView && hasSession)) ? '' : 'pt-8'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
