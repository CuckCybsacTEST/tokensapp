import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { brand } from '../styles/brand';

export function Hero() {
  const [showScroll, setShowScroll] = useState(true);

  useEffect(() => {
    function onScroll(){
      if(window.scrollY > 40){ setShowScroll(false); } else { setShowScroll(true); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleScrollClick(){
    try {
      const target = document.querySelector('#shows') || document.querySelector('#hero')?.nextElementSibling;
      if(target && 'scrollIntoView' in target){
        // smooth scroll to next section
        (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: window.innerHeight - 120, behavior: 'smooth' });
      }
    } catch {}
  }

  return (
  <section id="hero" className="relative overflow-hidden flex items-center justify-center w-full pt-10 md:pt-12" style={{ minHeight: 'var(--app-vh,100vh)' }}>
      <motion.div 
        aria-hidden 
        initial={{ rotate: 0 }} 
        animate={{ rotate: 360 }} 
        transition={{ duration: 40, ease: "linear", repeat: Infinity }} 
        style={{ 
          position: "absolute", 
          inset: "-20%", 
          background: `conic-gradient(from 90deg at 50% 50%, ${brand.primary}33, ${brand.secondary}33, ${brand.accent}22, ${brand.primary}33)`, 
          filter: "blur(70px)", 
          zIndex: 0 
        }} 
      />
  <div className="container mx-auto max-w-6xl px-4 md:px-8 py-0 relative z-10 w-full">
        <div className="flex flex-col items-center justify-center text-center gap-4 md:gap-6">
          {/* Título principal EL LOUNGE + byline responsive */}
          <div className="mt-4 md:mt-6 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6, delay: 0.3 }} 
              className="text-[40px] md:text-[72px] font-black leading-[0.95] tracking-tight"
              style={{ color: brand.primary, textShadow: `0 0 14px ${brand.primary}70, 0 0 28px ${brand.secondary}40`, fontFamily: 'var(--font-display)' }}
            >
              EL LOUNGE
            </motion.h1>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="text-sm md:text-base font-medium opacity-80"
              style={{ color: `#FFFFFFB8`, fontFamily: 'var(--font-text)' }}
            >
              by ktdral
            </motion.span>
          </div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-3 max-w-xl mx-auto text-base md:text-lg opacity-90"
            style={{ color: "#FFFFFFDD", fontFamily: 'var(--font-text)' }}
          >
            Un espacio donde tecnología y ambiente social se combinan para vivir algo distinto.
          </motion.p>
          {/* Buscador de cumpleaños */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.62 }}
            className="w-full max-w-lg mx-auto mt-4"
          >
            <BirthdaySearch />
          </motion.div>
        </div>
      </div>
      {/* Botón scroll-down reposicionado más abajo */}
      <AnimatePresence>
        {showScroll && (
          <motion.button
            key="scroll-down"
            initial={{ opacity: 0, y: 30, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.6 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            aria-label="Desplazar a la siguiente sección"
            onClick={handleScrollClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            className="scroll-down-btn absolute left-1/2 -translate-x-1/2 bottom-24 md:bottom-16"
            style={{ zIndex: 15 }}
          >
            <motion.span
              className="arrow"
              animate={{ y: [0, 6, 0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.span>
            <span className="sr-only">Bajar</span>
          </motion.button>
        )}
      </AnimatePresence>
      {/* Separador anclado al final del hero */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 z-10 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${brand.primary}80, transparent)`,
          boxShadow: `0 0 20px ${brand.primary}40`
        }}
      />
      <style jsx>{`
        .scroll-down-btn {
          --glow-orange: 255,116,46;
          position: relative;
          width: 3.5rem; height: 3.5rem;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, rgba(255,120,40,0.10), rgba(10,4,4,0.55) 60%, rgba(0,0,0,0.55));
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          border: 1px solid rgba(var(--glow-orange),0.55);
          color: #fff;
          cursor: pointer;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.06),
            0 0 18px -4px rgba(var(--glow-orange),0.55),
            0 0 44px -10px rgba(var(--glow-orange),0.55),
            0 0 60px -18px rgba(var(--glow-orange),0.35);
          transition: box-shadow .65s cubic-bezier(.4,.14,.2,1),
            border-color .6s, transform .55s;
        }
        .scroll-down-btn:before, .scroll-down-btn:after {
          content: '';
            position: absolute; inset: 0; border-radius: inherit; pointer-events:none;
        }
        .scroll-down-btn:before {
          background: radial-gradient(circle at 30% 25%, rgba(var(--glow-orange),0.35), transparent 70%);
          mix-blend-mode: screen;
          opacity: .55;
          animation: glowShift 6s linear infinite;
        }
        .scroll-down-btn:after {
          box-shadow: 0 0 0 2px rgba(var(--glow-orange),0.25), 0 0 24px -6px rgba(var(--glow-orange),0.55), 0 0 70px -10px rgba(var(--glow-orange),0.45);
          opacity: .55;
          animation: pulseOuter 4.2s ease-in-out infinite;
        }
        .scroll-down-btn:hover, .scroll-down-btn:focus-visible {
          border-color: rgba(var(--glow-orange),0.85);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.10),
            0 0 22px 0 rgba(var(--glow-orange),0.75),
            0 0 62px -4px rgba(var(--glow-orange),0.70),
            0 0 90px -8px rgba(var(--glow-orange),0.55);
        }
        .scroll-down-btn .arrow { display:flex; align-items:center; justify-content:center; }
        .scroll-down-btn .arrow svg { filter: drop-shadow(0 0 4px rgba(255,140,60,0.4)); }
        .scroll-down-btn:hover .arrow svg { filter: drop-shadow(0 0 8px rgba(255,150,70,0.75)); }
        @keyframes glowShift { 0%{transform:translate3d(0,0,0) scale(1);} 50%{transform:translate3d(2px,3px,0) scale(1.05);} 100%{transform:translate3d(0,0,0) scale(1);} }
        @keyframes pulseOuter { 0%,100%{opacity:.45; transform:scale(1);} 50%{opacity:.85; transform:scale(1.08);} }
      `}</style>
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
      `}</style>
    </div>
  );
}
