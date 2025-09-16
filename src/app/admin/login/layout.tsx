// Este layout específico es para la página de login, para evitar mostrar
// el header de navegación cuando el usuario no está autenticado

import React from "react";

export const metadata = {
  title: "Login Admin - QR Prize",
  description: "Acceso al panel de administración",
};

// Este es un route group layout para la página de login que no comparte
// el layout principal de admin, evitando conflictos de layouts anidados
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
