import { prisma } from "@/lib/prisma";

// Lightweight helper to persist an EventLog entry.
// metadata can be any JSON-serializable value; it'll be stringified.
// Errors are swallowed so logging never breaks core flows.
export async function logEvent(
  type: string,
  message?: string,
  metadata?: unknown,
  client: { eventLog: { create: (_args: any) => Promise<any> } } = prisma
) {
  try {
    await client.eventLog.create({
      data: {
        type,
        message,
        metadata: metadata === undefined ? undefined : safeStringify(metadata),
      },
    });
  } catch (err) {
  // Do not surface DB logging errors to stderr during tests (they are best-effort).
  // Log at debug level to aid local dev if needed.
  // eslint-disable-next-line no-console
  console.debug("logEvent error (suppressed)");
  }
}

function safeStringify(val: unknown) {
  try {
    return JSON.stringify(val, (_k, v) => (v instanceof Date ? v.toISOString() : v));
  } catch {
    return '{"error":"metadata_not_serializable"}';
  }
}
