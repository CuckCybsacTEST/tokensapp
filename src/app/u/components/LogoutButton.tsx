"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UserLogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/user/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/u/login");
      } else {
        // If something goes wrong, still try to push to login after clearing state
        router.push("/u/login");
      }
    } catch {
      router.push("/u/login");
    } finally {
      // Keep disabled state to avoid double-clicks during navigation
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1 rounded-md text-slate-800 dark:text-slate-200 transition-colors"
      aria-label="Cerrar sesión"
    >
      {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
