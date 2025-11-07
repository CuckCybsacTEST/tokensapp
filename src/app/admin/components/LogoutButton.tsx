"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (response.ok) {
        router.push("/u/login");
      } else {
        console.error("Error al cerrar sesión");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setIsLoggingOut(false);
    }
  }

  return (
    <button 
      onClick={handleLogout} 
      disabled={isLoggingOut}
      className="text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1 rounded-md text-slate-800 dark:text-slate-200 flex items-center transition-colors"
    >
      {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
