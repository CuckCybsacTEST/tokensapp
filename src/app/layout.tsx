import React from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
// Inicia servicios de servidor (scheduler de tokens) al cargar el layout en el servidor
import "@/server/start";

// Nota: Este es un layout de respaldo, ahora cada sección tiene su propio layout
// Este layout no debería usarse normalmente ya que tenemos layouts específicos para:
// - /admin/** -> usa src/app/admin/layout.tsx
// - /marketing/** y / -> usa src/app/(marketing)/layout.tsx

export const metadata = {
  title: "QR Prize",
  description: "QR premios y experiencias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        <style>{`html{background:#ffffff;color-scheme:light}`}</style>
        <ThemeScript />
      </head>
      <body className="min-h-full w-full antialiased transition-colors duration-150">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
