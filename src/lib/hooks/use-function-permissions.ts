"use client";

import { useMemo } from 'react';
import { StaffRole } from '@prisma/client';
import { SystemFunction, hasFunctionPermission, getAvailableFunctions } from '@/lib/function-permissions';

/**
 * Hook para verificar permisos de funciones del sistema
 */
export function useFunctionPermissions(staffRole: StaffRole | null) {
  const permissions = useMemo(() => ({
    // Verificar permiso para una función específica
    hasPermission: (func: SystemFunction) => hasFunctionPermission(staffRole, func),

    // Obtener todas las funciones disponibles para el rol
    availableFunctions: getAvailableFunctions(staffRole),

    // Verificar múltiples funciones a la vez
    hasAnyPermission: (funcs: SystemFunction[]) => funcs.some(func => hasFunctionPermission(staffRole, func)),

    // Verificar que tenga todos los permisos de una lista
    hasAllPermissions: (funcs: SystemFunction[]) => funcs.every(func => hasFunctionPermission(staffRole, func)),
  }), [staffRole]);

  return permissions;
}

/**
 * Hook simplificado para verificar un permiso específico
 */
export function useHasPermission(staffRole: StaffRole | null, func: SystemFunction): boolean {
  return useMemo(() => hasFunctionPermission(staffRole, func), [staffRole, func]);
}