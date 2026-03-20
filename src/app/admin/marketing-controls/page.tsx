"use client";

import React from "react";
import { MarketingToggle } from "./MarketingToggle";

const SECTIONS = [
  { key: 'marketingHeroEnabled', label: 'Hero Section' },
  { key: 'marketingShowsEnabled', label: 'Shows Section' },
  { key: 'marketingBirthdayEnabled', label: 'Birthday Section' },
  { key: 'marketingSpotifyEnabled', label: 'Spotify Section' },
  { key: 'marketingGalleryEnabled', label: 'Gallery Section' },
  { key: 'marketingFaqEnabled', label: 'FAQ Section' },
  { key: 'marketingBlogEnabled', label: 'Blog Section' },
  { key: 'marketingMapEnabled', label: 'Map Section' },
  { key: 'marketingFooterEnabled', label: 'Footer' },
  { key: 'marketingBackToTopEnabled', label: 'Back to Top Button' },
  { key: 'marketingUpDownDotsEnabled', label: 'Up/Down Dots' },
  { key: 'marketingMobilePagerEnabled', label: 'Mobile Pager Indicator' },
];

export default function MarketingControlsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Marketing Page Controls</h1>
      <p className="mb-4 text-gray-600">Toggle visibility of sections on the /marketing landing page.</p>
      <div className="space-y-4">
        {SECTIONS.map(({ key, label }) => (
          <MarketingToggle key={key} section={key} label={label} />
        ))}
      </div>
    </div>
  );
}