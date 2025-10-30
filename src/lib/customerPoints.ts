import { prisma } from './prisma';

// Configuración del sistema de puntos
export const POINTS_CONFIG = {
  // Puntos por cada S/ gastado
  POINTS_PER_SOL_SPENT: 1,

  // Puntos por visita
  POINTS_PER_VISIT: {
    GUEST: 1,
    MEMBER: 2,
    VIP: 3,
  },

  // Puntos por cumpleaños
  BIRTHDAY_BONUS_POINTS: 10,

  // Puntos por evento especial
  SPECIAL_EVENT_BONUS_POINTS: 5,

  // Multiplicadores por nivel de membresía
  MEMBERSHIP_MULTIPLIERS: {
    GUEST: 1.0,
    MEMBER: 1.2,
    VIP: 1.5,
  },
} as const;

/**
 * Calcula puntos ganados por una compra
 */
export function calculatePointsFromPurchase(amount: number, membershipLevel: string): number {
  const basePoints = Math.floor(amount * POINTS_CONFIG.POINTS_PER_SOL_SPENT);
  const multiplier = POINTS_CONFIG.MEMBERSHIP_MULTIPLIERS[membershipLevel as keyof typeof POINTS_CONFIG.MEMBERSHIP_MULTIPLIERS] || 1.0;
  return Math.floor(basePoints * multiplier);
}

/**
 * Calcula puntos ganados por una visita
 */
export function calculatePointsFromVisit(visitType: string, membershipLevel: string): number {
  let basePoints = POINTS_CONFIG.POINTS_PER_VISIT[membershipLevel as keyof typeof POINTS_CONFIG.POINTS_PER_VISIT] || 1;

  // Bonos adicionales
  if (visitType === 'BIRTHDAY') {
    basePoints += POINTS_CONFIG.BIRTHDAY_BONUS_POINTS;
  } else if (visitType === 'SPECIAL_EVENT') {
    basePoints += POINTS_CONFIG.SPECIAL_EVENT_BONUS_POINTS;
  }

  return basePoints;
}

/**
 * Actualiza los puntos de un cliente
 */
export async function updateCustomerPoints(customerId: string, pointsToAdd: number): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      points: {
        increment: pointsToAdd,
      },
    },
  });
}

/**
 * Actualiza el gasto total de un cliente
 */
export async function updateCustomerSpent(customerId: string, amount: number): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      totalSpent: {
        increment: amount,
      },
    },
  });
}

/**
 * Actualiza el contador de visitas de un cliente
 */
export async function updateCustomerVisitCount(customerId: string): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      visitCount: {
        increment: 1,
      },
      lastVisit: new Date(),
    },
  });
}

/**
 * Procesa una compra y actualiza puntos del cliente
 */
export async function processPurchaseWithPoints(
  customerId: string,
  amount: number,
  membershipLevel: string
): Promise<{ pointsEarned: number }> {
  const pointsEarned = calculatePointsFromPurchase(amount, membershipLevel);

  await Promise.all([
    updateCustomerPoints(customerId, pointsEarned),
    updateCustomerSpent(customerId, amount),
  ]);

  return { pointsEarned };
}

/**
 * Procesa una visita y actualiza puntos del cliente
 */
export async function processVisitWithPoints(
  customerId: string,
  visitType: string,
  membershipLevel: string,
  spent?: number
): Promise<{ pointsEarned: number }> {
  const pointsEarned = calculatePointsFromVisit(visitType, membershipLevel);

  const updates = [updateCustomerPoints(customerId, pointsEarned), updateCustomerVisitCount(customerId)];

  if (spent && spent > 0) {
    updates.push(updateCustomerSpent(customerId, spent));
  }

  await Promise.all(updates);

  return { pointsEarned };
}

/**
 * Verifica si un cliente puede canjear puntos por un beneficio
 */
export function canRedeemPoints(customerPoints: number, requiredPoints: number): boolean {
  return customerPoints >= requiredPoints;
}

/**
 * Canjea puntos de un cliente
 */
export async function redeemCustomerPoints(
  customerId: string,
  pointsToRedeem: number,
  reason: string
): Promise<{ success: boolean; newPoints: number }> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { points: true },
  });

  if (!customer || !canRedeemPoints(customer.points, pointsToRedeem)) {
    return { success: false, newPoints: customer?.points || 0 };
  }

  const newPoints = customer.points - pointsToRedeem;

  await prisma.customer.update({
    where: { id: customerId },
    data: { points: newPoints },
  });

  // Registrar el canje en el historial (podríamos crear una tabla para esto en el futuro)
  await prisma.eventLog.create({
    data: {
      type: 'POINTS_REDEEMED',
      message: `Customer ${customerId} redeemed ${pointsToRedeem} points for: ${reason}`,
      metadata: JSON.stringify({ customerId, pointsToRedeem, reason, newPoints }),
    },
  });

  return { success: true, newPoints };
}