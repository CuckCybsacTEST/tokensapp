import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function getDateFilter(period: string | null, startDateStr: string | null, endDateStr: string | null) {
  if (startDateStr && endDateStr) {
    return { createdAt: { gte: new Date(startDateStr), lte: new Date(endDateStr) } };
  }
  const now = new Date();
  let startDate: Date | undefined;
  if (period === "week") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  } else if (period === "year") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
  return startDate ? { createdAt: { gte: startDate } } : {};
}

async function getMetrics(period: string | null, startDate: string | null, endDate: string | null) {
  const dateFilter = getDateFilter(period, startDate, endDate);

  // Filtros para batches de ruleta: no reusables y sin staticTargetUrl
  const batchFilter = { isReusable: false, staticTargetUrl: null, ...dateFilter };

  // Tokens totales en batches de ruleta
  const totalTokens = await prisma.token.count({
    where: { batch: batchFilter },
  });

  // Tokens revelados
  const revealedTokens = await prisma.token.count({
    where: { revealedAt: { not: null }, batch: batchFilter },
  });

  // Tokens no revelados
  const unrevealedTokens = await prisma.token.count({
    where: { revealedAt: null, batch: batchFilter },
  });

  // Tokens entregados
  const deliveredTokens = await prisma.token.count({
    where: { deliveredAt: { not: null }, batch: batchFilter },
  });

  // Tasa de entrega
  const deliveryRate = totalTokens > 0 ? ((deliveredTokens / totalTokens) * 100).toFixed(2) : "0.00";

  // Tasa de escaneo
  const scanRate = totalTokens > 0 ? ((revealedTokens / totalTokens) * 100).toFixed(2) : "0.00";

  // Tiempo promedio de entrega (Lead Time: Revealed -> Delivered)
  const deliveredTokensWithDates = await prisma.token.findMany({
    where: {
      deliveredAt: { not: null },
      revealedAt: { not: null },
      batch: batchFilter
    },
    select: { revealedAt: true, deliveredAt: true }
  });

  let totalLeadTimeMs = 0;
  let leadTimeCount = 0;
  for (const t of deliveredTokensWithDates) {
    if (t.revealedAt && t.deliveredAt) {
      const diff = t.deliveredAt.getTime() - t.revealedAt.getTime();
      if (diff > 0) {
        totalLeadTimeMs += diff;
        leadTimeCount++;
      }
    }
  }
  const avgLeadTimeMinutes = leadTimeCount > 0 ? (totalLeadTimeMs / leadTimeCount / 60000).toFixed(2) : "0.00";

  // Lista completa de premios entregados
  const deliveredTokensWithPrizes = await prisma.token.findMany({
    where: { 
      deliveredAt: { not: null }, 
      batch: batchFilter 
    },
    select: { prize: { select: { label: true } } }
  });
  const prizeCountMap = new Map<string, number>();
  for (const t of deliveredTokensWithPrizes) {
    const label = t.prize?.label || 'Desconocido';
    prizeCountMap.set(label, (prizeCountMap.get(label) || 0) + 1);
  }
  const allDeliveredPrizes = Array.from(prizeCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  // Premios disponibles (no entregados) durante el período
  const availableTokensWithPrizes = await prisma.token.findMany({
    where: { 
      deliveredAt: null, 
      revealedAt: { not: null },
      batch: { isReusable: false, staticTargetUrl: null, ...dateFilter } 
    },
    select: { prize: { select: { label: true } } }
  });
  const availablePrizeCountMap = new Map<string, number>();
  for (const t of availableTokensWithPrizes) {
    const label = t.prize?.label || 'Desconocido';
    availablePrizeCountMap.set(label, (availablePrizeCountMap.get(label) || 0) + 1);
  }
  const availablePrizes = Array.from(availablePrizeCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  // Premios no revelados durante el período
  const unrevealedTokensWithPrizes = await prisma.token.findMany({
    where: { revealedAt: null, batch: { isReusable: false, staticTargetUrl: null, ...dateFilter } },
    select: { prize: { select: { label: true } } }
  });
  const unrevealedPrizeCountMap = new Map<string, number>();
  for (const t of unrevealedTokensWithPrizes) {
    const label = t.prize?.label || 'Desconocido';
    unrevealedPrizeCountMap.set(label, (unrevealedPrizeCountMap.get(label) || 0) + 1);
  }
  const unrevealedPrizes = Array.from(unrevealedPrizeCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    totalTokens,
    revealedTokens,
    deliveredTokens,
    unrevealedTokens,
    deliveryRate,
    scanRate,
    avgLeadTimeMinutes,
    allDeliveredPrizes,
    availablePrizes,
    unrevealedPrizes,
  };
}

export default async function StaticsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const period = searchParams?.period || null;
  const startDate = searchParams?.startDate || null;
  const endDate = searchParams?.endDate || null;
  const metrics = await getMetrics(period, startDate, endDate);

  return (
    <div className="space-y-8">
      <form method="GET" className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="period" className="text-sm font-medium text-slate-700 dark:text-slate-300">Período</label>
            <select name="period" id="period" defaultValue={period || ""} className="select w-full">
              <option value="">Todo</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="year">Último año</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label htmlFor="startDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">Desde</label>
            <input type="date" name="startDate" id="startDate" defaultValue={startDate || ""} className="input w-full" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="endDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">Hasta</label>
            <input type="date" name="endDate" id="endDate" defaultValue={endDate || ""} className="input w-full" />
          </div>

          <button type="submit" className="btn w-full">Filtrar</button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Pulseras escaneadas</h3>
            <p className="text-3xl font-bold text-blue-600">{metrics.revealedTokens}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Premios entregados</h3>
            <p className="text-3xl font-bold text-green-600">{metrics.deliveredTokens}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Pulseras desechadas</h3>
            <p className="text-3xl font-bold text-red-600">{metrics.unrevealedTokens}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Efectividad de Reparto</h3>
            <p className="text-3xl font-bold text-purple-600">{metrics.scanRate}%</p>
            <p className="text-sm text-slate-600">Escaneadas: {metrics.revealedTokens} | Desechadas: {metrics.unrevealedTokens}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Tasa de Entrega</h3>
            <p className="text-3xl font-bold text-purple-600">{metrics.deliveryRate}%</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Tiempo Promedio de Entrega</h3>
            <p className="text-3xl font-bold text-indigo-600">{metrics.avgLeadTimeMinutes} min</p>
            <p className="text-sm text-slate-600">Tiempo entre escaneo y entrega</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Premios Entregados</h3>
            <p className="text-sm text-slate-600 mb-4">Total de premios únicos: {metrics.allDeliveredPrizes.length}</p>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Premio</th>
                  <th>Total Entregado</th>
                </tr>
              </thead>
              <tbody>
                {metrics.allDeliveredPrizes.map((p: { label: string; count: number }, i: number) => (
                  <tr key={i}>
                    <td>{p.label}</td>
                    <td className="font-bold">{p.count}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <td className="font-bold">Total</td>
                  <td className="font-bold">{metrics.allDeliveredPrizes.reduce((sum, p) => sum + p.count, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Premios Mostrados</h3>
            <p className="text-sm text-slate-600 mb-4">Total de premios únicos: {metrics.availablePrizes.length}</p>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Premio</th>
                  <th>Total Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {metrics.availablePrizes.map((p: { label: string; count: number }, i: number) => (
                  <tr key={i}>
                    <td>{p.label}</td>
                    <td className="font-bold">{p.count}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <td className="font-bold">Total</td>
                  <td className="font-bold">{metrics.availablePrizes.reduce((sum, p) => sum + p.count, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Premios Desechados</h3>
            <p className="text-sm text-slate-600 mb-4">Total de premios únicos: {metrics.unrevealedPrizes.length}</p>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Premio</th>
                  <th>Total No Revelado</th>
                </tr>
              </thead>
              <tbody>
                {metrics.unrevealedPrizes.map((p: { label: string; count: number }, i: number) => (
                  <tr key={i}>
                    <td>{p.label}</td>
                    <td className="font-bold">{p.count}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <td className="font-bold">Total</td>
                  <td className="font-bold">{metrics.unrevealedPrizes.reduce((sum, p) => sum + p.count, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}