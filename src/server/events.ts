// Simple Node EventEmitter singleton to broadcast server-side events
import { EventEmitter } from 'events'

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
  timestamp: number
}

export function emitTaskUpdated(evt: Omit<TaskUpdateEvent, 'type' | 'timestamp'>) {
  const payload: TaskUpdateEvent = {
    type: 'task-updated',
    timestamp: Date.now(),
    ...evt,
  }
  taskEvents.emit('task-updated', payload)
}
