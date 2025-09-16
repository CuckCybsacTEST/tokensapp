import React from 'react';

export interface EventItem {
  title: string;
  date: string;
  description?: string;
}

export const EventsList: React.FC<{ items: EventItem[] }>= ({ items }) => (
  <div className="grid gap-6 md:grid-cols-3">
    {items.map(e => (
      <div key={e.title} className="rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition border border-white/10 shadow-lg shadow-black/40">
        <div className="h-40 bg-gradient-to-br from-[#FF4D2E]/30 to-[#FF7A3C]/30" />
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{e.title}</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-[#FF4D2E]/80">{e.date}</span>
          </div>
          {e.description && <p className="text-white/60 text-sm leading-relaxed">{e.description}</p>}
        </div>
      </div>
    ))}
  </div>
);
