// Componente de prueba para sonidos de ruleta
// Este componente permite probar los sonidos directamente desde el navegador

"use client";

import React from 'react';
import { useRouletteSounds } from '@/hooks/useRouletteSounds';

export default function SoundTest() {
  const sounds = useRouletteSounds();

  const debugStatus = () => {
    console.log('🔍 Sound System Debug:');
    console.log('- AudioContext available:', !!window.AudioContext || !!(window as any).webkitAudioContext);
    // No podemos acceder a las refs internas desde aquí, pero podemos mostrar info general
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg shadow-lg z-50 max-w-xs">
      <h3 className="text-lg font-bold mb-3">🎵 Sound Test</h3>
      <div className="space-y-2">
        <button
          onClick={() => sounds.playSpinStart()}
          className="block w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
        >
          🔊 Spin Start
        </button>
        <button
          onClick={() => sounds.playSpinLoop()}
          className="block w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
        >
          🔄 Spin Loop
        </button>
        <button
          onClick={() => void sounds.stopSpinLoop({ force: true })}
          className="block w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
        >
          ⏹️ Stop Loop
        </button>
        <button
          onClick={() => sounds.playSpinStop()}
          className="block w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
        >
          🛑 Spin Stop
        </button>
        <button
          onClick={() => sounds.playWin()}
          className="block w-full bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm"
        >
          🏆 Win
        </button>
        <button
          onClick={() => sounds.playLose()}
          className="block w-full bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm"
        >
          😞 Lose
        </button>
        <button
          onClick={debugStatus}
          className="block w-full bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm"
        >
          🔍 Debug Status
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Revisa la consola para logs de debug
      </p>
    </div>
  );
}