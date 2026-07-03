"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3, Sparkles, Star, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

export type Mundial2026TablaProps = {
  generatedAtLabel: string;
  winnersTotal: number;
  aciertosTotal: number;
  availableTotal: number;
  claimWindowHours: number;
  winners: Array<{
    id: string;
    detailPath: string;
    isExpired: boolean;
    participantName: string;
    matchLabel: string;
    matchStageLabel: string;
    matchStartsAtLabel: string;
    pickLabel: string;
    prizeLabel: string;
    prizeDescription: string | null;
    claimStatusLabel: string;
    claimStatusTone: "emerald" | "sky" | "amber" | "gray" | "slate";
    claimExpiresAtLabel: string | null;
  }>;
};

const toneClasses: Record<Mundial2026TablaProps["winners"][number]["claimStatusTone"], string> = {
  emerald: "border-emerald-300/25 bg-emerald-400/12 text-emerald-100",
  sky: "border-sky-300/25 bg-sky-400/12 text-sky-100",
  amber: "border-amber-300/25 bg-amber-400/12 text-amber-100",
  gray: "border-white/10 bg-white/[0.05] text-white/70",
  slate: "border-white/10 bg-white/[0.06] text-white/80",
};

function rowClasses(isExpired: boolean) {
  return isExpired
    ? "border-t border-white/[0.05] align-top bg-white/[0.025] text-white/45"
    : "border-t border-white/[0.08] align-top text-white/[0.88]";
}

function cardClasses(isExpired: boolean) {
  return isExpired
    ? "rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-3 opacity-80 shadow-[0_20px_40px_rgba(2,6,23,0.18)]"
    : "rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-3 shadow-[0_20px_40px_rgba(2,6,23,0.22)]";
}

function actionClasses(isExpired: boolean) {
  return isExpired
    ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.05] px-3.5 py-2 text-sm font-semibold text-white/45 pointer-events-none"
    : "inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] bg-sky-400 px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300";
}

function StatCard(props: { title: string; value: number; hint: string; icon: ReactNode; tone: "sky" | "emerald" | "amber" }) {
  const toneClass =
    props.tone === "emerald"
      ? "border-emerald-300/20 bg-[linear-gradient(180deg,_rgba(16,185,129,0.16),_rgba(10,18,36,0.90))]"
      : props.tone === "amber"
        ? "border-amber-300/20 bg-[linear-gradient(180deg,_rgba(245,158,11,0.16),_rgba(10,18,36,0.90))]"
        : "border-sky-300/20 bg-[linear-gradient(180deg,_rgba(56,189,248,0.16),_rgba(10,18,36,0.90))]";

  return (
    <div className={["rounded-[20px] border p-4 shadow-[0_18px_50px_rgba(2,6,23,0.22)] sm:p-5", toneClass].join(" ")}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sky-100 sm:h-14 sm:w-14">{props.icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">{props.title}</div>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <div className="text-4xl font-black leading-none text-white sm:text-5xl">{props.value}</div>
            <div className="pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-xs">{props.hint}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Mundial2026TablaClient(props: Mundial2026TablaProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-3 py-4 text-white sm:px-5 sm:py-6 lg:px-6 lg:py-8">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(10,18,36,0.92)_0%,_rgba(7,12,26,0.96)_100%)] shadow-[0_24px_70px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <div className="relative overflow-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0">
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover opacity-[0.22] mix-blend-screen"
              fill
              priority
              sizes="100vw"
              src="/posters/mundial2026-hero.webp"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.20),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_24%),linear-gradient(180deg,_rgba(4,10,24,0.76)_0%,_rgba(4,10,24,0.86)_100%)]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100 shadow-[0_10px_24px_rgba(245,158,11,0.12)]">
                <Star className="h-4 w-4" />
                Modo mundialista
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-100">
                <Sparkles className="h-3.5 w-3.5" />
                {props.winnersTotal} ganadores
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <h1 className="text-[clamp(2.2rem,6vw,4.2rem)] font-black leading-[0.92] tracking-tight text-white drop-shadow-[0_8px_24px_rgba(2,6,23,0.4)]">
                  Tabla de ganadores
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/[0.78] sm:text-base sm:leading-8">
                  Estos jugadores acertaron su pronostico y ya pueden reclamar su premio. Todas las jugadas ganadoras mantienen su ventana de canje por {props.claimWindowHours} horas desde la liquidacion del partido.
                </p>
                <div className="mt-2 text-[11px] text-white/55 sm:text-xs">Actualizado {props.generatedAtLabel}</div>
              </div>

              <Link
                href="/mundial2026"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:bg-white/[0.08]"
              >
                <span className="text-sm">X</span>
                Cerrar
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatCard title="Ganadores" value={props.winnersTotal} hint="jugadores" tone="sky" icon={<UsersRound className="h-7 w-7" />} />
              <StatCard title="Pronósticos acertados" value={props.aciertosTotal} hint="aciertos" tone="emerald" icon={<Trophy className="h-7 w-7" />} />
              <StatCard title="Premios disponibles" value={props.availableTotal} hint={`${props.claimWindowHours} horas canje`} tone="amber" icon={<Clock3 className="h-7 w-7" />} />
            </div>
          </div>
        </div>

        <div className="px-3 pb-4 sm:px-4 sm:pb-5 lg:px-5 lg:pb-6">
          {props.winners.length > 0 ? (
            <>
              <div className="hidden lg:block">
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
                    {props.winners.map((row) => (
                      <tr key={row.id} className={rowClasses(row.isExpired)}>
                        <td className="px-4 py-2.5">
                          <div className={row.isExpired ? "font-semibold text-white/55" : "font-semibold text-white"}>{row.participantName}</div>
                          <div className={row.isExpired ? "mt-0.5 text-[11px] text-white/30" : "mt-0.5 text-[11px] text-white/45"}>{row.matchStageLabel}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className={row.isExpired ? "font-semibold text-white/55" : "font-semibold text-white"}>{row.matchLabel}</div>
                          <div className={row.isExpired ? "mt-0.5 text-[11px] text-white/30" : "mt-0.5 text-[11px] text-white/45"}>{row.matchStartsAtLabel}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className={row.isExpired ? "inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50" : "inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100"}>
                            Acerto
                          </div>
                          <div className={row.isExpired ? "mt-2 text-base font-black text-white/55" : "mt-2 text-base font-black text-white"}>{row.pickLabel}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className={row.isExpired ? "font-semibold text-white/55" : "font-semibold text-sky-100"}>{row.prizeLabel}</div>
                          {row.prizeDescription ? <div className={row.isExpired ? "mt-0.5 text-[11px] leading-5 text-white/30" : "mt-0.5 text-[11px] leading-5 text-white/45"}>{row.prizeDescription}</div> : null}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.claimExpiresAtLabel ? <div className={row.isExpired ? "text-sm font-medium text-white/55" : "text-sm font-medium text-white"}>{row.claimExpiresAtLabel}</div> : <div className="text-sm text-white/45">Sin vencimiento</div>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-semibold", toneClasses[row.claimStatusTone]].join(" ")}>
                            {row.claimStatusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {row.isExpired ? (
                            <span className={actionClasses(true)}>
                              Vencido
                              <Clock3 className="h-4 w-4" />
                            </span>
                          ) : (
                            <Link href={row.detailPath} className={actionClasses(false)}>
                              Recuperar jugada
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 space-y-2.5 lg:hidden">
                  {props.winners.map((row) => (
                    <article key={row.id} className={cardClasses(row.isExpired)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={row.isExpired ? "text-[15px] font-bold leading-tight text-white/55" : "text-[15px] font-bold leading-tight text-white"}>{row.participantName}</div>
                          <div className={row.isExpired ? "mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/28" : "mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/40"}>{row.matchStageLabel}</div>
                        </div>
                        <span className={["inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", toneClasses[row.claimStatusTone]].join(" ")}>
                          {row.claimStatusLabel}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-1 gap-2.5 min-[460px]:grid-cols-2">
                        <div className="rounded-[15px] border border-white/[0.08] bg-black/10 px-3 py-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Partido</div>
                          <div className={row.isExpired ? "mt-0.5 text-[13px] font-semibold leading-5 text-white/55" : "mt-0.5 text-[13px] font-semibold leading-5 text-white"}>{row.matchLabel}</div>
                          <div className={row.isExpired ? "mt-0.5 text-[10px] text-white/28" : "mt-0.5 text-[10px] text-white/42"}>{row.matchStartsAtLabel}</div>
                        </div>

                        <div className="rounded-[15px] border border-white/[0.08] bg-black/10 px-3 py-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Pronostico</div>
                          <div className={row.isExpired ? "mt-0.5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50" : "mt-0.5 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100"}>
                            Acerto
                          </div>
                          <div className={row.isExpired ? "mt-1.5 text-[13px] font-black leading-5 text-white/55" : "mt-1.5 text-[13px] font-black leading-5 text-white"}>{row.pickLabel}</div>
                        </div>

                        <div className="rounded-[15px] border border-white/[0.08] bg-black/10 px-3 py-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Premio</div>
                          <div className={row.isExpired ? "mt-0.5 text-[13px] font-semibold leading-5 text-white/55" : "mt-0.5 text-[13px] font-semibold leading-5 text-sky-100"}>{row.prizeLabel}</div>
                          {row.prizeDescription ? <div className={row.isExpired ? "mt-0.5 text-[10px] leading-4 text-white/28" : "mt-0.5 text-[10px] leading-4 text-white/42"}>{row.prizeDescription}</div> : null}
                        </div>

                        <div className="rounded-[15px] border border-white/[0.08] bg-black/10 px-3 py-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Vence</div>
                          <div className={row.isExpired ? "mt-0.5 text-[13px] font-medium leading-5 text-white/55" : "mt-0.5 text-[13px] font-medium leading-5 text-white"}>{row.claimExpiresAtLabel || "Sin vencimiento"}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        {row.isExpired ? (
                          <span className={actionClasses(true)}>
                            Vencido
                            <Clock3 className="h-4 w-4" />
                          </span>
                        ) : (
                          <Link href={row.detailPath} className={`${actionClasses(false)} sm:rounded-[10px]`}>
                            Recuperar jugada
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
            </>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-8 text-center">
              <h3 className="text-xl font-black text-white">Todavia no hay ganadores liquidados</h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
                Cuando los partidos se liquiden, aqui aparecera la lista de jugadas acertadas con su premio y vencimiento.
              </p>
              <Link href="/mundial2026" className="mt-5 inline-flex rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
                Volver a jugar
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
