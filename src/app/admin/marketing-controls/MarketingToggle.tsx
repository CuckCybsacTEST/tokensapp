"use client";

import React, { useState, useTransition } from "react";

interface Props {
  section: string;
  label: string;
}

export function MarketingToggle({ section, label }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusLoaded, setStatusLoaded] = useState(false);

  // Load initial status
  React.useEffect(() => {
    if (statusLoaded) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/marketing/status');
        if (!res.ok) throw new Error('Failed to load status');
        const data = await res.json();
        setEnabled(data[section] ?? true);
        setStatusLoaded(true);
      } catch (e) {
        setError('Failed to load status');
      }
    });
  }, [section, statusLoaded]);

  const handleToggle = () => {
    if (enabled === null) return;
    const newEnabled = !enabled;
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch('/api/admin/marketing/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section, enabled: newEnabled }),
        });
        if (!res.ok) throw new Error('Toggle failed');
        const data = await res.json();
        setEnabled(data[section]);
      } catch (e) {
        setError('Toggle failed');
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded">
      <div>
        <label className="font-medium">{label}</label>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending || enabled === null}
        className={`px-4 py-2 rounded ${
          enabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
        } ${isPending ? 'opacity-50' : ''}`}
      >
        {enabled === null ? 'Loading...' : enabled ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  );
}