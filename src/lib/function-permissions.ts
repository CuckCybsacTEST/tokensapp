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
  'ACCESS_ADMIN_PANEL',      // Acceso general al panel de admin
] as const;

export type SystemFunction = typeof SYSTEM_FUNCTIONS[number];

// Permisos por función mapeados a roles de staff
export const FUNCTION_PERMISSIONS: Record<SystemFunction, StaffRole[]> = {
  // Solo animadores pueden gestionar trivia
  MANAGE_TRIVIA: ['ANIMATION'],

  // Animadores y multimedia pueden gestionar shows
  MANAGE_SHOWS: ['ANIMATION', 'MULTIMEDIA'],

  // Solo administradores pueden controlar tokens
  CONTROL_TOKENS: ['ADMIN'],

  // Administradores y animadores pueden gestionar lotes
  MANAGE_BATCHES: ['ADMIN', 'ANIMATION'],

  // Animadores y multimedia pueden gestionar lotes estáticos (QR)
  MANAGE_STATIC_BATCHES: ['ANIMATION', 'MULTIMEDIA'],

  // Todos pueden ver asistencia (excepto mozos)
  VIEW_ATTENDANCE: ['ADMIN', 'CASHIER', 'BARTENDER', 'SECURITY', 'ANIMATION', 'DJ', 'MULTIMEDIA', 'GENERAL_STAFF'],

  // Todos pueden gestionar tareas
  MANAGE_TASKS: ['WAITER', 'CASHIER', 'ADMIN', 'BARTENDER', 'SECURITY', 'ANIMATION', 'DJ', 'MULTIMEDIA', 'GENERAL_STAFF'],

  // Administradores y animadores pueden gestionar premios
  MANAGE_PRIZES: ['ADMIN', 'ANIMATION'],

  // Todos pueden ver métricas
  VIEW_METRICS: ['WAITER', 'CASHIER', 'ADMIN', 'BARTENDER', 'SECURITY', 'ANIMATION', 'DJ', 'MULTIMEDIA', 'GENERAL_STAFF'],

  // Caja y administradores gestionan clientes
  MANAGE_CUSTOMERS: ['CASHIER', 'ADMIN'],

  // Caja y administradores gestionan tickets
  MANAGE_TICKETS: ['CASHIER', 'ADMIN'],

  // Administradores y animadores gestionan ofertas
  MANAGE_OFFERS: ['ADMIN', 'ANIMATION'],

  // Administradores y bartenders gestionan inventario
  MANAGE_INVENTORY: ['ADMIN', 'BARTENDER'],

  // Administradores y multimedia gestionan impresión
  MANAGE_PRINT: ['ADMIN', 'MULTIMEDIA'],

  // Acceso general al panel admin
  ACCESS_ADMIN_PANEL: ['ADMIN'],
};

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