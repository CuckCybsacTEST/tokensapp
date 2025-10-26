"use client";
export const dynamic = "force-dynamic";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateTime } from 'luxon';

// Simple validators (could replace with zod/yup)
function isValidDateYYYYMMDD(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// Helper para formatear teléfono
function formatPhoneDisplay(phone: string) {
  if (phone.length === 9) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
}

// Simplified styling (removed heavy orange gradients). Maintain subtle marketing tones.

function ReservarCumplePageInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Load packs
  const [packs, setPacks] = useState<
    { id: string; name: string; qrCount: number; bottle?: string | null; perks?: string[] }[]
  >([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [packsError, setPacksError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(() => {
    // Usar Luxon para obtener la fecha actual en zona Lima
    const nowLima = DateTime.now().setZone('America/Lima') as any;
    const year = nowLima.year;
    const month = String(nowLima.month).padStart(2, '0');
    const day = String(nowLima.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [timeSlot, setTimeSlot] = useState("20:00");
  const [packId, setPackId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "creating" | "generating">("idle");
  const [error, setError] = useState<string | null>(null);
  const [referrerId, setReferrerId] = useState<string | null>(null);

  // Preselect from query (support aliases from marketing cards: basic/chispa, plus/fuego, elite/estrella)
  useEffect(() => {
    const q = params?.get("packId") || "";
    if (!q) return;
    if (!packs.length) return; // wait for packs
    // If q is already a DB id, use it directly
    const byId = packs.find((p) => p.id === q);
    if (byId) {
      setPackId(byId.id);
      return;
    }
    const alias = q.toLowerCase();
    const aliasToName: Record<string, string> = {
      basic: "Chispa",
      chispa: "Chispa",
      plus: "Fuego",
      fuego: "Fuego",
      elite: "Estrella",
      estrella: "Estrella",
    };
    const targetName = aliasToName[alias];
    if (targetName) {
      const match = packs.find((p) => p.name.toLowerCase().includes(targetName.toLowerCase()));
      if (match) setPackId(match.id);
    }
  }, [params, packs]);

  // Capture referrer from query param
  useEffect(() => {
    const ref = params?.get("ref");
    if (ref && ref.trim()) {
      // Validate referrer exists and is active
      fetch(`/api/birthdays/referrers/${ref}`)
        .then(res => res.json())
        .then(data => {
          if (data.referrer && data.referrer.active) {
            setReferrerId(data.referrer.id);
          }
        })
        .catch(err => {
          console.warn('Invalid referrer:', err);
          setReferrerId(null);
        });
    } else {
      setReferrerId(null);
    }
  }, [params]);

  // Fetch packs
  useEffect(() => {
    (async () => {
      setLoadingPacks(true);
      setPacksError(null);
      try {
        const res = await fetch("/api/birthdays/packs");
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.packs) throw new Error(j?.message || "Error al cargar packs");
        setPacks(j.packs);
      } catch (e: any) {
        setPacksError(e?.message || "No se pudieron cargar los packs");
      } finally {
        setLoadingPacks(false);
      }
    })();
  }, []);

  const selectedPack = useMemo(() => packs.find((p) => p.id === packId) || null, [packs, packId]);

  // Perks / preview
  // Eliminado preview visual de pack para UI simplificada
  function PackPreview() {
    return null;
  }

  // Simple validation
  function validate(): string | null {
    if (!name.trim()) return "El nombre es obligatorio";
    if (name.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
    // Validar al menos nombre y apellido (mínimo 2 palabras)
    const nameWords = name.trim().split(/\s+/).filter(word => word.length > 0);
    if (nameWords.length < 2) return "Ingresa nombre y apellido (mínimo 2 palabras)";
    if (!whatsapp.trim()) return "WhatsApp es obligatorio";
    if (!/^\d{9}$/.test(whatsapp.trim())) return "WhatsApp debe tener exactamente 9 dígitos (ej: 912345678)";
    if (!documento.trim()) return "Documento es obligatorio";
    if (!/^\d{8,12}$/.test(documento.trim())) return "Documento debe tener entre 8-12 dígitos";
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Email no es válido";
    if (!date || !isValidDateYYYYMMDD(date)) return "Selecciona una fecha válida";
    if (!timeSlot) return "Selecciona un horario";
    if (!packId) return "Selecciona un Pack";
    return null;
  }

  function humanizeError(code?: string, fallback?: string) {
    switch (code) {
      case "RATE_LIMITED":
        return "Estás haciendo muchas solicitudes. Intenta nuevamente en un momento.";
      case "INVALID_BODY":
      case "INVALID_DATE":
        return "Revisa los datos del formulario. Hay campos inválidos.";
      case "INVALID_NAME_MIN_WORDS":
        return "El nombre debe incluir nombre y apellido (mínimo 2 palabras).";
      case "DUPLICATE_DNI_YEAR":
        return "Ya tienes una reserva de cumpleaños este año. Si necesitas cambiar la fecha, contacta con atención al cliente.";
      case "NOT_FOUND":
        return "El servicio no está disponible en este momento.";
      case "CREATE_RESERVATION_ERROR":
        return "No pudimos crear tu reserva. Intenta de nuevo en unos minutos.";
      default:
        return fallback || "Ocurrió un error inesperado";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    setPhase("creating");
    try {
      // guestsPlanned from pack (hidden)
      const guestsPlanned = selectedPack?.qrCount || 5;
      // Create reservation (public)
      const payload = {
        celebrantName: name.trim(),
        phone: whatsapp.trim(),
        documento: documento.trim(),
        email: email.trim() || undefined,
        date,
        timeSlot,
        packId,
        guestsPlanned,
        ...(referrerId && { referrerId }),
      };
      const res = await fetch("/api/birthdays/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        const msg = humanizeError(j?.code, j?.message);
        throw new Error(msg);
      }
      const id: string = j.id;
      const clientSecret: string = j.clientSecret;

      // Immediately generate tokens (idempotent)
      setPhase("generating");
      const res2 = await fetch(`/api/birthdays/reservations/${id}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSecret }),
      });
      const j2 = await res2.json().catch(() => ({}));
      // Si la respuesta tiene items (tokens), se considera éxito
      if (!res2.ok || (!j2?.ok && !Array.isArray(j2?.items))) {
        const msg2 = humanizeError(j2?.code, j2?.message || "No se pudieron generar los QRs");
        throw new Error(msg2);
      }

      // Redirect to QRs page
      router.push(`/marketing/birthdays/${id}/qrs?cs=${encodeURIComponent(clientSecret)}`);
    } catch (e: any) {
      setError(e?.message || "Ocurrió un error al procesar tu reserva");
    } finally {
      setSubmitting(false);
      setPhase("idle");
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 md:py-10 lg:py-12">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 md:p-10 space-y-5">
        <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-orange-300 to-red-400">
            Reserva y genera tus tarjetas al toque
          </span>
        </h1>
        <p className="text-sm md:text-base opacity-85 max-w-2xl leading-relaxed">
          Confirma tu reserva y genera tus tarjetas de invitación al toque. Completa los datos y
          obtén de inmediato tus accesos QR.
        </p>
      </div>

      {/* Anchor to form */}
      <a
        href="/marketing#dynamic-shows-section"
        className="pt-2 scroll-mt-24 md:scroll-mt-32 block"
      >
        <div id="form" />
      </a>

      {/* Sección de confirmación de pack eliminada intencionalmente */}

      {packsError ? (
        <div className="mt-4 p-3 rounded bg-red-900/40 border border-red-500/30 text-sm">
          {packsError}
        </div>
      ) : null}

      <form className="mt-6 space-y-5 md:space-y-6" onSubmit={onSubmit} data-testid="reserve-form">
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">
            Nombre del cumpleañero
          </label>
          <input
            data-testid="input-name"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={name}
            onChange={(e) => {
              // Capitalizar primera letra de cada palabra
              const capitalized = e.target.value.replace(/\b\w/g, l => l.toUpperCase());
              setName(capitalized);
            }}
            placeholder="Juan Pérez"
            maxLength={50}
          />
          <p className="mt-1 text-xs text-white/60">
            Nombre completo del cumpleañero
          </p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">
            WhatsApp
          </label>
          <input
            data-testid="input-whatsapp"
            type="tel"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={whatsapp}
            onChange={(e) => {
              // Formatear automáticamente: quitar +51 y espacios, mantener solo números
              const cleaned = e.target.value.replace(/\D/g, '').replace(/^51/, '');
              // Limitar a 9 dígitos (máximo para Perú)
              const formatted = cleaned.slice(0, 9);
              setWhatsapp(formatted);
            }}
            placeholder="912 345 678"
            maxLength={9}
          />
          <p className="mt-1 text-xs text-white/60">
            Solo números, sin +51 (ej: 912345678)
          </p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">
            Documento
          </label>
          <input
            data-testid="input-documento"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={documento}
            onChange={(e) => {
              // Solo números, máximo 12 dígitos
              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
              setDocumento(cleaned);
            }}
            placeholder="12345678"
            maxLength={12}
          />
          <p className="mt-1 text-xs text-white/60">
            DNI (8 dígitos) o CE/Pasaporte
          </p>
        </div>
        {/* Email oculto por ahora (opcional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">
              Fecha
            </label>
            <input
              data-testid="input-date"
              type="date"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={date}
              min={(() => {
                // Usar Luxon para obtener la fecha actual en zona Lima
                const nowLima = DateTime.now().setZone('America/Lima') as any;
                const year = nowLima.year;
                const month = String(nowLima.month).padStart(2, '0');
                const day = String(nowLima.day).padStart(2, '0');
                return `${year}-${month}-${day}`;
              })()}
              onChange={(e) => setDate(e.target.value)}
            />
            {/* Sugerencia removida según requerimiento */}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">
              Horario
            </label>
            <select
              data-testid="input-timeslot"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
            >
              <option className="text-black" value="20:00">
                20:00
              </option>
              <option className="text-black" value="21:00">
                21:00
              </option>
              <option className="text-black" value="22:00">
                22:00
              </option>
              <option className="text-black" value="23:00">
                23:00
              </option>
              <option className="text-black" value="00:00">
                00:00
              </option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">
            Pack
          </label>
          <select
            data-testid="input-pack"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
          >
            <option className="text-black" value="">
              Selecciona un Pack…
            </option>
            {packs.map((p) => (
              <option className="text-black" key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {/* Preview removido para simplificar UX */}
        </div>

        {error ? (
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-sm backdrop-blur-sm">
            {error}
          </div>
        ) : null}

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
          <button
            data-testid="submit-reservation"
            type="submit"
            disabled={submitting || loadingPacks}
            className="rounded-lg px-6 py-3 text-sm font-semibold tracking-wide bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70 transition disabled:opacity-60 disabled:cursor-not-allowed animate-bounce-slow"
          >
            {submitting
              ? phase === "creating"
                ? "Creando reserva…"
                : "Preparando accesos…"
              : "Confirmar y ver QRs"}
          </button>
          {submitting ? (
            <div
              className="text-xs sm:text-sm opacity-85 animate-pulse"
              data-testid={phase === "creating" ? "state-creating" : "state-generating"}
            >
              {phase === "creating"
                ? "Registrando tu solicitud…"
                : "Generando tus tarjetas QR. Esto puede tardar unos segundos."}
            </div>
          ) : null}
        </div>
      </form>

      {/* Icons with legends for mobile view */}
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex flex-col items-center">
          <img src="/path/to/torta-icon.png" alt="Torta" className="h-6 w-6" />
          <span className="text-[10px] mt-1">Torta</span>
        </div>
        <div className="flex flex-col items-center">
          <img src="/path/to/decoracion-icon.png" alt="Decoración" className="h-6 w-6" />
          <span className="text-[10px] mt-1">Decoración</span>
        </div>
        <div className="flex flex-col items-center">
          <img src="/path/to/qrs-icon.png" alt="QR's" className="h-6 w-6" />
          <span className="text-[10px] mt-1">QR's</span>
        </div>
        <div className="flex flex-col items-center">
          <img src="/path/to/djs-icon.png" alt="DJ's" className="h-6 w-6" />
          <span className="text-[10px] mt-1">DJ's</span>
        </div>
        <div className="flex flex-col items-center">
          <img src="/path/to/taxi-icon.png" alt="Taxi" className="h-6 w-6" />
          <span className="text-[10px] mt-1">Taxi</span>
        </div>
      </div>

      {/* Add subtle animation for the button */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
      `}</style>
    </section>
  );
}

export default function ReservarCumplePage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6">Cargando…</div>}>
      <ReservarCumplePageInner />
    </Suspense>
  );
}
