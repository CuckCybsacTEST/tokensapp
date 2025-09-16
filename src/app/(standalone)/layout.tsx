import React from "react";
import "../globals.css";

// Este es un layout vacío que no aplica ningún estilo o estructura
// pero evita que estas rutas hereden del layout principal de la aplicación
export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
