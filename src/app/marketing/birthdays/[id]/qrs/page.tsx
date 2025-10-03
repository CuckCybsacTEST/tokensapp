"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { generateQrPngDataUrl } from '@/lib/qr'; // still used for fallback if card fails (optional)

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
  const mode = qs.get('mode') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenDto[]>([]);
  const [qrData, setQrData] = useState<Record<string, string>>({}); // tokenId -> dataURL (fallback QR only)
  const [cardFailed, setCardFailed] = useState<Record<string, boolean>>({});

  const host = useMemo(() => tokens.find(t => t.kind === 'host') || null, [tokens]);
  const guest = useMemo(() => tokens.find(t => t.kind === 'guest') || null, [tokens]);

  useEffect(() => {
    (async () => {
      if (!id) { setError('Falta ID'); setLoading(false); return; }
      // Admin mode bypasses client secret but now falls back to public-secret if unauthorized
      if (!cs && mode === 'admin') {
        setLoading(true); setError(null);
        try {
          const [tRes, cRes] = await Promise.all([
            fetch(`/api/admin/birthdays/${id}/tokens`),
            fetch(`/api/admin/birthdays/${id}/cards`)
          ]);
          if (tRes.status === 401 || tRes.status === 403 || cRes.status === 401 || cRes.status === 403) {
            // Try public-secret fallback to get ephemeral client secret
            const secRes = await fetch(`/api/birthdays/reservations/${id}/public-secret`);
            if (secRes.ok) {
              const secJson = await secRes.json().catch(()=>({}));
              const newCs = secJson?.clientSecret;
              if (newCs) {
                // Now load public tokens using newCs
                const pubRes = await fetch(`/api/birthdays/reservations/${id}/tokens?clientSecret=${encodeURIComponent(newCs)}`);
                const pubJson = await pubRes.json().catch(()=>({}));
                if (pubRes.ok && pubJson?.items) {
                  setTokens(pubJson.items);
                  setLoading(false);
                  return;
                }
              }
            }
            throw new Error('No autorizado (se requiere enlace público válido)');
          }
          const tJson = await tRes.json().catch(()=>({}));
          const cJson = await cRes.json().catch(()=>({}));
          if (!tRes.ok) throw new Error(tJson?.code || tJson?.message || 'No se pudieron cargar tokens');
          setTokens(tJson.items || []);
        } catch(e:any){ setError(e?.message||'No se pudieron cargar los QRs'); }
        finally { setLoading(false); }
        return;
      }
      if (!cs) { setError('Falta el parámetro de seguridad. Vuelve al formulario.'); setLoading(false); return; }
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
  }, [id, cs, mode]);

  // Generate QR PNG data URLs client-side for each token code (fallback only)
  useEffect(() => {
    (async () => {
      const entries: Record<string, string> = {};
      for (const t of tokens) {
  // Use dedicated birthday invite path (/b/) separate from roulette tokens
  const url = typeof window !== 'undefined' ? `${location.origin}/b/${t.code}` : `/b/${t.code}`;
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
  const url = typeof window !== 'undefined' ? `${location.origin}/b/${code}` : `/b/${code}`;
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
          <div
            className="relative overflow-hidden rounded-2xl p-5"
            data-testid="qr-host"
            style={{
              background: 'linear-gradient(145deg,#121212 0%,#1d1d1d 55%,#262017 100%)',
              boxShadow: '0 0 0 2px #D4AF37, 0 0 18px -4px rgba(212,175,55,0.5)',
            }}
          >
            <div className="absolute top-2 right-2 select-none">
              <span
                className="text-[11px] tracking-[0.18em] font-extrabold px-3 py-1 rounded-full shadow"
                style={{
                  background: 'linear-gradient(90deg,#FFD873,#E7B647)',
                  color: '#1a1205',
                  border: '1px solid rgba(0,0,0,0.35)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.06)'
                }}
              >VIP</span>
            </div>
            <div className="text-sm font-semibold" style={{ color: '#D4AF37' }}>Cumpleañero</div>
            <div className="mt-1 text-xs opacity-80">Estado: {host.status || 'activo'} · 1 uso</div>
            <div className="mt-4 flex items-center justify-center">
              <div className="relative w-full flex items-center justify-center">
                <img
                  src={`/api/birthdays/invite/${host.code}/card`}
                  alt="Tarjeta cumpleañero"
                  className="w-full max-w-[280px] rounded-lg shadow-lg"
                  onError={() => setCardFailed(p=>({...p,[host.id]:true}))}
                />
                {cardFailed[host.id] && (
                  qrData[host.id] ? (
                    <img
                      src={qrData[host.id]}
                      alt="QR cumpleañero"
                      data-testid="qr-host-img"
                      className="w-56 h-56 bg-white p-3 rounded-xl absolute"
                      style={{ boxShadow: '0 0 0 4px #D4AF37' }}
                    />
                  ) : (
                    <div className="w-56 h-56 rounded-xl animate-pulse absolute" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  )
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <a
                href={`/api/birthdays/invite/${host.code}/card?fmt=png`}
                download
                className="rounded px-3 py-2 text-sm font-semibold"
                style={{ background: '#D4AF37', color: '#111' }}
              >
                Descargar PNG
              </a>
              <button
                onClick={()=>copyLink(host.code)}
                className="rounded px-3 py-2 text-sm font-semibold border"
                style={{ borderColor: '#D4AF37', color: '#D4AF37' }}
              >
                Copiar link de canje
              </button>
            </div>
          </div>
        )}

        {/* Invitados (guest) */}
        {guest && (
          <div
            className="relative rounded-2xl p-5 flex flex-col"
            data-testid="qr-guest"
            style={{
              background: 'linear-gradient(150deg,#171717 0%,#1F1F24 60%,#23262B 100%)',
              boxShadow: '0 0 0 2px #B7BDC9',
              border: '2px solid #B7BDC9'
            }}
          >
            <div className="text-sm font-semibold opacity-90" style={{color:'#E2E6EC'}}>Invitados</div>
            <div className="mt-1 text-xs opacity-80">Compártelo con tus invitados</div>
            <div className="mt-4 flex items-center justify-center flex-1">
              <div className="relative w-full flex items-center justify-center">
                <img
                  src={`/api/birthdays/invite/${guest.code}/card`}
                  alt="Tarjeta invitados"
                  className="w-full max-w-[280px] rounded-lg shadow-lg"
                  onError={() => setCardFailed(p=>({...p,[guest.id]:true}))}
                />
                {cardFailed[guest.id] && (
                  qrData[guest.id] ? (
                    <img src={qrData[guest.id]} alt="QR invitados" data-testid="qr-guest-img" className="w-56 h-56 bg-white p-2 rounded-xl absolute" />
                  ) : (
                    <div className="w-56 h-56 bg-white/10 rounded-xl animate-pulse absolute" />
                  )
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <a href={`/api/birthdays/invite/${guest.code}/card?fmt=png`} download className="rounded px-3 py-2 text-sm font-semibold" style={{ background: '#3D2EFF' }}>Descargar PNG</a>
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
