import React from "react";
import "../globals.css";

export const metadata = {
  title: "El Lounge by Ktdral | Donde la noche se vive",
  description: "El lugar donde la noche cobra vida. Disfruta de la mejor experiencia.",
};

export default function LoungeLayout({ children }: { children: React.ReactNode }) {
  // Este layout es independiente del layout principal de la aplicación
  return (
    <html lang="es" className="bg-black">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
