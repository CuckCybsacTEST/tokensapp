'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Screen, Run } from '../types';
import { writeStorySeen } from '../StoryGate';

interface OverlaysProps {
  screen: Screen;
  time: number;
  score: number;
  leaderboard: Run[];
  onStart: () => void;
  onSkipStory: () => void;
  onRetry: () => void;
  onViewRank: () => void;
}

export default function Overlays({
  screen,
  time,
  score,
  leaderboard,
  onStart,
  onSkipStory,
  onRetry,
  onViewRank,
}: OverlaysProps) {
  if (screen === 'play') return null;

  const storySlides = [
    { title: 'Bienvenido a SOBREVIVIR AL 2025', text: 'En un mundo caótico, debes esquivar obstáculos y recoger powerups para sobrevivir.' },
    { title: 'Powerups', text: '🍻 Beer: slow motion. ❤️ Heart: +vida. 💎 Copper/Silver/Gold: puntos.' },
    { title: 'Reglas', text: 'La dificultad aumenta cada 7s. Sobrevive lo más posible. ¡Buena suerte!' },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < storySlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      writeStorySeen();
      onStart();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center text-white"
    >
      {screen === 'intro' && (
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">SOBREVIVIR AL 2025</h1>
          <p className="mb-8">¿Cuánto tiempo puedes aguantar?</p>
          <button onClick={onStart} className="px-6 py-3 bg-blue-500 rounded">JUGAR</button>
        </div>
      )}

      {screen === 'story' && (
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">{storySlides[currentSlide].title}</h2>
          <p className="mb-8">{storySlides[currentSlide].text}</p>
          <button onClick={nextSlide} className="px-6 py-3 bg-green-500 rounded">
            {currentSlide < storySlides.length - 1 ? 'SIGUIENTE' : 'JUGAR'}
          </button>
        </div>
      )}

      {screen === 'over' && (
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">¡Caíste!</h1>
          <p className="text-2xl mb-2">Tiempo: {(time / 1000).toFixed(1)}s</p>
          <p className="text-xl mb-8">Puntos: {score}</p>
          <div className="space-x-4">
            <button onClick={onRetry} className="px-6 py-3 bg-blue-500 rounded">Intentar Otra Vez</button>
            <button onClick={onViewRank} className="px-6 py-3 bg-gray-500 rounded">Ver Ranking</button>
          </div>
        </div>
      )}

      {screen === 'rank' && (
        <div className="text-center max-w-lg">
          <h1 className="text-3xl font-bold mb-4">Ranking Global</h1>
          <div className="space-y-2 mb-8">
            {leaderboard.slice(0, 10).map((run, i) => (
              <div key={run.id} className="flex justify-between bg-gray-800 p-2 rounded">
                <span>{i + 1}. {run.display_name}</span>
                <span>{(run.best_ms / 1000).toFixed(1)}s</span>
              </div>
            ))}
          </div>
          <button onClick={onRetry} className="px-6 py-3 bg-blue-500 rounded">Jugar de Nuevo</button>
        </div>
      )}
    </motion.div>
  );
}