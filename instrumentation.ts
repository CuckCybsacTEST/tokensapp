import { initSocketIO } from "./lib/socket";
// Import server initialization (scheduler, etc.)
import "./src/server/start";

export async function register() {
  // Esta función se ejecuta al iniciar el servidor
  // Socket.IO se inicializará cuando se haga la primera conexión
  console.log("🚀 Inicializando Socket.IO...");
}
