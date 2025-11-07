import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get all referrers with their reservation stats
    const referrers = await prisma.birthdayReferrer.findMany({
      include: {
        reservations: {
          include: {
            pack: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate stats for each referrer
    const referrerStats = referrers.map((referrer: any) => {
      const totalReservations = referrer.reservations.length;
      const completedReservations = referrer.reservations.filter((r: any) => r.status === 'completed').length;
      
      // Use referrer's commission amount, default to 10.00 if not set
      const commissionAmount = Number(referrer.commissionAmount || 10.00);
      
      // Virtual earnings: all reservations (commission amount each)
      const virtualEarnings = totalReservations * commissionAmount;
      
      // Real earnings: only completed reservations (commission amount each)
      const realEarnings = completedReservations * commissionAmount;

      // Calculate conversion rate (assuming all reservations are "converted" for now)
      // In a real scenario, you might track visits vs conversions
      const conversionRate = totalReservations > 0 ? 100 : 0;

      // Get last reservation date
      const lastReservation = referrer.reservations.length > 0
        ? referrer.reservations[referrer.reservations.length - 1].createdAt.toISOString()
        : null;

      // Group reservations by month for trends
      const reservationsByMonth = referrer.reservations.reduce((acc: { month: string; count: number }[], reservation: any) => {
        const month = reservation.createdAt.toISOString().slice(0, 7); // YYYY-MM
        const existing = acc.find((item: { month: string; count: number }) => item.month === month);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ month, count: 1 });
        }
        return acc;
      }, [] as { month: string; count: number }[]).sort((a: { month: string; count: number }, b: { month: string; count: number }) => a.month.localeCompare(b.month));

      return {
        id: referrer.id,
        name: referrer.name,
        slug: referrer.slug,
        active: referrer.active,
        totalReservations,
        completedReservations,
        virtualEarnings,
        realEarnings,
        conversionRate,
        lastReservation,
        reservationsByMonth
      };
    });

    // Calculate overall stats
    const totalReferrers = referrers.length;
    const activeReferrers = referrers.filter((r: any) => r.active).length;
    const totalReservations = referrerStats.reduce((sum: number, r: any) => sum + r.totalReservations, 0);
    const totalCompletedReservations = referrerStats.reduce((sum: number, r: any) => sum + r.completedReservations, 0);
    const totalVirtualEarnings = referrerStats.reduce((sum: number, r: any) => sum + r.virtualEarnings, 0);
    const totalRealEarnings = referrerStats.reduce((sum: number, r: any) => sum + r.realEarnings, 0);
    const averageConversionRate = referrerStats.length > 0
      ? referrerStats.reduce((sum: number, r: any) => sum + r.conversionRate, 0) / referrerStats.length
      : 0;

    const overallStats = {
      totalReferrers,
      activeReferrers,
      totalReservations,
      totalCompletedReservations,
      totalVirtualEarnings,
      totalRealEarnings,
      averageConversionRate
    };

    return NextResponse.json({
      referrerStats,
      overallStats
    });

  } catch (error) {
    console.error('Error fetching referrer metrics:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
