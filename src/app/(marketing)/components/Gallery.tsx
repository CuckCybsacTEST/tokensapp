import React from 'react';

export interface GalleryImage { src: string; alt: string }

export const GalleryGrid: React.FC<{ images: GalleryImage[] }>= ({ images }) => (
  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
    {images.map(img => (
      <div key={img.alt} className="relative h-56 rounded-lg overflow-hidden group bg-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF4D2E]/20 to-[#FF7A3C]/20" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/60 flex items-end p-3 transition">
          <span className="text-sm font-medium">{img.alt}</span>
        </div>
      </div>
    ))}
  </div>
);
