/**
 * Server bootstrap helper.
 *
 * Purpose: import this module from your custom server bootstrap (or call from a server-only
 * initialization point) to start background services like the tokens scheduler.
 *
 * Example usage (custom server):
 *   import './server/start';
 *
 * If you use Next.js without a custom server, call `startScheduler()` from a server-only
 * initialization point (for example a server component that is rendered once on startup),
 * or prefer an external scheduler for serverless deployments.
 */

import { startScheduler } from '@/lib/scheduler';

// Start the scheduler when this module is imported.
// This file should only be imported/required in a Node server runtime (not on the edge).
try {
  startScheduler();
  console.log('[server/start] started token scheduler');
} catch (e) {
  console.error('[server/start] failed to start scheduler', e);
}

export default {};
