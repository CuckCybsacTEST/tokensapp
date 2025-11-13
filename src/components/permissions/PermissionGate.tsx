"use client";

import React from 'react';
import { StaffRole } from '@prisma/client';
import { SystemFunction } from '@/lib/function-permissions';
import { useHasPermission } from '@/lib/hooks/use-function-permissions';

interface PermissionGateProps {
  staffRole: StaffRole | null;
  requiredFunction: SystemFunction;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Componente que muestra contenido solo si el usuario tiene el permiso requerido
 */
export function PermissionGate({
  staffRole,
  requiredFunction,
  fallback = null,
  children
}: PermissionGateProps) {
  const hasPermission = useHasPermission(staffRole, requiredFunction);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  staffRole: StaffRole | null;
  requiredFunction: SystemFunction;
  disabledMessage?: string;
}

/**
 * Botón que se deshabilita si no hay permisos
 */
export function PermissionButton({
  staffRole,
  requiredFunction,
  disabledMessage = "Sin permisos",
  children,
  ...buttonProps
}: PermissionButtonProps) {
  const hasPermission = useHasPermission(staffRole, requiredFunction);

  return (
    <button
      {...buttonProps}
      disabled={!hasPermission || buttonProps.disabled}
      title={!hasPermission ? disabledMessage : buttonProps.title}
    >
      {children}
    </button>
  );
}