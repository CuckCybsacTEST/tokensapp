import Link from "next/link";

import { getMundial2026FanZoneDashboard } from "@/lib/mundial2026/fanzone-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function StatCard({ title, value, hint }: { title: string; value: number | string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-300">{hint}</div>
    </div>
  );
}

export default async function Mundial2026FanZoneAdminPage() {
  const data = await getMundial2026FanZoneDashboard();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.96)_0%,_rgba(2,6,23,0.92)_100%)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">/admin/mundial2026/fanzone</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Tablero Fan Zone</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Aquí solo seguimos el estado operativo: cuántos QR se emitieron, quiénes ya canjearon, quién los canjeó y cuáles están por vencer.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/mundial2026/fanzone" className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                Abrir flujo público
              </Link>
              <Link href="/admin/mundial2026" className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Volver al panel
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Emitidos" value={data.totals.issued} hint="total de QR creados" />
          <StatCard title="Canjeados" value={data.totals.redeemed} hint="usados por el equipo" />
          <StatCard title="Activos" value={data.totals.active} hint="listos para reclamar" />
          <StatCard title="Revocados" value={data.totals.revoked} hint="bloqueados manualmente" />
          <StatCard title="Vencidos" value={data.totals.expired} hint="fuera de vigencia" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Participantes consolidados</h2>
              <p className="text-sm text-slate-300">Una fila por WhatsApp. Aquí ves cuántos QR emitimos y qué pasó con cada uno.</p>
            </div>
            <div className="text-xs text-slate-400">Mostrando {data.rows.length} filas únicas</div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Nombre</th>
                  <th className="pb-3 pr-4 font-semibold">WhatsApp</th>
                  <th className="pb-3 pr-4 font-semibold">Emitidos</th>
                  <th className="pb-3 pr-4 font-semibold">Canjeados</th>
                  <th className="pb-3 pr-4 font-semibold">Activos</th>
                  <th className="pb-3 pr-4 font-semibold">Último canje</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.whatsapp} className="border-t border-white/10 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-white">{row.name}</div>
                      <div className="mt-1 text-xs text-slate-400">{row.issuedCount} emisiones</div>
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-200">{row.whatsapp}</td>
                    <td className="py-3 pr-4 text-slate-300">{row.issuedCount}</td>
                    <td className="py-3 pr-4 font-semibold text-emerald-300">{row.redeemedCount}</td>
                    <td className="py-3 pr-4 font-semibold text-sky-300">{row.activeCount}</td>
                    <td className="py-3 pr-4 text-slate-300">
                      <div>{formatDate(row.lastRedeemedAt)}</div>
                      {row.lastRedeemedBy ? <div className="mt-1 text-xs text-slate-500">por {row.lastRedeemedBy}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Canjes recientes</h2>
                <p className="text-sm text-slate-300">Quién lo canjeó, cuándo y qué QR fue usado.</p>
              </div>
              <div className="text-xs text-slate-400">{data.recentRedeemed.length} registros</div>
            </div>
            <div className="mt-4 space-y-3">
              {data.recentRedeemed.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">Todavía no hay canjes registrados.</div>
              ) : (
                data.recentRedeemed.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{ticket.name}</div>
                        <div className="text-sm text-slate-300">{ticket.whatsapp}</div>
                        <div className="mt-1 text-xs text-emerald-300">
                          {ticket.usageCount} uso{ticket.usageCount === 1 ? "" : "s"} registrado{ticket.usageCount === 1 ? "" : "s"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          <Link href={`/admin/mundial2026/fanzone/${encodeURIComponent(ticket.code)}`} className="underline decoration-white/30 underline-offset-4 transition hover:text-white">
                            {ticket.code}
                          </Link>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <div>{formatDate(ticket.redeemedAt)}</div>
                        {ticket.redeemedBy ? <div className="mt-1">por {ticket.redeemedBy}</div> : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Próximos a vencer</h2>
                <p className="text-sm text-slate-300">Tickets que aún no se canjean y vencen pronto.</p>
              </div>
              <div className="text-xs text-slate-400">{data.expiringSoon.length} registros</div>
            </div>
            <div className="mt-4 space-y-3">
              {data.expiringSoon.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-400">No hay tickets próximos a vencer.</div>
              ) : (
                data.expiringSoon.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{ticket.name}</div>
                        <div className="text-sm text-slate-300">{ticket.whatsapp}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          <Link href={`/admin/mundial2026/fanzone/${encodeURIComponent(ticket.code)}`} className="underline decoration-white/30 underline-offset-4 transition hover:text-white">
                            {ticket.code}
                          </Link>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <div>Vence {formatDate(ticket.expiresAt)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
