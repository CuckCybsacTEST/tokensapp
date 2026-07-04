'use client';

import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type ReferrerResult = {
  id: string;
  name: string;
  slug: string;
  approvalStatus: ApprovalStatus;
  active: boolean;
  commissionAmount: number;
  termsVersion?: string;
  link: string;
};

export default function RegistrarReferidosPage() {
  const [mode, setMode] = useState<'register' | 'recover'>('register');
  const [commissionAmount, setCommissionAmount] = useState(10);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReferrerResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    whatsapp: '',
    termsAccepted: false,
  });
  const [recoverForm, setRecoverForm] = useState({ dni: '', whatsapp: '' });

  useEffect(() => {
    fetch('/api/birthdays/referrers/config')
      .then((res) => res.json())
      .then((data) => setCommissionAmount(Number(data.commissionAmount || 10)))
      .catch(() => setCommissionAmount(10))
      .finally(() => setLoadingConfig(false));
  }, []);

  useEffect(() => {
    if (!result?.link) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(result.link, { width: 256, margin: 2 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [result]);

  const statusLabel = useMemo(() => {
    if (!result) return null;
    if (result.approvalStatus === 'PENDING') return 'Pendiente de aprobación';
    if (result.approvalStatus === 'REJECTED') return 'Rechazado';
    return result.active ? 'Aprobado y activo' : 'Aprobado sin activar';
  }, [result]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/birthdays/referrers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo registrar el referido');
      setResult(data.referrer);
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar el referido');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/birthdays/referrers/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recoverForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo recuperar el link');
      setResult(data.referrer);
    } catch (err: any) {
      setError(err.message || 'No se pudo recuperar el link');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),transparent_30%),linear-gradient(180deg,#12070a_0%,#09090f_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">
            Programa de referidos
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">Registra tu link y comparte tu QR</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            Regístrate como referrer, acepta el contrato y recibe tu link de invitación. Tu acceso queda visible de inmediato, aunque pase primero por aprobación del equipo.
          </p>
          <div className="mt-6 rounded-[22px] border border-sky-300/20 bg-sky-400/10 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">Comisión vigente</div>
            <div className="mt-2 text-4xl font-black text-white">S/ {loadingConfig ? '...' : commissionAmount.toFixed(2)}</div>
            <p className="mt-2 text-sm text-white/70">Se aplica globalmente a todos los referrers aprobados desde el panel de control.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
          <div className="flex gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button type="button" onClick={() => setMode('register')} className={mode === 'register' ? 'flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950' : 'flex-1 rounded-full px-4 py-2 text-sm font-semibold text-white/70'}>Registrar</button>
            <button type="button" onClick={() => setMode('recover')} className={mode === 'recover' ? 'flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950' : 'flex-1 rounded-full px-4 py-2 text-sm font-semibold text-white/70'}>Recuperar</button>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

          {mode === 'register' ? (
            <form className="mt-6 space-y-4" onSubmit={handleRegister}>
              <div className="grid gap-4 sm:grid-cols-2">
                <input value={registerForm.firstName} onChange={(e) => setRegisterForm((current) => ({ ...current, firstName: e.target.value }))} placeholder="Nombres" className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" required />
                <input value={registerForm.lastName} onChange={(e) => setRegisterForm((current) => ({ ...current, lastName: e.target.value }))} placeholder="Apellidos" className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input value={registerForm.dni} onChange={(e) => setRegisterForm((current) => ({ ...current, dni: e.target.value }))} placeholder="DNI" className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" required />
                <input value={registerForm.whatsapp} onChange={(e) => setRegisterForm((current) => ({ ...current, whatsapp: e.target.value }))} placeholder="WhatsApp" className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" required />
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
                <input type="checkbox" checked={registerForm.termsAccepted} onChange={(e) => setRegisterForm((current) => ({ ...current, termsAccepted: e.target.checked }))} className="mt-1 h-4 w-4 rounded border-white/20" />
                <span>Acepto el contrato del programa de referidos y autorizo la validación de mis datos para aprobación.</span>
              </label>
              <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">{submitting ? 'Registrando...' : 'Registrar mi link'}</button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleRecover}>
              <input value={recoverForm.dni} onChange={(e) => setRecoverForm((current) => ({ ...current, dni: e.target.value }))} placeholder="DNI" className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" required />
              <input value={recoverForm.whatsapp} onChange={(e) => setRecoverForm((current) => ({ ...current, whatsapp: e.target.value }))} placeholder="WhatsApp" className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35" required />
              <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-60">{submitting ? 'Recuperando...' : 'Recuperar link y QR'}</button>
            </form>
          )}

          {result ? (
            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-white">{result.name}</div>
                  <div className="text-sm text-white/55">/{result.slug}</div>
                </div>
                <span className={result.approvalStatus === 'PENDING' ? 'rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100' : result.approvalStatus === 'APPROVED' && result.active ? 'rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100' : 'rounded-full border border-rose-300/30 bg-rose-300/10 px-3 py-1 text-xs font-semibold text-rose-100'}>{statusLabel}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/72">
                {result.approvalStatus === 'PENDING'
                  ? 'Tu link ya fue generado, pero todavía está en proceso de aprobación. Puedes guardarlo y volver luego a este sitio para consultar el estado.'
                  : result.approvalStatus === 'APPROVED' && result.active
                    ? 'Tu link ya está listo para compartir.'
                    : 'Tu link existe, pero no está habilitado en este momento. Contacta al equipo si necesitas soporte.'}
              </p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs break-all text-white/70">{result.link}</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={() => navigator.clipboard.writeText(result.link)} className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white">Copiar link</button>
                {qrDataUrl ? <a href={qrDataUrl} download={`referrer-${result.slug}.png`} className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white">Descargar QR</a> : null}
              </div>
              {qrDataUrl ? <img src={qrDataUrl} alt={`QR para ${result.slug}`} className="mt-5 h-48 w-48 rounded-2xl border border-white/10 bg-white p-2" /> : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}