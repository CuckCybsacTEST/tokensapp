"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { generateQrPngDataUrl } from '@/lib/qr';

type TokenDto = {
  id: string;
  code: string;
  kind: 'host' | 'guest' | string;
  status: string;
  expiresAt: string | null;
  usedCount?: number | null;
  maxUses?: number | null;
};

export default function QRsFinalesPage() {
  const { id } = useParams<{ id: string }>();
  const qs = useSearchParams();
  const cs = qs.get('cs') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenDto[]>([]);
  const [qrData, setQrData] = useState<Record<string, string>>({}); // tokenId -> dataURL

  const host = useMemo(() => tokens.find(t => t.kind === 'host') || null, [tokens]);
  const guest = useMemo(() => tokens.find(t => t.kind === 'guest') || null, [tokens]);

  useEffect(() => {
    (async () => {
      if (!id || !cs) { setError('Falta el parámetro de seguridad. Vuelve al formulario.'); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/birthdays/reservations/${id}/tokens?clientSecret=${encodeURIComponent(cs)}`);
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j?.ok || !Array.isArray(j?.items)) {
          throw new Error(j?.code || j?.message || 'No se pudieron cargar los QRs');
        }
        setTokens(j.items as TokenDto[]);
      } catch (e: any) {
        setError(e?.message || 'No se pudieron cargar los QRs');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, cs]);

  // Generate QR PNG data URLs client-side for each token code
  useEffect(() => {
    (async () => {
      const entries: Record<string, string> = {};
      for (const t of tokens) {
        const url = typeof window !== 'undefined' ? `${location.origin}/r/${t.code}` : `/r/${t.code}`;
        try {
          entries[t.id] = await generateQrPngDataUrl(url);
        } catch {
          // ignore individual failures; keep others
        }
      }
      setQrData(entries);
    })();
  }, [tokens]);

  function copyLink(code: string) {
    const url = typeof window !== 'undefined' ? `${location.origin}/r/${code}` : `/r/${code}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  function downloadPng(tokenId: string, filename: string) {
    const dataUrl = qrData[tokenId];
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (loading) {
    return (
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-extrabold">Cargando tus QRs…</h1>
        <p className="opacity-80 mt-2">Estamos preparando tus accesos. Esto puede tardar unos segundos.</p>
      </section>
    );
  }

  if (error) {
    const isAuthErr = /EXPIRED|UNAUTHORIZED|INVALID/i.test(error);
    const isRate = /RATE_LIMITED/i.test(error);
    return (
      <section className="container mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-extrabold">No pudimos mostrar tus QRs</h1>
        <p className="opacity-80 mt-2">
          {isAuthErr ? 'Tu enlace de seguridad expiró o es inválido.' : isRate ? 'Estás haciendo muchas solicitudes. Intenta nuevamente en un momento.' : error}
        </p>
        <div className="mt-4 flex gap-3">
          <a href="/marketing/birthdays/reservar" className="rounded px-4 py-2 font-semibold" style={{ background: '#3D2EFF' }}>Volver al formulario</a>
          <button onClick={()=>location.reload()} className="rounded px-4 py-2 font-semibold border border-white/20">Reintentar</button>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4">
        <a href="/" className="inline-block rounded px-4 py-2 text-sm font-semibold border border-white/20 hover:bg-white/10 transition-colors">Volver al inicio</a>
      </div>
      <h1 className="text-2xl font-extrabold">Tus tarjetas QR</h1>
      <p className="opacity-80 mt-1">Descarga y comparte tus códigos. El de invitados puedes compartirlo por WhatsApp.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cumpleañero (host) */}
        {host && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4" data-testid="qr-host">
            <div className="text-sm font-semibold opacity-90">Cumpleañero</div>
            <div className="mt-1 text-xs opacity-80">Estado: {host.status || 'activo'} · 1 uso</div>
            <div className="mt-3 flex items-center justify-center">
              {qrData[host.id] ? (
                <img src={qrData[host.id]} alt="QR cumpeañero" data-testid="qr-host-img" className="w-56 h-56 bg-white p-2 rounded" />
              ) : (
                <div className="w-56 h-56 bg-white/10 rounded animate-pulse" />
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={()=>downloadPng(host.id, 'cumpleanero.png')} className="rounded px-3 py-2 text-sm font-semibold" style={{ background: '#3D2EFF' }}>Descargar PNG</button>
              <button onClick={()=>copyLink(host.code)} className="rounded px-3 py-2 text-sm font-semibold border border-white/20">Copiar link de canje</button>
            </div>
          </div>
        )}

        {/* Invitados (guest) */}
        {guest && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4" data-testid="qr-guest">
            <div className="text-sm font-semibold opacity-90">Invitados</div>
            <div className="mt-1 text-xs opacity-80">Compártelo con tus invitados</div>
            <div className="mt-3 flex items-center justify-center">
              {qrData[guest.id] ? (
                <img src={qrData[guest.id]} alt="QR invitados" data-testid="qr-guest-img" className="w-56 h-56 bg-white p-2 rounded" />
              ) : (
                <div className="w-56 h-56 bg-white/10 rounded animate-pulse" />
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={()=>downloadPng(guest.id, 'invitados.png')} className="rounded px-3 py-2 text-sm font-semibold" style={{ background: '#3D2EFF' }}>Descargar PNG</button>
              <button onClick={()=>copyLink(guest.code)} className="rounded px-3 py-2 text-sm font-semibold border border-white/20">Copiar link de canje</button>
            </div>
          </div>
        )}
      </div>

      {(!host || !guest) && (
        <p className="mt-4 text-sm opacity-70">Nota: No se encontraron ambos tokens esperados. Si el problema persiste, vuelve a intentarlo desde el formulario.</p>
      )}
    </section>
  );
}
