import React from 'react';

export const metadata = {
  title: 'Cambiar Contraseña - QR Prize',
  description: 'Cambiar contraseña de usuario',
};

export default function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
      {children}
    </div>
  );
}
