"use client";
import React, { useEffect, useMemo, useState } from "react";
import { generateQrPngDataUrl } from "@/lib/qr";

export type TokenLight = {
  id: string;
  prizeLabel: string;
  prizeKey?: string;
  expiresAt: string; // ISO
  disabled: boolean;
  redeemedAt: string | null; // ISO | null
  revealedAt: string | null; // ISO | null
  deliveredAt: string | null; // ISO | null
  pairedNextTokenId?: string | null; // for retry bi-token
  pairedNextPrizeLabel?: string | null; // label of the paired next token's prize
  reservedByRetry?: boolean; // true si este token está deshabilitado por estar reservado por un retry revelado
};

function statusOf(t: TokenLight): { label: string; cls: string } {
  if (t.deliveredAt) return { label: "Entregado", cls: "badge border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-800 dark:text-emerald-200" };
  if (t.redeemedAt) return { label: "Canjeado", cls: "badge border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-800 dark:text-emerald-200" };
  if (t.revealedAt) return { label: "Revelado", cls: "badge border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-600 dark:bg-amber-800 dark:text-amber-200" };
  // Si está reservado por retry, priorizamos mostrarlo así aún si disabled=false (para auditar inconsistencias)
  if (t.reservedByRetry) return { label: "Reservado (bi-token)", cls: "badge border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-600 dark:bg-violet-800 dark:text-violet-200" };
  if (t.disabled) return { label: "Deshabilitado", cls: "badge border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" };
  const exp = new Date(t.expiresAt).getTime();
  if (exp < Date.now()) return { label: "Expirado", cls: "badge-danger" };
  return { label: "Activo", cls: "badge border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-800 dark:text-indigo-200" };
}

export default function TokensTable({ tokens }: { tokens: TokenLight[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  const totalPages = Math.max(1, Math.ceil((tokens?.length || 0) / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (tokens || []).slice(start, start + pageSize);
  }, [tokens, page, pageSize]);

  useEffect(() => { setPage(1); }, [pageSize]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      // Generate QR only for visible rows not yet generated
      for (const t of pageItems) {
        if (qrMap[t.id]) continue;
        const url = `${location.origin}/r/${encodeURIComponent(t.id)}`;
        try {
          const dataUrl = await generateQrPngDataUrl(url);
          if (!cancelled) setQrMap((m) => ({ ...m, [t.id]: dataUrl }));
        } catch {
          // ignore per-row failure
        }
      }
    }
    run();
    return () => { cancelled = true; };
  }, [pageItems]);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Tokens del lote</span>
        <div className="flex items-center gap-2 text-xs">
          <label>Filas por página</label>
          <select className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1" value={pageSize} onChange={(e)=> setPageSize(Number(e.target.value)||50)}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div className="card-body overflow-x-auto">
  <div className="overflow-x-auto">
  <table className="table min-w-[1000px] text-sm">
          <thead>
            <tr>
              <th>QR</th>
              <th>ID</th>
              <th>Premio</th>
              <th>Bi-token</th>
              <th>Estado</th>
              <th>Expira</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t) => {
              const st = statusOf(t);
              return (
                <tr key={t.id} className="align-middle">
                  <td>
                    {qrMap[t.id] ? (
                      <img src={qrMap[t.id]} alt={t.id} className="h-14 w-14" />
                    ) : (
                      <div className="h-14 w-14 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                    )}
                  </td>
                  <td className="font-mono text-xs">{t.id}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="truncate max-w-[200px]" title={t.prizeLabel}>{t.prizeLabel}</span>
                      {t.prizeKey && <span className="text-[10px] text-slate-500">{t.prizeKey}</span>}
                    </div>
                  </td>
                  {/* Bi-token pairing info: only meaningful for retry tokens */}
                  <td className="text-xs whitespace-nowrap">
                    {t.prizeKey === 'retry' ? (
                      t.pairedNextTokenId ? (
                        <div className="flex flex-col">
                          <span className="truncate max-w-[200px]" title={t.pairedNextPrizeLabel || undefined}>
                            {t.pairedNextPrizeLabel || '(sin label)'}
                          </span>
                          <a
                            className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                            href={`/admin/token/${t.pairedNextTokenId}`}
                            title={t.pairedNextTokenId}
                          >
                            {t.pairedNextTokenId.slice(0, 8)}…
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-500">dinámico</span>
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td><span className={st.cls}>{st.label}</span></td>
                  <td className="whitespace-nowrap">{new Date(t.expiresAt).toLocaleString()}</td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr><td colSpan={5} className="text-slate-500 py-4">Sin tokens</td></tr>
            )}
          </tbody>
  </table>
  </div>
      </div>
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
        <div className="text-slate-500">Página {page} de {totalPages} — {(tokens||[]).length} tokens</div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary px-3 py-1 rounded disabled:opacity-50" disabled={page <= 1} onClick={()=> setPage((p)=> Math.max(1, p-1))}>Anterior</button>
          <button className="btn px-3 py-1 rounded disabled:opacity-50" disabled={page >= totalPages} onClick={()=> setPage((p)=> Math.min(totalPages, p+1))}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}
