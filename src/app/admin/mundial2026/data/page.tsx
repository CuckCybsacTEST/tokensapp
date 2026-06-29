import Link from "next/link";

import { getMundial2026WhatsappData } from "@/lib/mundial2026/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function MetricCard(props: { title: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{props.title}</div>
      <div className="mt-3 text-3xl font-black text-white">{props.value}</div>
      <div className="mt-2 text-sm text-slate-300">{props.hint}</div>
    </div>
  );
}

export default async function Mundial2026DataPage() {
  const data = await getMundial2026WhatsappData();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.96)_0%,_rgba(2,6,23,0.92)_100%)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">/admin/mundial2026/data</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Data Mundial 2026</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Consolidado de participantes únicos por WhatsApp. Los números repetidos se agrupan en una sola fila con sus jugadas, ganadas y perdidas.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-sm text-slate-300 sm:text-right">
              <div>
                Campaña: <span className="font-semibold text-white">{data.campaign.name}</span>
              </div>
              <div>
                Actualizado: <span className="font-semibold text-white">{formatDate(data.generatedAt)}</span>
              </div>
              <div>
                WhatsApps únicos: <span className="font-semibold text-white">{data.totals.uniqueWhatsapps}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/mundial2026" className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Volver al panel
            </Link>
            <Link href="/admin/mundial/insights" className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Ver insights detallados
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="WhatsApps únicos" value={data.totals.uniqueWhatsapps} hint="una fila por número" />
          <MetricCard title="Participaciones" value={data.totals.participants} hint="registros crudos consolidados" />
          <MetricCard title="Jugadas" value={data.totals.totalPredictions} hint="total de apuestas registradas" />
          <MetricCard title="Ganadas" value={data.totals.won} hint="predicciones correctas" />
          <MetricCard title="Perdidas" value={data.totals.lost} hint="predicciones fallidas" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Participantes consolidados</h2>
              <p className="text-sm text-slate-300">La fila representa un WhatsApp único. Si hubo varias jugadas con el mismo número, se suman aquí.</p>
            </div>
            <div className="text-xs text-slate-400">Mostrando {data.rows.length} filas únicas</div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Nombre</th>
                  <th className="pb-3 pr-4 font-semibold">WhatsApp</th>
                  <th className="pb-3 pr-4 font-semibold">Fecha participación</th>
                  <th className="pb-3 pr-4 font-semibold">Jugadas</th>
                  <th className="pb-3 pr-4 font-semibold">Ganadas</th>
                  <th className="pb-3 pr-4 font-semibold">Perdidas</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.whatsappKey} className="border-t border-white/10 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-white">{row.name}</div>
                      {row.participantCount > 1 ? <div className="mt-1 text-xs text-slate-400">{row.participantCount} registros consolidados</div> : null}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-200">{row.whatsapp}</td>
                    <td className="py-3 pr-4 text-slate-300">{formatDate(row.firstParticipationAt)}</td>
                    <td className="py-3 pr-4 font-semibold text-white">{row.totalPredictions}</td>
                    <td className="py-3 pr-4 font-semibold text-emerald-300">{row.won}</td>
                    <td className="py-3 pr-4 font-semibold text-rose-300">{row.lost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
