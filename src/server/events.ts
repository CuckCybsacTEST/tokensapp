// Simple Node EventEmitter singleton to broadcast server-side events
import { EventEmitter } from 'events'
import { globalIo, emitSocketEvent } from '@/lib/socket'
import { DateTime } from 'luxon'

// Ensure single instance across HMR in Next dev by attaching to global
type GlobalWithTaskEvents = typeof globalThis & {
  __taskEvents?: EventEmitter
}

const g = globalThis as GlobalWithTaskEvents

export const taskEvents: EventEmitter = g.__taskEvents || new EventEmitter()

// Increase listeners to avoid warning if many admin tabs are open
taskEvents.setMaxListeners(50)

if (!g.__taskEvents) {
  g.__taskEvents = taskEvents
}

export type TaskUpdateEvent = {
  type: 'task-updated'
  taskId: string
  completed?: boolean
  value?: number
  personId?: string
  source?: 'user' | 'admin'
  day?: string
  timestamp: number
}

export function emitTaskUpdated(evt: Omit<TaskUpdateEvent, 'type' | 'timestamp'>) {
  const payload: TaskUpdateEvent = {
    type: 'task-updated',
    timestamp: Date.now(),
    ...evt,
  }
  taskEvents.emit('task-updated', payload)

  // Also emit via WebSocket to admin clients
  emitSocketEvent('task-status-updated', {
    taskId: evt.taskId,
    personId: evt.personId,
    source: evt.source,
    day: evt.day,
  }, ['admin-tasks']);
  console.log('Emitted task-status-updated for task:', evt.taskId, 'day:', evt.day);
}
