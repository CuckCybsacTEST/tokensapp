// Este layout específico es para la página de login, para evitar mostrar
// el header de navegación cuando el usuario no está autenticado

import React from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ThemeToggle from "@/components/theme/ThemeToggle";

export const metadata = {
  title: "Login Admin - QR Prize",
  description: "Acceso al panel de administración",
};

// Layout específico de login admin (sin header de navegación completo)
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* Ocultar header del layout admin (padre) */}
      <style>{`header{display:none !important;}`}</style>
      <div className="absolute top-3 right-3 z-10"><ThemeToggle compact /></div>
      {children}
    </ThemeProvider>
  );
}
