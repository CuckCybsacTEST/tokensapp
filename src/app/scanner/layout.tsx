import React from "react";
import "../globals.css";

export const metadata = {
  title: "Scanner | QR App",
};

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="app-container">
      {children}
    </section>
  );
}
