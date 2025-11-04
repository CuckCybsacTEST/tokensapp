import React from 'react';
import ThemeToggle from '@/components/theme/ThemeToggle';

export const metadata = {
  title: 'Cambiar Contraseña - QR Prize',
  description: 'Cambiar contraseña de usuario',
};

export default function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="absolute top-3 right-3 z-10"><ThemeToggle compact /></div>
      {children}
    </div>
  );
}