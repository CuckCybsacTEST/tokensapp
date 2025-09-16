export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Función para calcular fechas según el período seleccionado
function getDateRangeForPeriod(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date = new Date();
  let end: Date = new Date();

  // Configurar fin a final del día actual
  end.setHours(23, 59, 59, 999);
  
  switch (period) {
    case 'today':
      // Inicio: inicio del día actual
      start.setHours(0, 0, 0, 0);
      break;
      
    case 'yesterday':
      // Inicio: inicio del día anterior
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      // Fin: final del día anterior
      end.setDate(end.getDate() - 1);
      break;
      
    case 'this_week':
      // Inicio: inicio de la semana actual (lunes)
      const dayOfWeek = start.getDay() || 7; // Convertir 0 (domingo) a 7
      start.setDate(start.getDate() - dayOfWeek + 1); // Ir al lunes
      start.setHours(0, 0, 0, 0);
      break;
      
    case 'last_week':
      // Inicio: inicio de la semana anterior
      const prevWeekDay = start.getDay() || 7;
      start.setDate(start.getDate() - prevWeekDay - 6); // Ir al lunes anterior
      start.setHours(0, 0, 0, 0);
      // Fin: final de la semana anterior (domingo)
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'this_month':
      // Inicio: primer día del mes actual
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
      
    case 'last_month':
      // Inicio: primer día del mes anterior
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      // Fin: último día del mes anterior
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'custom':
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
      break;
      
    default:
      // Por defecto, esta semana
      const defaultDay = start.getDay() || 7;
      start.setDate(start.getDate() - defaultDay + 1);
      start.setHours(0, 0, 0, 0);
  }
  
  return { start, end };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'this_week';
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;

  const now = new Date();
  const { start, end } = getDateRangeForPeriod(period, startDate || undefined, endDate || undefined);

  // Para métricas de tokens necesitamos tanto totales como filtrados por período
  const [totalTokens, totalRedeemed, totalExpired, config, prizes] = await Promise.all([
    prisma.token.count(),
    prisma.token.count({ where: { redeemedAt: { not: null } } }),
    prisma.token.count({ where: { expiresAt: { lt: now } } }),
    prisma.systemConfig.findUnique({ where: { id: 1 } }),
    prisma.prize.findMany({ where: { active: true } }),
  ]);
  
  // Métricas filtradas por período
  const [periodTokens, periodRedeemed, periodRouletteSpins, periodRouletteSessions] = await Promise.all([
    prisma.token.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.token.count({ where: { redeemedAt: { gte: start, lte: end } } }),
    // Contar giros por tokens revelados (cubre ruleta admin two-phase y flujo marketing)
    prisma.token.count({ where: { revealedAt: { gte: start, lte: end } } }),
    (prisma as any).rouletteSession.count({ where: { createdAt: { gte: start, lte: end } } }),
  ]);
  
  // Cálculo de tokens activos (global)
  const activeTokens = totalTokens - totalRedeemed - totalExpired;
  
  // Tokens pendientes = suma de stock numérico > 0 (solo premios activos)
  const pending = prizes.reduce((acc: number, p: any) => (typeof p.stock === "number" && p.stock > 0 ? acc + p.stock : acc), 0);
  
  // Total emitidos acumulado = suma de emittedTotal (campo del modelo Prize)
  const emittedAggregate = prizes.reduce((acc: number, p: any) => acc + (p.emittedTotal || 0), 0);
  
  return NextResponse.json({
    // Métricas globales
    total: totalTokens,
    redeemed: totalRedeemed,
    expired: totalExpired,
    active: activeTokens < 0 ? 0 : activeTokens,
    pending,
    emittedAggregate,
    tokensEnabled: config?.tokensEnabled ?? true,
    
    // Métricas del período seleccionado
    period: {
      name: period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      tokens: periodTokens,
      redeemed: periodRedeemed,
      rouletteSessions: periodRouletteSessions,
      rouletteSpins: periodRouletteSpins,
    }
  });
}
