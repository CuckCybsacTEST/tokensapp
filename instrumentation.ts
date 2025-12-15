import { initSocketIO } from "./lib/socket";
// Import server initialization (scheduler, etc.)
// This ensures background services start only once per server instance
import "./src/server/start";

export async function register() {
  console.log('[instrumentation] register called');
  // Esta función se ejecuta al iniciar el servidor
  // Socket.IO se inicializará cuando se haga la primera conexión
  console.log("🚀 Inicializando Socket.IO...");
}
