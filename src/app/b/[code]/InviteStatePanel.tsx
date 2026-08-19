"use client";

type InviteStateVariant = "future" | "expired" | "completed" | "cancelled";

type InviteStatePanelProps = {
  variant: InviteStateVariant;
  celebrantName: string;
  celebrantFullName?: string | null;
  dateISO?: string | null;
  timeSlot?: string | null;
  packName?: string | null;
  packBottle?: string | null;
  guestsPlanned?: number | null;
  expiresAt?: string | null;
  hostArrivedAt?: string | null;
  backHref: string;
};

function formatDate(dateISO?: string | null) {
  if (!dateISO) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date(dateISO));
}

function formatTime(timeSlot?: string | null) {
  return timeSlot || null;
}

function formatDaysUntil(dateISO?: string | null) {
  if (!dateISO) return null;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const reservationDate = new Date(dateISO);
  const reservation = new Date(Date.UTC(reservationDate.getUTCFullYear(), reservationDate.getUTCMonth(), reservationDate.getUTCDate()));
  const diffDays = Math.ceil((reservation.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return "hoy";
  if (diffDays === 1) return "1 día";
  return `${diffDays} días`;
}

function InfoPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warm" | "cool" | "success" }) {
  const toneClass =
    tone === "warm"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
      : tone === "cool"
        ? "border-sky-400/30 bg-sky-400/10 text-sky-100"
        : tone === "success"
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-white/15 bg-white/8 text-white/80";

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${toneClass}`}>
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] opacity-70">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

export default function InviteStatePanel({
  variant,
  celebrantName,
  celebrantFullName,
  dateISO,
  timeSlot,
  packName,
  packBottle,
  guestsPlanned,
  expiresAt,
  hostArrivedAt,
  backHref,
}: InviteStatePanelProps) {
  const titleMap: Record<InviteStateVariant, string> = {
    future: "Disponible pronto",
    expired: "Pase expirado",
    completed: "Celebración finalizada",
    cancelled: "Reserva cancelada",
  };

  const subtitleMap: Record<InviteStateVariant, string> = {
    future: "Tu invitación ya existe, pero todavía no abre para uso.",
    expired: "Este enlace ya no puede usarse para ingresar.",
    completed: "La reserva ya fue cerrada y quedó registrada como celebrada.",
    cancelled: "La reserva fue anulada y este pase ya no aplica.",
  };

  const accentMap: Record<InviteStateVariant, string> = {
    future: "from-[#0a2d2d] via-[#07161c] to-[#07070C]",
    expired: "from-[#2d0a0a] via-[#160708] to-[#07070C]",
    completed: "from-[#16301f] via-[#07160f] to-[#07070C]",
    cancelled: "from-[#2d1a1a] via-[#150d0d] to-[#07070C]",
  };

  const iconMap: Record<InviteStateVariant, string> = {
    future: "🕒",
    expired: "⏰",
    completed: "🎉",
    cancelled: "❌",
  };

  const primaryDate = formatDate(dateISO);
  const daysUntil = variant === "future" ? formatDaysUntil(dateISO) : null;
  const displayName = celebrantFullName || celebrantName;

  return (
    <div className={`min-h-screen flex items-center justify-center px-6 py-10 text-white bg-gradient-to-b ${accentMap[variant]}`}>
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <a href={backHref} className="text-xs uppercase tracking-[0.32em] text-white/60 hover:text-white transition">
            ← Volver
          </a>
          <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70">
            Link de invitación
          </span>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-white/75">
                <span>{iconMap[variant]}</span>
                <span>{titleMap[variant]}</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">{displayName}</h1>
              <p className="mt-3 text-base leading-relaxed text-white/75 md:text-lg">{subtitleMap[variant]}</p>
            </div>

            <div className="grid min-w-[11rem] gap-3">
              <InfoPill label="Estado" value={titleMap[variant]} tone={variant === "completed" ? "success" : variant === "future" ? "cool" : variant === "expired" ? "warm" : "neutral"} />
              {variant === "future" && daysUntil && <InfoPill label="Falta" value={daysUntil} tone="cool" />}
              {variant === "expired" && expiresAt && (
                <InfoPill
                  label="Venció"
                  value={new Intl.DateTimeFormat("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Lima",
                  }).format(new Date(expiresAt))}
                  tone="warm"
                />
              )}
              {variant === "completed" && hostArrivedAt && (
                <InfoPill
                  label="Cierre"
                  value={new Intl.DateTimeFormat("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Lima",
                  }).format(new Date(hostArrivedAt))}
                  tone="success"
                />
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoPill label="Fecha" value={primaryDate || "Fecha no disponible"} tone="neutral" />
            <InfoPill label="Hora" value={formatTime(timeSlot) || "Hora no disponible"} tone="neutral" />
            <InfoPill label="Pack" value={packName || "No disponible"} tone="warm" />
            <InfoPill label="Botella" value={packBottle || "No disponible"} tone="warm" />
            <InfoPill label="Invitados" value={typeof guestsPlanned === "number" ? `${guestsPlanned} invitados` : "No especificado"} tone="cool" />
            <InfoPill label="Nombre corto" value={celebrantName} tone="neutral" />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/78">
            {variant === "future" && (
              <p>
                Guarda este enlace. Se activará el día de la reserva y ahí podrás usarlo sin que la pantalla se vea vacía o confusa.
              </p>
            )}
            {variant === "expired" && (
              <p>
                Si necesitas revisar esta invitación, vuelve desde la administración o contacta al equipo para validar el estado de la reserva.
              </p>
            )}
            {variant === "completed" && (
              <p>
                La celebración ya fue marcada como completada. Aquí queda un resumen útil para consulta rápida, sin perder el contexto de la reserva.
              </p>
            )}
            {variant === "cancelled" && (
              <p>
                Esta reserva fue cancelada. No se permitirá el ingreso con este enlace hasta que exista una nueva reserva activa.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
