"use client";

import React, { useRef, useState } from 'react';

type Props = {
  action: 'IN' | 'OUT';
  className?: string;
};

export default function MarkActionButton({ action, className }: Props) {
  const [holdMs, setHoldMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const longRef = useRef(false);

  const goScanner = () => { window.location.href = action==='OUT' ? '/u/assistance?expected=OUT' : '/u/assistance'; };
  const goManual = () => { window.location.href = '/u/manual'; };

  function onPointerDown(){
    longRef.current = false;
    if(action==='OUT'){
      setHoldMs(0);
      const start = Date.now();
      const id = window.setInterval(()=>{
        const ms = Date.now()-start;
        setHoldMs(ms);
        if(ms>=2000){
          window.clearInterval(id); timerRef.current=null; longRef.current=true; setHoldMs(0); goManual();
        }
      },50);
      timerRef.current = id as unknown as number;
    }
  }
  function endPress(){
    if(timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current=null;
    const wasLong = longRef.current; const ms=holdMs; setHoldMs(0); longRef.current=false;
    if(action==='OUT'){
      if(!wasLong && ms<2000) goScanner();
    } else {
      goScanner();
    }
  }

  return (
    <button
      className={("btn relative select-none ") + (className || '')}
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
    >
      {action === 'OUT'
        ? (holdMs>0 ? `Mantén para manual… ${Math.ceil(Math.max(0,2000-holdMs)/1000)}s` : 'Registrar salida (QR)')
        : 'Registrar entrada (QR)'}
      {action==='OUT' && holdMs>0 && (
        <span className="absolute left-0 bottom-0 h-1 bg-orange-500 rounded-b" style={{ width: `${Math.min(100,(holdMs/2000)*100)}%` }} />
      )}
    </button>
  );
}
