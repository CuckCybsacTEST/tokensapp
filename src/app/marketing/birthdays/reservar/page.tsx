"use client";
export const dynamic = "force-dynamic";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateTime } from "luxon";
import { ReservationMessageModal } from "@/components/ReservationMessageModal";
import { BottleIceModal } from "@/components/BottleIceModal";
import { getValidationErrorDetails, getServerErrorDetails } from "@/lib/reservation-errors";

// Utilidad simple para validar fecha
function isValidDateYYYYMMDD(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// Helper: convierte un DateTime de Luxon a 'yyyy-MM-dd' de forma segura (tolerante a tipos)
function luxonDateToYMD(dt: any): string {
  try {
    const iso: string | undefined = dt?.toISO?.() || dt?.toISODate?.();
    if (iso && typeof iso === "string") {
      const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
  } catch {}
  const js = new Date();
  const y = js.getFullYear();
  const m = String(js.getMonth() + 1).padStart(2, "0");
  const d = String(js.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ReservarCumplePageInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Tipo para packs
  type PackType = { id: string; name: string; qrCount: number; bottle?: string | null; perks?: string[] };

  // Packs
  const [packs, setPacks] = useState<PackType[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [packsLoaded, setPacksLoaded] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(() => {
    const now: any = (DateTime as any).now().setZone("America/Lima");
    return luxonDateToYMD(now);
  });
  const [timeSlot, setTimeSlot] = useState("20:00");
  const [packId, setPackId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "creating" | "generating">("idle");
  const [referrerId, setReferrerId] = useState<string | null>(null);

  // Modal de hielo/botella
  const [showBottleIceModal, setShowBottleIceModal] = useState(false);
  const [reservationData, setReservationData] = useState<{ id: string; clientSecret: string } | null>(null);

  // Modal
  const [modalMessage, setModalMessage] = useState<{
    field: "name" | "whatsapp" | "documento" | "date" | "pack" | "general";
    type: "error" | "warning" | "info";
    title: string;
    message: string;
    suggestions: string[];
    isOpen: boolean;
  } | null>(null);

  // Preselección por query
  useEffect(() => {
    const q = params?.get("packId") || "";
    if (!q || !packs.length) return;
    const byId = packs.find(p => p.id === q);
    if (byId) { setPackId(byId.id); return; }
    const aliasToName: Record<string, string> = { basic: "Chispa", chispa: "Chispa", plus: "Fuego", fuego: "Fuego", elite: "Estrella", estrella: "Estrella" };
    const targetName = aliasToName[q.toLowerCase()];
    if (targetName) {
      const match = packs.find(p => p.name.toLowerCase().includes(targetName.toLowerCase()));
      if (match) setPackId(match.id);
    }
  }, [params, packs]);

  // Referrer
  useEffect(() => {
    const ref = params?.get("ref");
    if (ref && ref.trim()) {
      fetch(`/api/birthdays/referrers/${ref}`)
        .then(res => res.json())
        .then(data => { if (data.referrer?.active) setReferrerId(data.referrer.id); else setReferrerId(null); })
        .catch(() => setReferrerId(null));
    } else {
      setReferrerId(null);
    }
  }, [params]);

  // Cargar packs
  useEffect(() => {
    if (packsLoaded) return;
    (async () => {
      setLoadingPacks(true);
      try {
        const res = await fetch("/api/birthdays/packs");
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.packs) throw new Error(j?.message || "Error al cargar packs");
        // Deduplicar por ID para evitar duplicados en la UI
        const packMap = new Map<string, PackType>();
        j.packs.forEach((p: any) => packMap.set(p.id, p as PackType));
        const uniquePacks: PackType[] = Array.from(packMap.values());
        setPacks(uniquePacks);
      } catch (e:any) {
        const details = getValidationErrorDetails("No se pudieron cargar los packs");
        if (details) setModalMessage({ ...details, isOpen: true });
      } finally {
        setLoadingPacks(false);
        setPacksLoaded(true);
      }
    })();
  }, [packsLoaded]);

  const selectedPack = useMemo(() => packs.find(p => p.id === packId) || null, [packs, packId]);

  // Validación
  function validateBasic(): string | null {
    if (!name.trim()) return "El nombre es obligatorio";
    if (name.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) return "Ingresa nombre y apellido (mínimo 2 palabras)";
    if (!whatsapp.trim()) return "WhatsApp es obligatorio";
    if (!/^\d{9}$/.test(whatsapp.trim())) return "WhatsApp debe tener exactamente 9 dígitos (ej: 912345678)";
    if (!documento.trim()) return "Documento es obligatorio";
    // Alinear con backend: DNI exacto 8 dígitos
    if (!/^\d{8}$/.test(documento.trim())) return "Documento debe tener 8 dígitos (DNI)";
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Email no es válido";
    if (!date || !isValidDateYYYYMMDD(date)) return "Selecciona una fecha válida";
    if (!timeSlot) return "Selecciona un horario";
    if (!packId) return "Selecciona un Pack";
    return null;
  }

  function runValidation(): boolean {
    const msg = validateBasic();
    if (msg) {
      const details = getValidationErrorDetails(msg);
      if (details) setModalMessage({ ...details, isOpen: true });
      return false;
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!runValidation()) return;
    setSubmitting(true);
    setPhase("creating");
    try {
      const guestsPlanned = selectedPack?.qrCount || 5;
      const payload = { celebrantName: name.trim(), phone: whatsapp.trim(), documento: documento.trim(), email: email.trim() || undefined, date, timeSlot, packId, guestsPlanned, ...(referrerId && { referrerId }) };
      const res = await fetch("/api/birthdays/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) { const d = getServerErrorDetails(j?.code, j?.message); setModalMessage({ ...d, isOpen: true }); return; }
      const id: string = j.id; const clientSecret: string = j.clientSecret;
      setPhase("generating");
      const res2 = await fetch(`/api/birthdays/reservations/${id}/tokens`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientSecret }) });
      const j2 = await res2.json().catch(() => ({}));
      if (!res2.ok || (!j2?.ok && !Array.isArray(j2?.items))) { const d2 = getServerErrorDetails(j2?.code, j2?.message || "No se pudieron generar los QRs"); setModalMessage({ ...d2, isOpen: true }); return; }
      // En lugar de redirigir, mostrar el modal de hielo
      setReservationData({ id, clientSecret });
      setShowBottleIceModal(true);
    } catch (e:any) {
      const d = getServerErrorDetails(undefined, e?.message || "Ocurrió un error al procesar tu reserva");
      setModalMessage({ ...d, isOpen: true });
    } finally {
      setSubmitting(false);
      setPhase("idle");
    }
  }

  // Handlers para el modal de hielo
  const handleBottleIceContinue = () => {
    if (reservationData) {
      router.push(`/marketing/birthdays/${reservationData.id}/qrs?cs=${encodeURIComponent(reservationData.clientSecret)}`);
    }
    setShowBottleIceModal(false);
    setReservationData(null);
  };

  const handleBottleIceCancel = async () => {
    if (!reservationData) {
      setShowBottleIceModal(false);
      setReservationData(null);
      setSubmitting(false);
      setPhase("idle");
      return;
    }

    try {
      // Cancelar la reserva usando el endpoint de admin
      const res = await fetch(`/api/admin/birthdays/${encodeURIComponent(reservationData.id)}/cancel`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Si falla la cancelación, mostrar error pero permitir continuar
        console.error('Error al cancelar reserva:', j);
        const d = getServerErrorDetails(j?.code, j?.message || "Error al cancelar la reserva");
        setModalMessage({ ...d, isOpen: true });
        return;
      }

      // Cancelación exitosa - mostrar mensaje y resetear
      setModalMessage({
        field: "general",
        type: "info",
        title: "Reserva cancelada",
        message: "Tu reserva ha sido cancelada exitosamente.",
        suggestions: [],
        isOpen: true
      });

    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      // En caso de error de red, mostrar mensaje genérico
      setModalMessage({
        field: "general",
        type: "error",
        title: "Error de conexión",
        message: "No se pudo cancelar la reserva. Por favor contacta al soporte.",
        suggestions: ["Intenta nuevamente más tarde", "Contacta al soporte técnico"],
        isOpen: true
      });
    } finally {
      setShowBottleIceModal(false);
      setReservationData(null);
      setSubmitting(false);
      setPhase("idle");
    }
  };

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

      <a href="/marketing#dynamic-shows-section" className="pt-2 scroll-mt-24 md:scroll-mt-32 block">
        <div id="form" />
      </a>

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
              const capitalized = e.target.value.replace(/\b\w/g, (l) => l.toUpperCase());
              setName(capitalized);
            }}
            placeholder="Juan Pérez"
            maxLength={50}
          />
          <p className="mt-1 text-xs text-white/60">Nombre completo del cumpleañero</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">WhatsApp</label>
          <input
            data-testid="input-whatsapp"
            type="tel"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={whatsapp}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, "").replace(/^51/, "");
              setWhatsapp(cleaned.slice(0, 9));
            }}
            placeholder="912 345 678"
            maxLength={9}
          />
          <p className="mt-1 text-xs text-white/60">Solo números, sin +51 (ej: 912345678)</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">Documento</label>
          <input
            data-testid="input-documento"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={documento}
            onChange={(e) => setDocumento(e.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="12345678"
            maxLength={12}
          />
          <p className="mt-1 text-xs text-white/60">DNI (8 dígitos) o CE/Pasaporte</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">Fecha</label>
            <input
              data-testid="input-date"
              type="date"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={date}
              min={(() => {
                const now: any = (DateTime as any).now().setZone("America/Lima");
                return luxonDateToYMD(now);
              })()}
              max={(() => {
                // Limitar hasta el último día del mes actual en zona Lima
                const maxDate: any = (DateTime as any).now().setZone("America/Lima").endOf('month');
                return luxonDateToYMD(maxDate);
              })()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">Horario</label>
            <select
              data-testid="input-timeslot"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
            >
              <option className="text-black" value="20:00">20:00</option>
              <option className="text-black" value="21:00">21:00</option>
              <option className="text-black" value="22:00">22:00</option>
              <option className="text-black" value="23:00">23:00</option>
              <option className="text-black" value="00:00">00:00</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold opacity-75">Pack</label>
          <select
            data-testid="input-pack"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
          >
            <option className="text-black" value="">Selecciona un Pack…</option>
            {packs.map((p) => (
              <option className="text-black" key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
          <button
            data-testid="submit-reservation"
            type="submit"
            disabled={submitting || loadingPacks}
            className="rounded-lg px-6 py-3 text-sm font-semibold tracking-wide bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (phase === "creating" ? "Creando reserva…" : "Preparando accesos…") : "Confirmar y ver QRs"}
          </button>
          {submitting ? (
            <div className="text-xs sm:text-sm opacity-85 animate-pulse" data-testid={phase === "creating" ? "state-creating" : "state-generating"}>
              {phase === "creating" ? "Registrando tu solicitud…" : "Generando tus tarjetas QR. Esto puede tardar unos segundos."}
            </div>
          ) : null}
        </div>
      </form>

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

      {/* Modal de información sobre hielo y complementos */}
      <BottleIceModal
        isOpen={showBottleIceModal}
        onClose={handleBottleIceCancel}
        onContinue={handleBottleIceContinue}
      />

      {modalMessage && (
        <ReservationMessageModal
          field={modalMessage.field}
          type={modalMessage.type}
          title={modalMessage.title}
          message={modalMessage.message}
          suggestions={modalMessage.suggestions}
          isOpen={modalMessage.isOpen}
          onClose={() => setModalMessage(null)}
          actionButton={{ label: "Entendido", onClick: () => setModalMessage(null) }}
        />
      )}
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
