import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { taskEvents, type TaskUpdateEvent } from '@/server/events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let cleanup: (() => void) | null = null
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false
      let hb: ReturnType<typeof setInterval> | null = null

      const safeEnqueue = (str: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(str))
        } catch {
          // If enqueue throws, stream is closed; finalize cleanup
          closed = true
          if (cleanup) cleanup()
        }
      }

      const send = (data: unknown) => {
        safeEnqueue(`data: ${JSON.stringify(data)}\n\n`)
      }

      // Immediate hello so clients know it's open
      send({ type: 'hello', ts: Date.now() })

      const onUpdate = (evt: TaskUpdateEvent) => {
        try {
          send(evt)
        } catch {
          // ignore if already closed
        }
      }

      taskEvents.on('task-updated', onUpdate)

      // Heartbeat every 15s to keep connections alive behind proxies
      hb = setInterval(() => {
        safeEnqueue(`: keep-alive ${Date.now()}\n\n`)
      }, 15000)

      const onAbort = () => {
        if (!closed) {
          closed = true
          if (cleanup) cleanup()
        }
      }
      // Abort from client (if available)
      try {
        req.signal?.addEventListener('abort', onAbort, { once: true } as any)
      } catch {}

      cleanup = () => {
        if (hb) { clearInterval(hb); hb = null }
        taskEvents.off('task-updated', onUpdate)
        try { controller.close() } catch {}
        try { req.signal?.removeEventListener('abort', onAbort) } catch {}
      }
    },
    cancel() {
      if (cleanup) cleanup()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable buffering in some proxies/servers
      'X-Accel-Buffering': 'no',
    },
  })
}
