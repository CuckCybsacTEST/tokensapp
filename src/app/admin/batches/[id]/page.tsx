import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeBatchStats } from "@/lib/batchStats";
import loadDynamic from 'next/dynamic';

// Cargar gráficos sólo en cliente (evitar SSR issues con recharts)
const SimpleDonut = loadDynamic(() => import('@/components/charts/SimpleDonut').then(m=>m.SimpleDonut), { ssr: false });
const MiniBar = loadDynamic(() => import('@/components/charts/MiniBar').then(m=>m.MiniBar), { ssr: false });
import { CreateRouletteButtons } from "./CreateRouletteButtons";
import nextDynamic from 'next/dynamic';
const PrintPdfButton = nextDynamic(() => import('./PrintPdfButton').then(m => m.default), { ssr: false });
import TokensTable from './TokensTable';

export const dynamic = "force-dynamic";

async function getBatch(id: string) {
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: { tokens: { include: { prize: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!batch) return null;
  // Buscar sesión activa existente
  const session = await (prisma as any).rouletteSession.findFirst({ where: { batchId: id, status: 'ACTIVE' }, select: { id: true, mode: true } });
  // Get latest print template (if any)
  let template: any = null;
  try {
    template = await (prisma as any).printTemplate.findFirst({ orderBy: { createdAt: 'desc' } });
  } catch {
    template = null;
  }
  return { batch, session, template };
}

export default async function BatchDetailPage({ params }: { params: { id: string } }) {
  const data = await getBatch(params.id);
  if (!data) return <div className="p-6 text-sm">Batch no encontrado.</div>;
  const { batch, session } = data;
  const templateId = (data as any)?.template?.id || undefined;

  const stats = computeBatchStats(batch.tokens as any);
  const eligiblePrizeCount = stats.prizeStats.length;
  const eligibleByPrize = eligiblePrizeCount >= 2 && eligiblePrizeCount <= 12; // BY_PRIZE reglas
  const totalTokens = batch.tokens.length;
  const eligibleByToken = totalTokens >= 2 && totalTokens <= 12; // BY_TOKEN reglas
  const showCreate = !session && (eligibleByPrize || eligibleByToken);

  const defaultTemplateId = null; // placeholder
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-semibold">Batch {batch.id}</h1>
  <div className="flex items-center gap-2">
          {session && (
            <Link href={`/admin/roulette/session/${session.id}`} className="btn !py-1 !px-3 text-xs">
              Ver ruleta (modo {session.mode})
            </Link>
          )}
          {showCreate && <CreateRouletteButtons batchId={batch.id} eligibleByPrize={eligibleByPrize} eligibleByToken={eligibleByToken} />}
          <DownloadButtons batchId={batch.id} templateId={templateId} />
        </div>
      </div>
  {/* Uploader de template removido de esta vista */}
      {batch.description && (
        <div className="text-sm text-slate-600 dark:text-slate-400">{batch.description}</div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Dashboard resumen */}
  <div className="col-span-full grid md:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-header pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Distribución estados</h2>
            </div>
            <div className="card-body p-2">
              <SimpleDonut data={[
                { name: 'Canjeados', value: stats.redeemed, color: '#10b981' },
                { name: 'Activos', value: stats.active, color: '#6366f1' },
                { name: 'Expirados', value: stats.expired, color: '#ef4444' },
              ]} />
                <div className="mt-2 flex justify-center gap-4 text-[10px] text-slate-500">
                <span>Canj: {stats.redeemed}</span>
                <span>Activos: {stats.active}</span>
                <span>Expir: {stats.expired}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entregas por premio</h2>
            </div>
            <div className="card-body p-2 text-[10px] space-y-1">
              {stats.prizeStats.slice(0,24).map(p=>{
                const total = p.revealed || p.delivered ? p.revealed : p.total;
                const pending = p.revealedPending;
                const delivered = p.delivered;
                const base = pending + delivered || 1;
                const deliveredPct = base===0?0: +(delivered / base *100).toFixed(1);
                return (
                  <div key={p.prizeId} className="space-y-0.5">
                    <div className="flex justify-between"><span className="truncate max-w-[120px]" title={p.label}>{p.label}</span><span className="font-mono">{delivered}/{pending+delivered}</span></div>
                    <div className="h-1.5 w-full rounded bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                      <div className="h-full bg-amber-400" style={{ width: `${base===0?0: pending/base*100}%` }} />
                      <div className="h-full bg-emerald-500" style={{ width: `${base===0?0: delivered/base*100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="card-header pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">KPIs</h2>
            </div>
            <div className="card-body text-[11px] space-y-1">
              <div className="flex justify-between"><span>Tokens totales</span><span className="font-mono">{stats.totalTokens}</span></div>
              <div className="flex justify-between"><span>Revelados</span><span className="font-mono text-amber-600 dark:text-amber-400">{stats.revealed}</span></div>
              <div className="flex justify-between"><span>Pend. entrega</span><span className="font-mono text-amber-500">{stats.revealedPending}</span></div>
              <div className="flex justify-between"><span>Entregados</span><span className="font-mono text-emerald-500">{stats.delivered} ({stats.revealed? ((stats.delivered / stats.revealed)*100).toFixed(1):'0'}%)</span></div>
              {stats.leadTimeAvgMs !== undefined && (
                <div className="flex justify-between"><span>Lead time avg</span><span className="font-mono">{(stats.leadTimeAvgMs/1000).toFixed(1)}s</span></div>
              )}
              {stats.leadTimeP95Ms !== undefined && (
                <div className="flex justify-between"><span>Lead time p95</span><span className="font-mono">{(stats.leadTimeP95Ms/1000).toFixed(1)}s</span></div>
              )}
              <div className="flex justify-between"><span>Expirados</span><span className="font-mono text-rose-400">{stats.expired}</span></div>
              <div className="flex justify-between"><span>Activos (no revel.)</span><span className="font-mono text-indigo-400">{stats.active}</span></div>
              <div className="flex justify-between"><span>Premios distintos</span><span className="font-mono">{stats.prizeStats.length}</span></div>
            </div>
          </div>
          <div className="card">
            <div className="card-header pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Distribución legacy</h2>
            </div>
            <div className="card-body p-2">
              <MiniBar data={stats.prizeStats.map(p=> ({ name: p.label || p.key, value: p.redeemed }))} />
            </div>
          </div>
        </div>
        {/* Tarjetas por premio */}
        {stats.prizeStats.map((p) => {
          // find any token of this prize to get earliest expiry
          const sample = batch.tokens.filter(t=> t.prizeId === p.prizeId);
          const firstExpires = sample.length ? sample.reduce((a,b)=> a.expiresAt < b.expiresAt ? a : b).expiresAt.toLocaleDateString() : '-';
          return (
            <div key={p.prizeId} className="card">
              <div className="card-header flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500">{p.key}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {p.total} tokens
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{p.redeemedPct}%</span>
              </div>
              <div className="card-body space-y-1 text-xs">
                <div>Revelados: {p.revealed}</div>
                <div>Entregados: {p.delivered}</div>
                <div>Pend. entrega: {p.revealedPending}</div>
                <div>Expirados: {p.expired}</div>
                <div>Activos (no revel.): {p.active}</div>
                {p.revealToDeliverAvgMs !== undefined && <div>LT avg: {(p.revealToDeliverAvgMs/1000).toFixed(1)}s</div>}
                {p.revealToDeliverP95Ms !== undefined && <div>LT p95: {(p.revealToDeliverP95Ms/1000).toFixed(1)}s</div>}
                <div>Primero expira: {firstExpires}</div>
              </div>
              <div className="h-1.5 w-full rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full flex w-full">
                  <div className="h-full bg-amber-400" style={{ width: `${p.revealed === 0 ? 0 : (p.revealedPending / p.total)*100}%` }} />
                  <div className="h-full bg-emerald-500" style={{ width: `${p.revealed === 0 ? 0 : (p.delivered / p.total)*100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-1 text-xs text-slate-500">
        <div>Total tokens: {stats.totalTokens}</div>
        <div>Premios distintos: {eligiblePrizeCount}</div>
  <div>Revelados: {stats.revealed}</div>
  <div>Pend. entrega: {stats.revealedPending}</div>
  <div>Entregados: {stats.delivered} ({stats.revealed? ((stats.delivered / stats.revealed)*100).toFixed(1):'0'}%)</div>
  <div>Activos (no revel.): {stats.active}</div>
  <div>Expirados: {stats.expired}</div>
        {showCreate && (
          <div className="text-[11px] text-slate-500">Elegible para ruleta: {eligibleByPrize ? 'BY_PRIZE' : ''}{eligibleByPrize && eligibleByToken ? ' / ' : ''}{eligibleByToken ? 'BY_TOKEN' : ''}</div>
        )}
      </div>

      {/* Tabla de tokens con QR (cliente, paginada) */}
      {batch.tokens && batch.tokens.length > 0 && (
        <TokensTable
          tokens={batch.tokens.map((t:any) => ({
            id: t.id,
            prizeLabel: t.prize?.label || t.prizeId,
            prizeKey: t.prize?.key,
            expiresAt: t.expiresAt.toISOString(),
            disabled: !!t.disabled,
            redeemedAt: t.redeemedAt ? new Date(t.redeemedAt).toISOString() : null,
            revealedAt: t.revealedAt ? new Date(t.revealedAt).toISOString() : null,
            deliveredAt: t.deliveredAt ? new Date(t.deliveredAt).toISOString() : null,
          }))}
        />
      )}
    </div>
  );
}

function DownloadButtons({ batchId, templateId }: { batchId: string; templateId?: string }) {
  return (
    <div className="flex gap-2">
  <PrintPdfButton batchId={batchId} templateId={templateId} />
      <a href={`/api/batch/${batchId}/download?qr=1`} className="btn-outline !px-3 !py-1 text-xs">
        Descargar ZIP (con QR)
      </a>
      <a href={`/api/batch/${batchId}/download`} className="btn-outline !px-3 !py-1 text-xs">
        ZIP (sin QR)
      </a>
    </div>
  );
}
