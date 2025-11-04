import React from "react";
import { AdminLayout } from "@/components/AdminLayout";

// Loading UI for all /admin routes: subtle skeletons so users see immediate feedback during navigation
export default function AdminLoading() {
  return (
    <AdminLayout>
      {/* Thin subtle top bar indicator */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500 opacity-70 animate-pulse" />

      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-4 w-80 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-8 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>

        {/* Cards skeleton grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="h-5 w-40 mb-3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
