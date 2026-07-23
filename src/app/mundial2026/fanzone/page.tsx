import Link from "next/link";
import Image from "next/image";
import { Star, X } from "lucide-react";

import FanZonePublicClient from "./FanZonePublicClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Mundial2026FanZonePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040b16] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          alt="Fondo Mundial 2026"
          className="object-cover object-[center_20%] sm:object-[center_24%] lg:object-center"
          fill
          priority
          sizes="100vw"
          src="/posters/mundial2026-hero.webp"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(2,6,23,0.18)_0%,_rgba(2,6,23,0.38)_18%,_rgba(2,6,23,0.78)_68%,_rgba(2,6,23,0.94)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03),_transparent_30%)]" />
        <div className="absolute left-[-10%] top-[-12%] h-[38%] w-[38%] rounded-full bg-sky-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[34%] w-[34%] rounded-full bg-amber-500/12 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-3 px-3 py-5 sm:justify-start sm:gap-5 sm:px-5 sm:py-6 lg:px-8">
        <div className="flex items-center justify-end gap-3 px-1">
          <Link
            href="/"
            aria-label="Cerrar y volver a la home"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/20 text-white/80 backdrop-blur-sm transition hover:bg-black/30 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(8,15,30,0.84)_0%,_rgba(2,6,23,0.92)_100%)] p-5 shadow-2xl shadow-black/30 backdrop-blur-[2px] sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-[#071a34]/82 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-100 shadow-[0_0_0_1px_rgba(251,191,36,0.08),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.32em]">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            <span>Modo mundialista</span>
          </div>
          <h1 className="mt-3 max-w-4xl text-[clamp(2.35rem,10.5vw,4.4rem)] font-black leading-[0.92] tracking-[-0.05em] text-white sm:text-5xl lg:text-[clamp(3.4rem,7vw,5.2rem)]">
            <span className="block">FAN ZONE</span>
            <span className="block text-amber-300 [text-shadow:0_2px_14px_rgba(250,204,21,0.18)]">mundialista en Ktdral Lounge</span>
          </h1>
        </section>

        <FanZonePublicClient />
      </div>
    </div>
  );
}
