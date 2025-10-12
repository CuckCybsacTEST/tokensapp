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
  allowedStatuses: string[];
} {
  if (!role) {
    return {
      canViewOrders: false,
      canUpdateOrderStatus: false,
      canAssignTables: false,
      canCloseOrders: false,
      canMarkReady: false,
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
        allowedStatuses: ['CONFIRMED', 'DELIVERED']
      };
    case 'CASHIER':
      return {
        canViewOrders: true,
        canUpdateOrderStatus: true,
        canAssignTables: false,
        canCloseOrders: true,
        canMarkReady: false,
        allowedStatuses: ['DELIVERED', 'CANCELLED']
      };
    case 'BARTENDER':
      return {
        canViewOrders: true,
        canUpdateOrderStatus: true,
        canAssignTables: false,
        canCloseOrders: false,
        canMarkReady: true,
        allowedStatuses: ['PREPARING', 'READY']
      };
    case 'ADMIN':
      return {
        canViewOrders: true,
        canUpdateOrderStatus: true,
        canAssignTables: true,
        canCloseOrders: true,
        canMarkReady: true,
        allowedStatuses: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']
      };
    default:
      return {
        canViewOrders: false,
        canUpdateOrderStatus: false,
        canAssignTables: false,
        canCloseOrders: false,
        canMarkReady: false,
        allowedStatuses: []
      };
  }
}