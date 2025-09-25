"use client";

import React, { useRef, useState } from 'react';

type Props = {
  action: 'IN' | 'OUT';
  className?: string;
};

export default function MarkActionButton({ action, className }: Props) {
  const [holdMs, setHoldMs] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startHoldIfOut = () => {
    if (action !== 'OUT') return;
    setHoldMs(0);
    const start = Date.now();
    const id = window.setInterval(() => {
      const ms = Date.now() - start;
      setHoldMs(ms);
      if (ms >= 2000) {
        window.clearInterval(id);
        timerRef.current = null;
        setHoldMs(0);
        navigate();
      }
    }, 50);
    timerRef.current = id as unknown as number;
  };

  const clearHold = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setHoldMs(0);
  };

  const navigate = () => {
  // Ir al escáner; este flujo ya aplica cooldown y requiere QR
    window.location.href = '/u/scanner?from=home';
  };

  return (
    <button
      className={("btn relative ") + (className || '')}
      onClick={(e) => { if (action === 'OUT') { e.preventDefault(); return; } navigate(); }}
      onPointerDown={startHoldIfOut}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
    >
      {action === 'OUT' ? (holdMs > 0 ? `Mantén presionado… ${Math.ceil(Math.max(0, 2000 - holdMs)/1000)}s` : 'Registrar salida') : 'Registrar entrada'}
      {action === 'OUT' && holdMs > 0 && (
        <span className="absolute inset-x-0 bottom-0 h-1 rounded-b bg-orange-500" style={{ width: `${Math.min(100, (holdMs/2000)*100)}%` }} />
      )}
    </button>
  );
}
