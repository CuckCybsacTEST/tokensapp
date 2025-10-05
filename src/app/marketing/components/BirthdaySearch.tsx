"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";

type SearchItem = {
  id: string;
  celebrantName: string;
  documento?: string;
  date: string; // YYYY-MM-DD
  status?: string;
  hasCards: boolean;
};

// Accessible, debounced search for public birthday reservations
export function BirthdaySearch() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const minLen = 3;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const listboxId = `bsearch-${reactId}`;

  const doSearch = useCallback(async (signal?: AbortSignal) => {
    const val = q.trim();
    if (val.length < minLen) {
      setItems([]); setErr(null); setOpen(false); setActiveIndex(-1);
      return;
    }
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/birthdays/search?q=${encodeURIComponent(val)}`, { signal, cache: 'no-store' });
      // Allow plain-text body with JSON, guard parsing
      const txt = await res.text();
      const j = txt ? (JSON.parse(txt)) : {};
      if (!res.ok) throw new Error((j as any)?.code || (j as any)?.message || `HTTP_${res.status}`);
      const list = (j as any).items || [];
      setItems(list);
      setOpen(list.length > 0);
      setActiveIndex(list.length ? 0 : -1);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        const msg = String(e?.message || e || "search failed");
        setErr(msg);
        setOpen(false);
        setActiveIndex(-1);
      }
    } finally { setLoading(false); }
  }, [q]);

  useEffect(() => {
    if (!touched) return;
    const ctrl = new AbortController();
    const h = setTimeout(() => { doSearch(ctrl.signal); }, 350);
    return () => { ctrl.abort(); clearTimeout(h); };
  }, [q, doSearch, touched]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
    if (!touched) setTouched(true);
  }

  // Close on outside click or Escape
  useEffect(() => {
    function handlePointer(e: Event) {
      if (!rootRef.current) return;
      if (e.target instanceof Node && rootRef.current.contains(e.target)) return;
      setOpen(false); setActiveIndex(-1);
    }
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") { setOpen(false); setActiveIndex(-1); } }
    if (open) {
      document.addEventListener('mousedown', handlePointer, true);
      document.addEventListener('touchstart', handlePointer, true);
      document.addEventListener('keydown', handleKey, true);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointer, true);
      document.removeEventListener('touchstart', handlePointer, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(items.length - 1, (i < 0 ? 0 : i + 1))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(0, (i < 0 ? 0 : i - 1))); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[activeIndex >= 0 ? activeIndex : 0];
      if (it) {
        const href = `/marketing/birthdays/public?rid=${encodeURIComponent(it.id)}`;
        window.location.href = href;
      }
    } else if (e.key === 'Escape') { setOpen(false); setActiveIndex(-1); }
  }

  function statusLabel(st?: string) {
    if (!st) return '';
    switch (st) {
      case 'pending_review': return 'En proceso';
      case 'approved': return 'Aprobado';
      case 'completed': return 'Completado';
      case 'canceled': return 'Cancelado';
      default: return st.replace('_',' ');
    }
  }

  const rateLimited = err && /RATE_LIMITED|Too many/i.test(err);

  return (
    <div className="relative mx-auto z-30 w-[92%] sm:w-[82%] md:w-[70%] lg:w-[58%] max-w-2xl" ref={rootRef}>
      <div
        className={`lounge-search no-icon ${focused ? 'focused' : ''} ${q ? 'has-value' : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
      >
        <input
          value={q}
          onChange={onChange}
          onFocus={() => { setOpen(!!items.length); setFocused(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          placeholder="Busca tu reserva (nombre o DNI)"
          className="lounge-search-input"
          maxLength={60}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 && open && items[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
        />
        <AnimatePresence initial={false}>
          {q && (
            <motion.button
              key="clear-btn"
              initial={{ opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.88 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              onClick={() => { setQ(''); setItems([]); setErr(null); setActiveIndex(-1); setOpen(false); }}
              className="lounge-chip-clear"
              aria-label="Limpiar búsqueda"
            >
              Limpiar
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 z-30 mt-1 w-full rounded-[10px] border border-white/10 bg-[#0f0f10]/95 backdrop-blur-sm shadow-xl overflow-hidden"
            role="region"
            aria-label="Resultados de búsqueda"
          >
            {loading && (
              <div className="px-3 py-2 text-sm text-white/70">Buscando…</div>
            )}
            {!loading && err && (
              <div className="px-3 py-2 text-sm text-rose-300/90">
                {rateLimited ? 'Demasiadas búsquedas. Intenta nuevamente en un momento.' : err}
              </div>
            )}
            {!loading && !err && items.length === 0 && touched && q.trim().length >= minLen && (
              <div className="px-3 py-2 text-sm text-white/60">No hay resultados</div>
            )}
            {!loading && !err && items.length > 0 && (
              <div id={listboxId} role="listbox" aria-label="Resultados" className="max-h-[50vh] sm:max-h-64 overflow-y-auto custom-scrollbar">
                {items.map((it, idx) => {
                  const href = `/marketing/birthdays/public?rid=${encodeURIComponent(it.id)}`;
                  const selected = idx === activeIndex;
                  return (
                    <a
                      key={it.id}
                      id={`${listboxId}-opt-${idx}`}
                      role="option"
                      aria-selected={selected}
                      href={href}
                      className={`flex items-center gap-3 px-2.5 py-2 sm:py-1.5 text-[13px] transition-colors group ${selected ? 'bg-white/10' : 'hover:bg-white/10'}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => setOpen(false)}
                    >
                      <span className="flex-1 flex flex-col">
                        <span className="font-medium group-hover:text-amber-300 transition-colors">{it.celebrantName}</span>
                        <span className="text-[11px] text-white/45">{it.date}{it.documento ? ` • ${it.documento}` : ''}</span>
                      </span>
                      {it.status && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70">{statusLabel(it.status)}</span>
                      )}
                      {it.hasCards && (
                        <button
                          type="button"
                          onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); window.location.href = `/marketing/birthdays/${encodeURIComponent(it.id)}/qrs?mode=admin`; }}
                          className="text-[10px] sm:text-[9px] px-2.5 py-[3px] rounded-full bg-emerald-600/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-600/30 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 transition-colors"
                          title="Ver tarjetas QR"
                          aria-label="Ver tarjetas QR"
                        >
                          Ver QRs
                        </button>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .lounge-search {
          --glow-orange: 255,116,46;
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.9rem;
          width: 100%;
          padding: 0.6rem 0.9rem;
          border-radius: 999px;
          background: linear-gradient(145deg,#3d0f11 0%,#2a0b0d 34%,#150606 70%,#050303 100%);
          border: 1px solid rgba(var(--glow-orange),0.35);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05),
            0 0 12px -2px rgba(var(--glow-orange),0.35),
            0 4px 24px -8px rgba(var(--glow-orange),0.45);
          backdrop-filter: blur(14px) saturate(135%);
          transition: box-shadow .45s cubic-bezier(.4,.14,.2,1), border-color .4s, background .6s;
        }
        @media (min-width: 640px) {
          .lounge-search { padding: 0.6rem 1rem; }
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
          font-size: 0.92rem;
          font-weight: 300;
          letter-spacing: .3px;
          color: #ffffff;
          padding-right: .25rem;
          transition: color .4s;
        }
        @media (max-width: 639px) {
          .lounge-search-input { font-size: 0.9rem; }
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
          font-size: .7rem;
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
        @media (min-width: 640px) {
          .lounge-chip-clear { font-size: .68rem; padding: 0.45rem 0.9rem; }
        }
        .lounge-chip-clear:hover {
          background: linear-gradient(135deg,#ff4d2e,#ff7a2b 70%);
          color: #fff;
          box-shadow: 0 4px 14px -4px rgba(255,100,40,0.55), 0 0 0 1px rgba(255,255,255,0.08);
        }
      `}</style>
    </div>
  );
}
