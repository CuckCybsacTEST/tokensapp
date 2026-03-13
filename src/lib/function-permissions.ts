// Definición local de StaffRole para evitar importar @prisma/client en Edge Runtime
export type StaffRole =
  | 'WAITER'
  | 'CASHIER'
  | 'ADMIN'
  | 'BARTENDER'
  | 'SECURITY'
  | 'ANIMATION'
  | 'DJ'
  | 'MULTIMEDIA'
  | 'GENERAL_STAFF';

// Definición de funciones del sistema que requieren permisos específicos
export const SYSTEM_FUNCTIONS = [
  'MANAGE_TRIVIA',           // Gestionar trivia (preguntas, premios)
  'MANAGE_SHOWS',            // Gestionar shows y espectáculos
  'CONTROL_TOKENS',          // Activar/desactivar sistema de tokens
  'MANAGE_BATCHES',          // Gestionar lotes de tokens
  'MANAGE_STATIC_BATCHES',   // Gestionar lotes estáticos (QR para animación/multimedia)
  'VIEW_ATTENDANCE',         // Ver asistencia del personal
  'MANAGE_TASKS',            // Gestionar tareas del sistema
  'MANAGE_PRIZES',           // Gestionar premios
  'VIEW_METRICS',            // Ver métricas y reportes
  'MANAGE_CUSTOMERS',        // Gestionar clientes
  'MANAGE_TICKETS',          // Gestionar tickets
  'MANAGE_OFFERS',           // Gestionar ofertas
  'MANAGE_INVENTORY',        // Gestionar inventario
  'MANAGE_PRINT',            // Gestionar impresión
  'MANAGE_MUSIC',            // Gestionar sistema de música / DJ console
  'MANAGE_USERS',            // Gestionar usuarios del sistema
  'ACCESS_ADMIN_PANEL',      // Acceso general al panel de admin
] as const;

export type SystemFunction = typeof SYSTEM_FUNCTIONS[number];

/** Todos los StaffRoles existentes */
const ALL_STAFF: StaffRole[] = ['WAITER', 'CASHIER', 'ADMIN', 'BARTENDER', 'SECURITY', 'ANIMATION', 'DJ', 'MULTIMEDIA', 'GENERAL_STAFF'];

// Permisos por función mapeados a roles de staff (área funcional)
export const FUNCTION_PERMISSIONS: Record<SystemFunction, StaffRole[]> = {
  MANAGE_TRIVIA: ['ANIMATION'],
  MANAGE_SHOWS: ['ANIMATION', 'MULTIMEDIA'],
  CONTROL_TOKENS: ['ADMIN'],
  MANAGE_BATCHES: ['ADMIN', 'ANIMATION'],
  MANAGE_STATIC_BATCHES: ['ANIMATION', 'MULTIMEDIA'],
  VIEW_ATTENDANCE: ALL_STAFF.filter(r => r !== 'WAITER'),
  MANAGE_TASKS: ALL_STAFF,
  MANAGE_PRIZES: ['ADMIN', 'ANIMATION'],
  VIEW_METRICS: ALL_STAFF,
  MANAGE_CUSTOMERS: ['CASHIER', 'ADMIN'],
  MANAGE_TICKETS: ['CASHIER', 'ADMIN'],
  MANAGE_OFFERS: ['ADMIN', 'ANIMATION'],
  MANAGE_INVENTORY: ['ADMIN', 'BARTENDER'],
  MANAGE_PRINT: ['ADMIN', 'MULTIMEDIA'],
  MANAGE_MUSIC: ['DJ', 'ADMIN'],
  MANAGE_USERS: ['ADMIN'],
  ACCESS_ADMIN_PANEL: ['ADMIN'],
};

/** Verifica si un staffRole tiene permiso para una función */
export function hasPermission(staffRole: StaffRole | null | undefined, fn: SystemFunction): boolean {
  if (!staffRole) return false;
  return FUNCTION_PERMISSIONS[fn]?.includes(staffRole) ?? false;
}

/**
 * Verifica si un rol de staff tiene permiso para acceder a una función específica
 */
export function hasFunctionPermission(role: StaffRole | null, functionName: SystemFunction): boolean {
  if (!role) return false;

  const allowedRoles = FUNCTION_PERMISSIONS[functionName];
  return allowedRoles.includes(role);
}

/**
 * Obtiene todas las funciones disponibles para un rol específico
 */
export function getAvailableFunctions(role: StaffRole | null): SystemFunction[] {
  if (!role) return [];

  return SYSTEM_FUNCTIONS.filter(func => hasFunctionPermission(role, func));
}

/**
 * Verifica si una función está definida en el sistema
 */
export function isValidSystemFunction(func: string): func is SystemFunction {
  return SYSTEM_FUNCTIONS.includes(func as SystemFunction);
}