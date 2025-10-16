import { Area } from './areas';
import { StaffRole } from '@prisma/client';

export function mapAreaToStaffRole(area: Area | null): StaffRole | null {
  if (!area) return null;

  switch (area) {
    case 'Caja':
      return 'CASHIER';
    case 'Barra':
      return 'BARTENDER';
    case 'Mozos':
      return 'WAITER';
    default:
      return null; // Seguridad, Animación, DJs, etc. no tienen rol en restaurante
  }
}

export function getStaffPermissions(role: StaffRole | null): {
  canViewOrders: boolean;
  canUpdateOrderStatus: boolean;
  canAssignTables: boolean;
  canCloseOrders: boolean;
  canMarkReady: boolean;
  canViewMetrics: boolean;
  allowedStatuses: string[];
} {
  if (!role) {
    return {
      canViewOrders: false,
      canUpdateOrderStatus: false,
      canAssignTables: false,
      canCloseOrders: false,
      canMarkReady: false,
      canViewMetrics: false,
      allowedStatuses: []
    };
  }

  switch (role) {
    case 'WAITER':
      return {
        canViewOrders: true,
        canUpdateOrderStatus: true,
        canAssignTables: true,
        canCloseOrders: false,
        canMarkReady: false,
        canViewMetrics: true,
        allowedStatuses: ['DELIVERED', 'CANCELLED'] // Puede entregar y cancelar, pero no confirmar
      };
    case 'CASHIER':
      return {
        canViewOrders: true,
        canUpdateOrderStatus: true,
        canAssignTables: false,
        canCloseOrders: false, // No puede eliminar
        canMarkReady: false,
        canViewMetrics: true,
        allowedStatuses: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'] // Todo menos eliminar
      };
    case 'BARTENDER':
      return {
        canViewOrders: true,
        canUpdateOrderStatus: true,
        canAssignTables: false,
        canCloseOrders: false, // No puede eliminar
        canMarkReady: true,
        canViewMetrics: true,
        allowedStatuses: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'] // Puede confirmar, preparar, listo, entregar y cancelar
      };
    case 'ADMIN':
      return {
        canViewOrders: true,
        canUpdateOrderStatus: true,
        canAssignTables: true,
        canCloseOrders: true,
        canMarkReady: true,
        canViewMetrics: true,
        allowedStatuses: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']
      };
    default:
      return {
        canViewOrders: false,
        canUpdateOrderStatus: false,
        canAssignTables: false,
        canCloseOrders: false,
        canMarkReady: false,
        canViewMetrics: false,
        allowedStatuses: []
      };
  }
}