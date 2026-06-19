"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock3, Sparkles, Star, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

export type Mundial2026TablaProps = {
  generatedAtLabel: string;
  claimWindowHours: number;
  summary: {
    winnersTotal: number;
    aciertosTotal: number;
    availableTotal: number;
    redeemedTotal: number;
    expiredTotal: number;
  };
  winners: Array<{
    id: string;
    detailPath: string;
    participantName: string;
    matchLabel: string;
    matchStageLabel: string;
    matchStartsAtLabel: string;
    pickLabel: string;
    prizeLabel: string;
    prizeDescription: string | null;
    claimStatusLabel: string;
    claimStatusTone: "emerald" | "sky" | "amber" | "rose" | "slate";
    claimExpiresAtLabel: string | null;
  }>;
};

const softEase = [0.22, 1, 0.36, 1] as const;

const toneClasses: Record<Mundial2026TablaProps["winners"][number]["claimStatusTone"], string> = {
  emerald: "border-emerald-300/25 bg-emerald-400/12 text-emerald-100",
  sky: "border-sky-300/25 bg-sky-400/12 text-sky-100",
  amber: "border-amber-300/25 bg-amber-400/12 text-amber-100",
  rose: "border-rose-300/25 bg-rose-400/12 text-rose-100",
  slate: "border-white/10 bg-white/[0.06] text-white/80",
};

function SummaryCard(props: { title: string; value: string | number; hint: string; icon: ReactNode; tone: "blue" | "green" | "amber" }) {
  const toneClass =
    props.tone === "green"
      ? "border-emerald-300/20 bg-[linear-gradient(180deg,_rgba(16,185,129,0.14),_rgba(10,15,35,0.88))]"
      : props.tone === "amber"
        ? "border-amber-300/20 bg-[linear-gradient(180deg,_rgba(245,158,11,0.14),_rgba(10,15,35,0.88))]"
        : "border-sky-300/20 bg-[linear-gradient(180deg,_rgba(56,189,248,0.14),_rgba(10,15,35,0.88))]";

  return (
    <div className={["relative overflow-hidden rounded-[28px] border p-4 shadow-[0_24px_60px_rgba(2,6,23,0.32)] backdrop-blur-xl sm:p-5", toneClass].join(" ")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_32%)]" />
      <div className="relative flex h-full items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sky-100 shadow-inner shadow-black/20 sm:h-16 sm:w-16">{props.icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">{props.title}</div>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <div className="text-4xl font-black leading-none text-white sm:text-5xl">{props.value}</div>
            <div className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-[0.78rem]">{props.hint}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getEmptyTone(claimStatusLabel: string) {
  switch (claimStatusLabel) {
    case "Disponible":
      return "emerald";
    case "Canjeado":
      return "sky";
    case "Vencido":
      return "rose";
    case "Sin premio":
      return "amber";
    default:
      return "slate";
  }
}

export default function Mundial2026TablaClient(props: Mundial2026TablaProps) {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-3 py-4 text-white sm:px-5 sm:py-6 lg:px-6 lg:py-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_22%),linear-gradient(180deg,_#061226_0%,_#07162f_42%,_#040814_100%)]" />
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover opacity-20 mix-blend-screen"
          fill
          priority
          sizes="100vw"
          src="/posters/mundial2026-hero.webp"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(2,6,23,0.55)_0%,_rgba(2,6,23,0.72)_55%,_rgba(2,6,23,0.88)_100%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100 shadow-[0_10px_24px_rgba(245,158,11,0.12)]">
            <Star className="h-4 w-4" />
            Modo mundialista
          </div>

          <Link
            href="/mundial2026"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:bg-white/[0.08]"
          >
            <span className="text-sm">X</span>
            Cerrar
          </Link>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: softEase }}
          className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,_rgba(9,16,34,0.94)_0%,_rgba(6,12,24,0.94)_100%)] px-4 py-5 shadow-[0_30px_90px_rgba(2,6,23,0.5)] backdrop-blur-xl sm:rounded-[32px] sm:px-6 sm:py-6 lg:px-8 lg:py-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.1),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_18%)]" />
          <div className="relative z-10">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/18 bg-sky-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-100 sm:text-[11px]">
                <Sparkles className="h-3.5 w-3.5" />
                Ganadores del dia
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: softEase, delay: 0.06 }}
                className="mt-4 text-[clamp(2.3rem,7.5vw,4.8rem)] font-black leading-[0.92] tracking-tight text-white drop-shadow-[0_8px_24px_rgba(2,6,23,0.4)]"
              >
                Ganadores del dia
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: softEase, delay: 0.12 }}
                className="mt-4 max-w-3xl text-sm leading-7 text-white/[0.78] sm:text-base sm:leading-8"
              >
                Estos jugadores acertaron su pronostico y ya pueden reclamar su premio. Todas las jugadas ganadoras mantienen su ventana de canje por {props.claimWindowHours} horas desde la liquidacion del partido.
              </motion.p>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/55 sm:text-xs">
                <span>Actualizado {props.generatedAtLabel}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:mt-7 sm:grid-cols-3">
              <SummaryCard title="Ganadores" value={props.summary.winnersTotal} hint="jugadores" tone="blue" icon={<UsersRound className="h-7 w-7" />} />
              <SummaryCard title="Aciertos" value={props.summary.aciertosTotal} hint="pronosticos" tone="green" icon={<Trophy className="h-7 w-7" />} />
              <SummaryCard title="Horas para canjear" value={props.claimWindowHours} hint="desde la liquidacion" tone="amber" icon={<Clock3 className="h-7 w-7" />} />
            </div>
          </div>
        </motion.section>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(10,18,36,0.92)_0%,_rgba(7,12,26,0.96)_100%)] px-3 py-4 shadow-[0_24px_70px_rgba(2,6,23,0.42)] backdrop-blur-xl sm:px-4 sm:py-5 lg:px-5 lg:py-6">
          <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white sm:text-2xl">Tabla de ganadores</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/60">
                Vista consolidada de las jugadas correctas, su premio asociado y la fecha exacta de vencimiento.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              <Sparkles className="h-3.5 w-3.5 text-sky-200" />
              {props.winners.length} registros
            </div>
          </div>

          {props.winners.length > 0 ? (
            <>
              <div className="mt-4 hidden overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] lg:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.18em] text-white/45">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Ganador</th>
                      <th className="px-4 py-3 font-semibold">Partido</th>
                      <th className="px-4 py-3 font-semibold">Pronostico</th>
                      <th className="px-4 py-3 font-semibold">Premio</th>
                      <th className="px-4 py-3 font-semibold">Vence</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.winners.map((row) => {
                      const tone = row.claimStatusTone in toneClasses ? row.claimStatusTone : getEmptyTone(row.claimStatusLabel);
                      return (
                        <tr key={row.id} className="border-t border-white/[0.08] align-top text-white/[0.88]">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-white">{row.participantName}</div>
                            <div className="mt-1 text-xs text-white/45">{row.matchStageLabel}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-white">{row.matchLabel}</div>
                            <div className="mt-1 text-xs text-white/45">{row.matchStartsAtLabel}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                              Acerto
                            </div>
                            <div className="mt-3 text-lg font-black text-white">{row.pickLabel}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-sky-100">{row.prizeLabel}</div>
                            {row.prizeDescription ? <div className="mt-1 text-xs leading-5 text-white/45">{row.prizeDescription}</div> : null}
                          </td>
                          <td className="px-4 py-4">
                            {row.claimExpiresAtLabel ? (
                              <div>
                                <div className="text-sm font-medium text-white">{row.claimExpiresAtLabel}</div>
                                <div className="mt-1 text-xs text-white/45">Ventana de {props.claimWindowHours}h</div>
                              </div>
                            ) : (
                              <div className="text-sm text-white/45">Sin vencimiento</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-semibold", toneClasses[tone]].join(" ")}>
                              {row.claimStatusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={row.detailPath}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                            >
                              Recuperar jugada
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-3 lg:hidden">
                {props.winners.map((row) => {
                  const tone = row.claimStatusTone in toneClasses ? row.claimStatusTone : getEmptyTone(row.claimStatusLabel);
                  return (
                    <motion.article
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.32, ease: softEase }}
                      className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_40px_rgba(2,6,23,0.26)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg font-bold leading-tight text-white">{row.participantName}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{row.matchStageLabel}</div>
                        </div>
                        <span className={["inline-flex shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold", toneClasses[tone]].join(" ")}>
                          {row.claimStatusLabel}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-white/[0.08] bg-black/10 px-3 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Partido</div>
                          <div className="mt-1 text-sm font-semibold text-white">{row.matchLabel}</div>
                          <div className="mt-1 text-xs text-white/45">{row.matchStartsAtLabel}</div>
                        </div>

                        <div className="rounded-[18px] border border-white/[0.08] bg-black/10 px-3 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Pronostico</div>
                          <div className="mt-1 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                            Acerto
                          </div>
                          <div className="mt-2 text-base font-black text-white">{row.pickLabel}</div>
                        </div>

                        <div className="rounded-[18px] border border-white/[0.08] bg-black/10 px-3 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Premio</div>
                          <div className="mt-1 text-sm font-semibold text-sky-100">{row.prizeLabel}</div>
                          {row.prizeDescription ? <div className="mt-1 text-xs leading-5 text-white/45">{row.prizeDescription}</div> : null}
                        </div>

                        <div className="rounded-[18px] border border-white/[0.08] bg-black/10 px-3 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Vence</div>
                          <div className="mt-1 text-sm font-medium text-white">{row.claimExpiresAtLabel || "Sin vencimiento"}</div>
                          <div className="mt-1 text-xs text-white/45">Ventana de {props.claimWindowHours}h</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
                        <div className="text-xs text-white/45">La jugada se puede recuperar desde la UI del token.</div>
                        <Link
                          href={row.detailPath}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                        >
                          Recuperar jugada
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-8 text-center">
              <Trophy className="mx-auto h-10 w-10 text-amber-200" />
              <h3 className="mt-4 text-2xl font-black text-white">Todavia no hay ganadores liquidados</h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
                Cuando los partidos se liquiden, aqui aparecera la lista de jugadas acertadas con su premio y vencimiento.
              </p>
              <Link href="/mundial2026" className="mt-5 inline-flex rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
                Volver a jugar
              </Link>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-xs text-white/50">
            <div className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-sky-200" />
              Los premios se mantienen disponibles por {props.claimWindowHours} horas desde la liquidacion.
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Disponibles {props.summary.availableTotal}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Canjeados {props.summary.redeemedTotal}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Vencidos {props.summary.expiredTotal}</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
