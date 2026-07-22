import React from "react";

// Este es un layout vacío que no aplica ningún estilo o estructura
// pero evita que estas rutas hereden del layout principal de la aplicación
export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100vh] w-full overflow-hidden bg-[#05070C] text-white">
      {children}
    </div>
  );
}
