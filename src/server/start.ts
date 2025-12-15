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

// Global flag to ensure scheduler starts only once per process
const SCHEDULER_STARTED_KEY = Symbol.for('golounge-scheduler-started');
const globalSymbols = globalThis as any;

console.log('[server/start] Module loaded, checking scheduler initialization...');

if (!globalSymbols[SCHEDULER_STARTED_KEY]) {
  globalSymbols[SCHEDULER_STARTED_KEY] = true;
  
  // Start the scheduler when this module is imported.
  // This file should only be imported/required in a Node server runtime (not on the edge).
  const PHASE = String(process.env.NEXT_PHASE || '').toLowerCase();
  const IS_BUILD = PHASE.includes('phase-production-build') || process.env.NEXT_BUILD === '1';
  const IS_EXPORT = process.env.NEXT_EXPORT === '1';
  // New: explicit opt-in. Avoid starting scheduler unless ENABLE_TOKENS_SCHEDULER=1
  const ENABLED_FLAG = String(process.env.ENABLE_TOKENS_SCHEDULER || '').trim() === '1';
  const SHOULD_START = process.env.NODE_ENV === 'production' && !IS_BUILD && !IS_EXPORT && ENABLED_FLAG;

  console.log('[server/start] Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    PHASE,
    IS_BUILD,
    IS_EXPORT,
    ENABLED_FLAG,
    SHOULD_START
  });

  if (SHOULD_START) {
    try {
      startScheduler();
      console.log('[server/start] started token scheduler');
    } catch (e) {
      console.error('[server/start] failed to start scheduler', e);
    }
  } else {
    console.log('[server/start] scheduler not started (build/export phase or flag disabled)');
  }
} else {
  console.log('[server/start] Scheduler already started, skipping...');
}

export default {};
