"use client";
import React from 'react';
import { usePager } from './PagerContext';
import {
  IconStar,
  IconCake,
  IconBrandSpotify,
  IconPhoto,
  IconHelpCircle,
  IconNews,
  IconMap,
} from '@tabler/icons-react';

const items = [
  { id: 'shows', label: 'Shows', icon: IconStar },
  { id: 'cumple', label: 'Cumples', icon: IconCake },
  { id: 'spotify', label: 'Música', icon: IconBrandSpotify },
  { id: 'galeria', label: 'Galería', icon: IconPhoto },
  { id: 'faq', label: 'FAQs', icon: IconHelpCircle },
  { id: 'blog', label: 'Blog', icon: IconNews },
  { id: 'mapa', label: 'Mapa', icon: IconMap },
];

export function MobileQuickNav(){
  const pager = usePager();
  const isReady = !!pager;
  const selected = pager?.selected ?? 0;
  // hero=0 => shows=1 ... mapa=7, footer=8
  const activeId = ['hero','shows','cumple','spotify','galeria','faq','blog','mapa','footer'][selected] || '';

  const go = (id: string) => {
    if (!pager) return;
    const base = ['shows','cumple','spotify','galeria','faq','blog','mapa'];
    const idx = base.findIndex(s => s === id);
    if (idx >= 0) pager.scrollTo(idx + 1);
  };

  return (
    <nav aria-label="Navegación rápida (móvil)" className="fixed inset-x-0 bottom-0 z-[60] md:hidden">
      <div className="px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md px-2 py-2">
          {items.map(it => {
            const Icon = it.icon;
            const active = activeId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                disabled={!isReady}
                onClick={() => go(it.id)}
                className={`shrink-0 inline-flex items-center justify-center rounded-md h-10 w-10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${active ? 'bg-white/18' : 'bg-white/8 hover:bg-white/14'} ${isReady ? '' : 'opacity-60 cursor-wait'}`}
                aria-label={`Ir a ${it.label}`}
                title={it.label}
                style={{ backdropFilter: 'blur(6px)' }}
              >
                <Icon size={22} stroke={1.9} className="text-white" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
      `}</style>
    </nav>
  );
}

export default MobileQuickNav;
