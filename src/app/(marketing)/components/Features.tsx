import React from 'react';

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export const FeaturesGrid: React.FC<{ items: FeatureItem[] }>= ({ items }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {items.map(i => (
      <div key={i.title} className="p-6 rounded-xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition shadow-lg shadow-black/30">
        <div className="text-3xl mb-4 text-[#FF4D2E]">{i.icon}</div>
        <h3 className="font-semibold text-xl mb-2">{i.title}</h3>
        <p className="text-white/60 text-sm leading-relaxed">{i.description}</p>
      </div>
    ))}
  </div>
);
