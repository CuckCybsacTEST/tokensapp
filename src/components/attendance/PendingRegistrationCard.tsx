"use client";
import React from 'react';

export interface PendingRegistrationCardProps {
  mode: 'IN' | 'OUT';
  pendingTooLong: boolean;
  onRetry: () => void;
  onCancel: () => void;
}

// Reusable card shown while a registration (IN/OUT) is being confirmed with the server.
// Color & copy adapt based on mode. Includes retry/cancel actions when taking too long.
export function PendingRegistrationCard({ mode, pendingTooLong, onRetry, onCancel }: PendingRegistrationCardProps){
  const isIn = mode === 'IN';
  const palette = isIn ? {
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    ring: 'border-emerald-300/60',
    spin: 'border-emerald-500',
    barTrack: 'bg-emerald-100',
    barFill: 'bg-emerald-400',
    textMain: 'text-emerald-700',
    textSub: 'text-emerald-600/80',
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    btnSecondary: 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
  } : {
    border: 'border-indigo-300',
    bg: 'bg-indigo-50',
    ring: 'border-indigo-300/60',
    spin: 'border-indigo-500',
    barTrack: 'bg-indigo-100',
    barFill: 'bg-indigo-400',
    textMain: 'text-indigo-700',
    textSub: 'text-indigo-600/80',
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    btnSecondary: 'border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50'
  };

  return (
    <div className={`rounded-md border ${palette.border} ${palette.bg} p-5 space-y-4 animate-fadeIn shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 flex items-center justify-center">
          <div className={`h-10 w-10 rounded-full border-2 ${palette.ring} flex items-center justify-center`}>
            <div className={`h-5 w-5 rounded-full border-2 ${palette.spin} border-t-transparent animate-spin`} />
          </div>
        </div>
        <div>
          <div className={`${palette.textMain} font-semibold`}>{isIn ? 'Procesando entrada…' : 'Procesando salida…'}</div>
          <div className={`text-xs ${palette.textSub}`}>{pendingTooLong ? 'Tarda más de lo normal…' : 'Confirmando con el servidor…'}</div>
        </div>
      </div>
      <div className={`h-2 w-full ${palette.barTrack} rounded overflow-hidden`}>
        <div className={`h-full w-2/3 ${palette.barFill} animate-pulse`} />
      </div>
      {pendingTooLong && (
        <div className="flex gap-2 pt-1">
          <button onClick={onRetry} className={`flex-1 rounded-md text-xs font-medium px-3 py-2 transition ${palette.btnPrimary}`}>Reintentar</button>
          <button onClick={onCancel} className={`rounded-md border text-xs font-medium px-3 py-2 transition ${palette.btnSecondary}`}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

export default PendingRegistrationCard;
