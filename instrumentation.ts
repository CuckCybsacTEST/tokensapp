// Import server initialization (scheduler, etc.)
// This ensures background services start only once per server instance
import "./src/server/start";

export async function register() {
  console.log('[instrumentation] register called');
  // Socket.IO is now initialized in server.js
}
