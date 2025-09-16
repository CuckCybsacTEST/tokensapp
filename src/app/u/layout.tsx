import React from "react";
import "../globals.css";

export const metadata = {
  title: "Colaborador | QR App",
};

export default function ULayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
        <main className="app-container py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
