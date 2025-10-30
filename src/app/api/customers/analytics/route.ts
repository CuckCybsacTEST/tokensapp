import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get basic customer stats
    const totalCustomers = await prisma.customer.count();
    const activeCustomers = await prisma.customer.count({
      where: { isActive: true },
    });

    // Get membership breakdown
    const membershipStats = await prisma.customer.groupBy({
      by: ['membershipLevel'],
      _count: { membershipLevel: true },
    });

    const membershipBreakdown = {
      VIP: 0,
      MEMBER: 0,
      GUEST: 0,
    };

    membershipStats.forEach(stat => {
      membershipBreakdown[stat.membershipLevel as keyof typeof membershipBreakdown] = stat._count.membershipLevel;
    });

    // Get visit and spending stats
    const visitStats = await prisma.customerVisit.aggregate({
      _count: { id: true },
      _sum: { spent: true },
    });

    const totalVisits = visitStats._count.id;
    const totalSpent = visitStats._sum.spent || 0;

    // Calculate average spent per visit
    const averageSpentPerVisit = totalVisits > 0 ? totalSpent / totalVisits : 0;

    // Get top customers by spending
    const topCustomers = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        totalSpent: true,
        visitCount: true,
        lastVisit: true,
      },
      orderBy: { totalSpent: 'desc' },
      take: 10,
    });

    // Get recent registrations
    const recentRegistrations = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        createdAt: true,
        membershipLevel: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get monthly stats for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Monthly customer registrations
    const monthlyRegistrations = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as new_customers
      FROM "Customer"
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `;

    // Monthly visits
    const monthlyVisits = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "visitDate") as month,
        COUNT(*) as visits,
        COALESCE(SUM("spent"), 0) as revenue
      FROM "CustomerVisit"
      WHERE "visitDate" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "visitDate")
      ORDER BY month DESC
    `;

    // Combine monthly data
    const monthlyStats: Array<{
      month: string;
      newCustomers: number;
      visits: number;
      revenue: number;
    }> = [];

    // Create a map of months for the last 6 months
    const monthMap = new Map();
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      monthMap.set(monthKey, {
        month: date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
        newCustomers: 0,
        visits: 0,
        revenue: 0,
      });
    }

    // Fill in registration data
    (monthlyRegistrations as any[]).forEach(row => {
      const monthKey = new Date(row.month).toISOString().slice(0, 7);
      if (monthMap.has(monthKey)) {
        monthMap.get(monthKey).newCustomers = Number(row.new_customers);
      }
    });

    // Fill in visit data
    (monthlyVisits as any[]).forEach(row => {
      const monthKey = new Date(row.month).toISOString().slice(0, 7);
      if (monthMap.has(monthKey)) {
        monthMap.get(monthKey).visits = Number(row.visits);
        monthMap.get(monthKey).revenue = Number(row.revenue);
      }
    });

    // Convert map to array and sort by date
    monthlyStats.push(...Array.from(monthMap.values()).reverse());

    const analytics = {
      totalCustomers,
      activeCustomers,
      totalVisits,
      totalSpent,
      averageSpentPerVisit,
      membershipBreakdown,
      topCustomers,
      recentRegistrations,
      monthlyStats,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching customer analytics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}