import React from "react";
import "../globals.css";

export const metadata = {
  title: "El Lounge by Ktdral",
  description: "Donde la noche se vive",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  );
}
