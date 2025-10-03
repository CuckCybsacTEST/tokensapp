import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DynamicTitle } from './DynamicTitle';

export function Hero() {
  const [showScroll, setShowScroll] = useState(true);

  useEffect(() => {
    function onScroll() {
      setShowScroll(window.scrollY <= 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden flex items-center justify-center w-full pt-10 md:pt-12"
      style={{ minHeight: 'var(--app-vh,100vh)' }}
    >
      {/* Video background with adaptive resolution */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        poster="/videos/poster.jpg"
      >
        <source src="/videos/videohero-1080p.mp4" type="video/mp4" media="(min-width: 1280px)" />
        <source src="/videos/videohero-720p.mp4" type="video/mp4" media="(min-width: 768px)" />
        <source src="/videos/videohero-480p.mp4" type="video/mp4" media="(max-width: 767px)" />
      </video>

      {/* Overlay filter */}
      <div
        className="absolute inset-0 z-10"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(20px)' }}
      />

      <div className="container mx-auto max-w-6xl px-4 md:px-8 py-0 relative z-20 w-full">
        <div className="flex flex-col items-center justify-center text-center gap-4 md:gap-6">
          {/* Dynamic Title Component with LED effect */}
          <DynamicTitle />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-3 max-w-xl mx-auto text-base md:text-lg opacity-90"
            style={{ color: '#FFFFFFDD' }}
          >
            Un espacio donde tecnología y ambiente social se combinan para vivir algo distinto.
          </motion.p>
        </div>
      </div>

      {/* Scroll-down button */}
      {showScroll && (
        <motion.div
          key="scroll-down"
          initial={{ y: 0 }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-10 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md cursor-pointer hover:opacity-90"
          onClick={() => {
            const target = document.querySelector('#shows');
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-6 h-6 text-gray-800"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </motion.div>
      )}
    </section>
  );
}

// Sub-componente: buscador de cumpleaños
function BirthdaySearch(){
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [items, setItems] = useState<{ id:string; celebrantName:string; documento?:string; date:string; status?:string; hasCards:boolean }[]>([]);
  const [open, setOpen] = useState(false); // now controlled only by having results
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const minLen = 3;
  const rootRef = useRef<HTMLDivElement|null>(null);

  const doSearch = useCallback(async (signal?: AbortSignal) => {
    const val = q.trim();
    if (val.length < minLen) { setItems([]); setErr(null); setOpen(false); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/birthdays/search?q=${encodeURIComponent(val)}`, { signal });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.code || j?.message || 'Error de búsqueda');
      const list = j.items || [];
      setItems(list);
      setOpen(list.length > 0);
    } catch(e:any){ if (e?.name !== 'AbortError') { setErr(String(e?.message||e)); setOpen(false); } }
    finally { setLoading(false); }
  }, [q]);

  useEffect(()=>{
    if(!touched) return;
    const ctrl = new AbortController();
    const h = setTimeout(()=>{ doSearch(ctrl.signal); }, 350);
    return ()=>{ ctrl.abort(); clearTimeout(h); };
  }, [q, doSearch, touched]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>){
    setQ(e.target.value); if(!touched) setTouched(true); // open toggled after results arrive
  }

  function close(){ setOpen(false); }

  // Cerrar al hacer click fuera o presionar Escape
  useEffect(()=>{
    function handlePointer(e: Event){
      if(!rootRef.current) return;
      if(e.target instanceof Node && rootRef.current.contains(e.target)) return; // click interno
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent){ if(e.key === 'Escape') setOpen(false); }
    if(open){
      document.addEventListener('mousedown', handlePointer, true);
      document.addEventListener('touchstart', handlePointer, true);
      document.addEventListener('keydown', handleKey, true);
    }
    return ()=>{
      document.removeEventListener('mousedown', handlePointer, true);
      document.removeEventListener('touchstart', handlePointer, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <div
        className={`lounge-search no-icon ${focused ? 'focused' : ''} ${q ? 'has-value' : ''}`}
      >
        <input
          value={q}
          onChange={onChange}
          onFocus={()=>{ setOpen(true); setFocused(true); }}
          onBlur={()=> setFocused(false)}
          placeholder="Buscar por nombre o documento (DNI)"
          className="lounge-search-input"
          maxLength={60}
        />
        <AnimatePresence initial={false}>
          {q && (
            <motion.button
              key="clear-btn"
              initial={{ opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.88 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              onClick={()=>{ setQ(''); setItems([]); setErr(null); }}
              className="lounge-chip-clear"
            >
              Limpiar
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {open && items.length > 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/15 bg-[#111]/95 backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {items.map(it => {
              const href = `/marketing/birthdays/public?rid=${encodeURIComponent(it.id)}`;
              const statusLabel = (() => {
                switch(it.status){
                  case 'pending_review': return 'En proceso';
                  case 'approved': return 'Aprobado';
                  case 'completed': return 'Completado';
                  case 'canceled': return 'Cancelado';
                  default: return (it.status||'').replace('_',' ');
                }
              })();
              return (
                <a
                  key={it.id}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/10 transition-colors group"
                  onClick={()=>close()}
                >
                  <span className="flex-1 flex flex-col">
                    <span className="font-medium group-hover:text-amber-300 transition-colors">{it.celebrantName}</span>
                    <span className="text-[11px] text-white/40">{it.date}{it.documento ? ` • ${it.documento}` : ''}</span>
                  </span>
                  {it.status && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70">{statusLabel}</span>
                  )}
                  {it.hasCards && (
                    <button
                      type="button"
                      onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); window.location.href = `/marketing/birthdays/${encodeURIComponent(it.id)}/qrs?mode=admin`; }}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-600/30 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 transition-colors"
                      title="Ver Tarjetas QR"
                    >
                      Tarjetas QR
                    </button>
                  )}
                </a>
              );
            })}
          </div>
          {/* Sin footer ni mensajes: sólo resultados */}
        </div>
      )}
      <style jsx>{`
        .lounge-search {
          --glow-orange: 255,116,46;
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.9rem;
          width: 100%;
          padding: 0.65rem 1.1rem;
          border-radius: 999px;
          background: linear-gradient(145deg,#3d0f11 0%,#2a0b0d 34%,#150606 70%,#050303 100%);
          border: 1px solid rgba(var(--glow-orange),0.35);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05),
            0 0 12px -2px rgba(var(--glow-orange),0.35),
            0 4px 24px -8px rgba(var(--glow-orange),0.45);
          backdrop-filter: blur(14px) saturate(135%);
          transition: box-shadow .45s cubic-bezier(.4,.14,.2,1), border-color .4s, background .6s;
        }
        .lounge-search.focused {
          border-color: rgba(var(--glow-orange),0.6);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.07),
            0 0 22px 2px rgba(var(--glow-orange),0.55),
            0 6px 30px -6px rgba(var(--glow-orange),0.55),
            0 0 48px -4px rgba(var(--glow-orange),0.35);
        }
        .lounge-search-input {
          flex:1;
          background: transparent;
          outline: none;
          border: none;
          font-size: 0.9rem;
          font-weight: 300;
          letter-spacing: .3px;
          color: #ffffff;
          padding-right: .25rem;
          transition: color .4s;
        }
        .lounge-search-input:focus, .lounge-search-input:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        .lounge-search-input::-moz-focus-inner { border:0; }
        .lounge-search-input { -webkit-tap-highlight-color: transparent; }
        .lounge-search-input::placeholder {
          color: rgba(255,255,255,0.38);
          font-weight: 300;
          transition: color .4s, opacity .4s;
        }
        .lounge-search.focused .lounge-search-input::placeholder { color: rgba(255,255,255,0.25); }
        .lounge-search.has-value .lounge-search-input::placeholder { color: rgba(255,255,255,0.18); }
        .lounge-chip-clear {
          position: relative;
          font-size: .68rem;
          line-height: 1;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.70);
          cursor: pointer;
          font-weight: 500;
          letter-spacing: .4px;
          backdrop-filter: blur(8px) saturate(160%);
          transition: background .35s, color .35s, box-shadow .45s;
        }
        .lounge-chip-clear:hover {
          background: linear-gradient(135deg,#ff4d2e,#ff7a2b 70%);
          color: #fff;
          box-shadow: 0 4px 14px -4px rgba(255,100,40,0.55), 0 0 0 1px rgba(255,255,255,0.08);
        }
        /* Removed icon animations */
        @keyframes led-lights {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-led-lights {
          animation: led-lights 10s ease infinite;
        }
      `}</style>
    </div>
  );
}
