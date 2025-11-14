import React from "react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStaticBatchesMetrics() {
  const batches = await (prisma as any).batch.findMany({
    where: {
      staticTargetUrl: {
        not: null
      }
    },
    include: {
      tokens: {
        select: {
          id: true,
          redeemedAt: true,
          revealedAt: true,
          expiresAt: true,
          disabled: true,
          createdAt: true
        }
      }
    }
  });

  // Calcular métricas globales con lógica jerárquica
  const totalBatches = batches.length;
  const totalTokens = batches.reduce((sum: number, b: any) => sum + b.tokens.length, 0);
  const totalDisabled = batches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => t.disabled).length, 0
  );
  const totalExpired = batches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => !t.disabled && t.expiresAt < new Date()).length, 0
  );
  const totalRedeemed = batches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => !t.disabled && t.expiresAt >= new Date() && t.redeemedAt).length, 0
  );
  const totalRevealed = batches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => !t.disabled && t.expiresAt >= new Date() && !t.redeemedAt && t.revealedAt).length, 0
  );
  const totalActive = totalTokens - totalDisabled - totalExpired - totalRedeemed - totalRevealed;

  // Métricas por período
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentBatches = batches.filter((b: any) => b.createdAt >= weekAgo);
  const recentTokens = recentBatches.reduce((sum: number, b: any) => sum + b.tokens.length, 0);
  const recentDisabled = recentBatches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => t.disabled).length, 0
  );
  const recentExpired = recentBatches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => !t.disabled && t.expiresAt < new Date()).length, 0
  );
  const recentRedeemed = recentBatches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => !t.disabled && t.expiresAt >= new Date() && t.redeemedAt).length, 0
  );
  const recentRevealed = recentBatches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => !t.disabled && t.expiresAt >= new Date() && !t.redeemedAt && t.revealedAt).length, 0
  );

  // Tasa de canje promedio
  const avgRedemptionRate = totalTokens > 0 ? ((totalRedeemed / totalTokens) * 100) : 0;

  // Tokens expirando pronto (próximos 7 días)
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = batches.reduce((sum: number, b: any) =>
    sum + b.tokens.filter((t: any) => t.expiresAt >= now && t.expiresAt <= soon && !t.redeemedAt && !t.disabled).length, 0
  );

  return {
    totalBatches: totalBatches,
    totalTokens: totalTokens,
    totalRedeemed: totalRedeemed,
    totalExpired: totalExpired,
    totalDisabled: totalDisabled,
    totalActive: totalActive,
    totalRevealed: totalRevealed,
    avgRedemptionRate: avgRedemptionRate,
    recentBatches: recentBatches.length,
    recentTokens: recentTokens,
    recentRedeemed: recentRedeemed,
    recentRevealed: recentRevealed,
    expiringSoon: expiringSoon
  };
}

export default async function StaticBatchesMetricsPage() {
  const metrics = await getStaticBatchesMetrics();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Métricas de Lotes Estáticos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Estadísticas y análisis de rendimiento de lotes estáticos
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/admin/static-batches" className="btn-outline !px-3 !py-1.5 text-sm">
            ← Lotes estáticos
          </a>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {metrics.totalBatches}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Lotes creados
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.totalTokens.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tokens generados
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {metrics.totalRedeemed.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tokens canjeados
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metrics.avgRedemptionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tasa de canje promedio
            </div>
          </div>
        </div>
      </div>

      {/* Estado actual */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold text-green-600 dark:text-green-400 mb-3">
              Activos
            </h3>
            <div className="text-2xl font-bold">
              {metrics.totalActive.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tokens disponibles para canje
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-3">
              Revelados
            </h3>
            <div className="text-2xl font-bold">
              {metrics.totalRevealed.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tokens vistos por usuarios
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-3">
              Expirados
            </h3>
            <div className="text-2xl font-bold">
              {metrics.totalExpired.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tokens fuera de fecha
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-3">
              Deshabilitados
            </h3>
            <div className="text-2xl font-bold">
              {metrics.totalDisabled.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Tokens temporalmente inactivos
            </div>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-3">Actividad Reciente (7 días)</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Lotes creados:</span>
                <span className="font-medium">{metrics.recentBatches}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Tokens generados:</span>
                <span className="font-medium">{metrics.recentTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Tokens canjeados:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {metrics.recentRedeemed.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Tokens revelados:</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  {metrics.recentRevealed.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-3">Alertas</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Expiran pronto:</span>
                <span className={`font-medium ${metrics.expiringSoon > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                  {metrics.expiringSoon.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Tasa de canje:</span>
                <span className={`font-medium ${metrics.avgRedemptionRate > 50 ? 'text-green-600 dark:text-green-400' : metrics.avgRedemptionRate > 20 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                  {metrics.avgRedemptionRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="card">
        <div className="card-body">
          <h3 className="font-semibold mb-4">Información sobre Lotes Estáticos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">¿Qué son los lotes estáticos?</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Los lotes estáticos generan tokens que redirigen automáticamente a una URL específica o muestran una interfaz interna,
                sin necesidad de ruleta. Son ideales para promociones directas o premios instantáneos.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Métricas importantes</h4>
              <ul className="text-slate-600 dark:text-slate-400 space-y-1">
                <li>• <strong>Tasa de canje:</strong> Porcentaje de tokens utilizados</li>
                <li>• <strong>Tokens activos:</strong> Disponibles para canje</li>
                <li>• <strong>Expiran pronto:</strong> Requieren atención (próximos 7 días)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
