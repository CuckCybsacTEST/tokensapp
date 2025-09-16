"use client";
export const dynamic = 'force-dynamic';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Simple validators (could replace with zod/yup)
function isValidDateYYYYMMDD(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function ReservarCumplePageInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Load packs
  const [packs, setPacks] = useState<{ id: string; name: string; qrCount: number; bottle?: string | null; perks?: string[] }[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [packsError, setPacksError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [timeSlot, setTimeSlot] = useState("20:00");
  const [packId, setPackId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<'idle'|'creating'|'generating'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Preselect from query (support aliases from marketing cards: basic/chispa, plus/fuego, elite/estrella)
  useEffect(() => {
    const q = params?.get('packId') || '';
    if (!q) return;
    if (!packs.length) return; // wait for packs
    // If q is already a DB id, use it directly
    const byId = packs.find(p => p.id === q);
    if (byId) { setPackId(byId.id); return; }
    const alias = q.toLowerCase();
    const aliasToName: Record<string, string> = {
      basic: 'Chispa', chispa: 'Chispa',
      plus: 'Fuego', fuego: 'Fuego',
      elite: 'Estrella', estrella: 'Estrella'
    };
    const targetName = aliasToName[alias];
    if (targetName) {
      const match = packs.find(p => p.name.toLowerCase().includes(targetName.toLowerCase()));
      if (match) setPackId(match.id);
    }
  }, [params, packs]);

  // Fetch packs
  useEffect(() => {
    (async () => {
      setLoadingPacks(true);
      setPacksError(null);
      try {
        const res = await fetch('/api/birthdays/packs');
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.packs) throw new Error(j?.message || 'Error al cargar packs');
        setPacks(j.packs);
      } catch (e: any) {
        setPacksError(e?.message || 'No se pudieron cargar los packs');
      } finally {
        setLoadingPacks(false);
      }
    })();
  }, []);

  const selectedPack = useMemo(() => packs.find(p => p.id === packId) || null, [packs, packId]);

  // Perks / preview
  function PackPreview() {
    if (!selectedPack) return null;
    return (
      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="font-semibold">{selectedPack.name}</div>
        {selectedPack.bottle ? (
          <div className="text-sm mt-1">🍾 Botella de cortesía: {selectedPack.bottle}</div>
        ) : null}
        {selectedPack.perks && selectedPack.perks.length ? (
          <ul className="mt-2 list-disc pl-5 text-sm opacity-90">
            {selectedPack.perks.map((p: string) => <li key={p}>{p}</li>)}
          </ul>
        ) : null}
      </div>
    );
  }

  // Simple validation
  function validate(): string | null {
    if (!name.trim()) return 'El nombre es obligatorio';
    if (!whatsapp.trim() || whatsapp.trim().length < 5) return 'WhatsApp es obligatorio y debe ser válido';
    if (!documento.trim() || documento.trim().length < 3) return 'Documento es obligatorio';
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Email no es válido';
    if (!date || !isValidDateYYYYMMDD(date)) return 'Selecciona una fecha válida';
    if (!timeSlot) return 'Selecciona un horario';
    if (!packId) return 'Selecciona un Pack';
    return null;
  }

  function humanizeError(code?: string, fallback?: string) {
    switch (code) {
      case 'RATE_LIMITED':
        return 'Estás haciendo muchas solicitudes. Intenta nuevamente en un momento.';
      case 'INVALID_BODY':
      case 'INVALID_DATE':
        return 'Revisa los datos del formulario. Hay campos inválidos.';
      case 'NOT_FOUND':
        return 'El servicio no está disponible en este momento.';
      case 'CREATE_RESERVATION_ERROR':
        return 'No pudimos crear tu reserva. Intenta de nuevo en unos minutos.';
      default:
        return fallback || 'Ocurrió un error inesperado';
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setSubmitting(true);
    setPhase('creating');
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
      };
      const res = await fetch('/api/birthdays/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        const msg = humanizeError(j?.code, j?.message);
        throw new Error(msg);
      }
      const id: string = j.id;
      const clientSecret: string = j.clientSecret;

      // Immediately generate tokens (idempotent)
      setPhase('generating');
      const res2 = await fetch(`/api/birthdays/reservations/${id}/tokens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientSecret }) });
      const j2 = await res2.json().catch(() => ({}));
      if (!res2.ok || !j2?.ok) {
        const msg2 = humanizeError(j2?.code, j2?.message || 'No se pudieron generar los QRs');
        throw new Error(msg2);
      }

      // Redirect to QRs page
      router.push(`/marketing/birthdays/${id}/qrs?cs=${encodeURIComponent(clientSecret)}`);
    } catch (e: any) {
      setError(e?.message || 'Ocurrió un error al procesar tu reserva');
    } finally {
      setSubmitting(false);
      setPhase('idle');
    }
  }

  return (
    <section className="container mx-auto max-w-3xl px-4 py-8">
      {/* Hero de alto impacto */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 85%, rgba(255,77,46,0.35), transparent 40%), radial-gradient(circle at 85% 15%, rgba(255,122,60,0.35), transparent 40%)' }} />
        <div className="relative z-10 px-5 md:px-8 py-8 md:py-10">
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">Tu cumple, con accesos QR</h1>
          <p className="mt-2 md:mt-3 text-base md:text-lg opacity-85 max-w-2xl">Elegí tu Pack, coordinamos por WhatsApp y recibís tus tarjetas QR para vos y tus invitados. Rápido, simple y con beneficios.</p>
          {/* Chips de beneficios */}
          <div className="mt-4 flex flex-wrap gap-2">
            {['QR para invitados','Botella de cortesía','Coordinación por WhatsApp','Fecha y horario a elección'].map(b => (
              <span key={b} className="px-3 py-1.5 rounded-full text-xs border" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>{b}</span>
            ))}
            {selectedPack ? (
              <span className="px-3 py-1.5 rounded-full text-xs border font-semibold" style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)' }}>Pack: {selectedPack.name}{selectedPack.bottle ? ` · 🍾 ${selectedPack.bottle}` : ''}</span>
            ) : null}
          </div>
          <div className="mt-5">
            <a href="#form" className="inline-block rounded px-5 py-2.5 text-sm font-semibold shadow-md" style={{ background: '#3D2EFF' }}>Ir al formulario</a>
          </div>
        </div>
      </div>

      {/* Anchor to form */}
      <div id="form" className="pt-2 scroll-mt-24 md:scroll-mt-32" />
      <h1 className="text-2xl font-extrabold">Reserva tu cumpleaños</h1>
      <p className="opacity-80 mt-1">Completa tus datos para confirmar tu Pack. Te mostraremos tus tarjetas QR al finalizar.</p>

      {/* Confirmación previa al form */}
      {selectedPack ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-sm">Vas a reservar el <span className="font-semibold">{selectedPack.name}</span>.</div>
          {selectedPack.bottle ? <div className="text-xs opacity-80 mt-1">Incluye botella de cortesía: {selectedPack.bottle}</div> : null}
        </div>
      ) : null}

      {packsError ? (
        <div className="mt-4 p-3 rounded bg-red-900/40 border border-red-500/30 text-sm">{packsError}</div>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={onSubmit} data-testid="reserve-form">
        <div>
          <label className="block text-sm font-semibold">Nombre del cumpleañero</label>
          <input data-testid="input-name" className="mt-1 w-full rounded border border-white/10 bg-transparent px-3 py-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre" />
        </div>
        <div>
          <label className="block text-sm font-semibold">WhatsApp</label>
          <input data-testid="input-whatsapp" className="mt-1 w-full rounded border border-white/10 bg-transparent px-3 py-2" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="+51 9xx xxx xxx" />
        </div>
        <div>
          <label className="block text-sm font-semibold">Documento</label>
          <input data-testid="input-documento" className="mt-1 w-full rounded border border-white/10 bg-transparent px-3 py-2" value={documento} onChange={e=>setDocumento(e.target.value)} placeholder="DNI / CE" />
        </div>
        {/* Email oculto por ahora (opcional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold">Fecha</label>
            <input data-testid="input-date" type="date" className="mt-1 w-full rounded border border-white/10 bg-transparent px-3 py-2" value={date} min={date} onChange={e=>setDate(e.target.value)} />
            <div className="text-xs opacity-70 mt-1">Sugerencia: elige una fecha de este mes. Puedes cambiarla luego con nuestro equipo.</div>
          </div>
          <div>
            <label className="block text-sm font-semibold">Horario</label>
            <select data-testid="input-timeslot" className="mt-1 w-full rounded border border-white/10 bg-transparent px-3 py-2" value={timeSlot} onChange={e=>setTimeSlot(e.target.value)}>
              <option className="text-black" value="20:00">20:00</option>
              <option className="text-black" value="21:00">21:00</option>
              <option className="text-black" value="22:00">22:00</option>
              <option className="text-black" value="23:00">23:00</option>
              <option className="text-black" value="00:00">00:00</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold">Pack</label>
          <select data-testid="input-pack" className="mt-1 w-full rounded border border-white/10 bg-transparent px-3 py-2" value={packId} onChange={e=>setPackId(e.target.value)}>
            <option className="text-black" value="">Selecciona un Pack…</option>
            {packs.map(p => (
              <option className="text-black" key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* Preview del pack (botella/perks) */}
          <PackPreview />
        </div>

        {error ? <div className="p-3 rounded bg-red-900/40 border border-red-500/30 text-sm">{error}</div> : null}

        <div className="pt-2">
          <button data-testid="submit-reservation" type="submit" disabled={submitting || loadingPacks} className="rounded px-4 py-2 font-semibold" style={{ background: '#3D2EFF', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? (phase === 'creating' ? 'Creando reserva…' : 'Estamos preparando tus accesos…') : 'Confirmar y ver QRs'}
          </button>
          {submitting ? (
            <div className="mt-2 text-sm opacity-80" data-testid={phase === 'creating' ? 'state-creating' : 'state-generating'}>
              {phase === 'creating' ? 'Registrando tu solicitud…' : 'Generando tus tarjetas QR. Esto puede tardar unos segundos.'}
            </div>
          ) : null}
        </div>
      </form>
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
