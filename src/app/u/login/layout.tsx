import React from 'react';

export const metadata = {
  title: 'Login Usuario - QR Prize',
  description: 'Acceso colaboradores',
};

export default function UserLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
      {children}
    </div>
  );
}
