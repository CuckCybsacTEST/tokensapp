"use client";

import React, { useState } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { MainCard, CategoryDetailView, ADMIN_CATEGORIES } from './mobile-cards';

export function MobileAdminHome() {
  const isMobile = useIsMobile();
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof ADMIN_CATEGORIES | null>(null);

  // Si no es móvil, no renderizar nada (usará el sidebar normal)
  if (!isMobile) {
    return null;
  }

  if (selectedCategory) {
    return (
      <CategoryDetailView
        category={selectedCategory}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(ADMIN_CATEGORIES).map(([key, category]) => (
            <MainCard
              key={key}
              title={category.title}
              description={category.description}
              icon={category.icon}
              color={category.color}
              onClick={() => setSelectedCategory(key as keyof typeof ADMIN_CATEGORIES)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}