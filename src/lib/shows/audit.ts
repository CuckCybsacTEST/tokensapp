import { logJson } from '@/lib/stdout';

interface ShowEventData {
  actorRole?: string;
  bytesOptimized?: number;
  durationMs?: number;
  contentHash?: string;
  [k: string]: any;
}

/**
 * Log structured show lifecycle events.
 * type examples:
 *  - show.create_draft
 *  - show.publish
 *  - show.archive
 *  - show.image.process
 */
export function logShowEvent(type: string, showId: string, data: ShowEventData = {}) {
  try {
    logJson('info', 'show_event', undefined, {
      type,
      showId,
      actorRole: data.actorRole || 'UNKNOWN',
      bytesOptimized: data.bytesOptimized,
      durationMs: data.durationMs,
      contentHash: data.contentHash,
      // allow extension fields without overwriting core ones
      extra: Object.fromEntries(Object.entries(data).filter(([k]) => !['actorRole','bytesOptimized','durationMs','contentHash'].includes(k))),
    });
  } catch {
    // never throw from logging
  }
}
