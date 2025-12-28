'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Trophy, Play, RotateCcw, ArrowLeft, ChevronRight, Save } from 'lucide-react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DIFFICULTY_START,
  DIFFICULTY_INCREMENT,
  DIFFICULTY_CAP,
  DIFFICULTY_STEP_MS,
  SPAWN_RATE_BASE,
  SPAWN_RATE_MULTIPLIER,
  SPAWN_RATE_MIN,
  SPAWN_RATE_MAX,
  MAX_ON_SCREEN_BASE,
  MAX_ON_SCREEN_MULTIPLIER,
  MAX_ON_SCREEN_MIN,
  MAX_ON_SCREEN_MAX,
  EXTRA_CHANCE_BASE,
  EXTRA_CHANCE_MULTIPLIER,
  EXTRA_CHANCE_MIN,
  EXTRA_CHANCE_MAX,
  POWERUP_SLOW_DURATION,
  POWERUP_SLOW_SCALE,
  POWERUP_HEART_MAX,
  POWERUP_COPPER_POINTS,
  POWERUP_SILVER_POINTS,
  POWERUP_GOLD_POINTS,
  EVENT_ID,
} from './constants';
import { Obstacle, Powerup, Player, ObstacleKind, Screen, Run } from './types';
import { fetchLeaderboard, submitRun } from './leaderboard.api';

interface Survive2025GameProps {
  onGameOver?: (time: number, score: number) => void;
}

interface Toast {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

interface BackgroundParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
}

const STORY_SLIDES = [
  {
    title: 'EL CAOS DEL 2025',
    text: 'El año ha comenzado con una lluvia de problemas. Deudas, botellas y fragmentos de tiempo caen del cielo.',
    icon: '🌧️'
  },
  {
    title: 'TU MISIÓN',
    text: 'Esquiva los obstáculos deslizando tu dedo o mouse. Si te tocan, perderás una vida.',
    icon: '🏃'
  },
  {
    title: 'AYUDAS',
    text: 'Recoge ❤️ para recuperar vidas y 🍺 para ralentizar el tiempo. ¡Sobrevive tanto como puedas!',
    icon: '🛡️'
  }
];

export default function Survive2025Game({ onGameOver }: Survive2025GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const lastDifficultyUpdateRef = useRef<number>(0);
  const slowEndTimeRef = useRef<number>(0);

  // Game State
  const [screen, setScreen] = useState<Screen>('intro');
  const [storyStep, setStoryStep] = useState(0);
  const [storySeen, setStorySeen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Run[]>([]);
  const [finalStats, setFinalStats] = useState({ time: 0, score: 0 });
  const [loadingRank, setLoadingRank] = useState(false);
  
  // Submission State
  const [playerName, setPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Refs for game loop
  const playerRef = useRef<Player>({ x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT - 60, width: 30, height: 30, lives: 1, slowUntil: 0 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const scoreRef = useRef<number>(0);
  const difficultyRef = useRef<number>(DIFFICULTY_START);
  const isRunningRef = useRef(false);

  // Visual Refs
  const toastsRef = useRef<Toast[]>([]);
  const bgParticlesRef = useRef<BackgroundParticle[]>([]);
  const bgSpotlightsRef = useRef<{x: number, y: number, vx: number, vy: number, color: string, size: number}[]>([]);

  // Initialize
  useEffect(() => {
    const seen = localStorage.getItem('lounge_survive_story_seen') === '1';
    setStorySeen(seen);
    if (!seen) {
      setScreen('story');
    }

    // Initialize Background
    const colors = ['#FF69B4', '#FFD700', '#00FF7F', '#9400D3'];
    const particles = [];
    for(let i=0; i<40; i++) {
        particles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 4 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 20,
            vy: Math.random() * 30 + 20
        });
    }
    bgParticlesRef.current = particles;

    bgSpotlightsRef.current = [
        { x: 100, y: 100, vx: 20, vy: 15, color: '#4B0082', size: 200 },
        { x: 300, y: 500, vx: -15, vy: -20, color: '#00008B', size: 250 },
    ];
  }, []);

  const startGame = () => {
    // Reset game state
    playerRef.current = { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT - 60, width: 30, height: 30, lives: 1, slowUntil: 0 };
    obstaclesRef.current = [];
    powerupsRef.current = [];
    toastsRef.current = [];
    scoreRef.current = 0;
    difficultyRef.current = DIFFICULTY_START;
    startTimeRef.current = performance.now();
    lastSpawnRef.current = performance.now();
    lastDifficultyUpdateRef.current = 0;
    slowEndTimeRef.current = 0;
    
    setSubmitted(false);
    setPlayerName('');
    isRunningRef.current = true;
    setScreen('play');
  };

  const handleGameOver = (time: number, score: number) => {
    isRunningRef.current = false;
    setFinalStats({ time, score });
    setScreen('over');
    if (onGameOver) onGameOver(time, score);
  };

  const loadLeaderboard = async () => {
    setLoadingRank(true);
    const data = await fetchLeaderboard(EVENT_ID);
    setLeaderboard(data.runs);
    setLoadingRank(false);
  };

  const handleSubmitScore = async () => {
    if (!playerName.trim()) return;
    setSubmitting(true);
    
    const payload = {
      eventId: EVENT_ID,
      displayName: playerName.trim(),
      bestMs: finalStats.time,
      score: finalStats.score,
      sessionId: crypto.randomUUID(),
      deviceHash: btoa(navigator.userAgent).slice(0, 32),
    };

    const result = await submitRun(payload);
    setSubmitting(false);
    
    if (result.success) {
      setSubmitted(true);
      loadLeaderboard();
    } else {
      alert(result.error || 'Error al guardar');
    }
  };

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const updateDifficulty = (elapsed: number) => {
    const steps = Math.floor(elapsed / DIFFICULTY_STEP_MS);
    difficultyRef.current = clamp(DIFFICULTY_START + steps * DIFFICULTY_INCREMENT, DIFFICULTY_START, DIFFICULTY_CAP);
  };

  const getSpawnRate = () => clamp(SPAWN_RATE_BASE + difficultyRef.current * SPAWN_RATE_MULTIPLIER, SPAWN_RATE_MIN, SPAWN_RATE_MAX);
  const getMaxOnScreen = () => clamp(MAX_ON_SCREEN_BASE + difficultyRef.current * MAX_ON_SCREEN_MULTIPLIER, MAX_ON_SCREEN_MIN, MAX_ON_SCREEN_MAX);
  const getExtraChance = () => clamp(EXTRA_CHANCE_BASE + (difficultyRef.current - DIFFICULTY_START) * EXTRA_CHANCE_MULTIPLIER, EXTRA_CHANCE_MIN, EXTRA_CHANCE_MAX);

  const spawnObstacle = () => {
    const width = 30;
    const height = 30;
    const x = Math.random() * (CANVAS_WIDTH - width);
    const y = -height;

    const difficultyMultiplier = 0.78 + difficultyRef.current * 0.24;
    const MIN_VY = 130;
    const MAX_VY = 210;
    const MAX_VX = 70;

    const vy = (MIN_VY + Math.random() * (MAX_VY - MIN_VY)) * difficultyMultiplier;
    const vx = (Math.random() * (MAX_VX * 2) - MAX_VX) * difficultyMultiplier;

    const kinds: ObstacleKind[] = ['clock', 'money', 'bottle', 'shard'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];

    obstaclesRef.current.push({ x, y, width, height, vx, vy, kind });
  };

  const spawnPowerup = (elapsed: number) => {
    const heartOnScreen = powerupsRef.current.some(p => p.type === 'heart');
    let heartChance = 0;
    const seconds = elapsed / 1000;
    
    if (!heartOnScreen) {
      if (seconds < 20) heartChance = 0.08;
      else if (seconds < 55) heartChance = 0.10;
      else heartChance = 0.12;
    }

    let type: Powerup['type'] = 'beer';
    
    if (!heartOnScreen && Math.random() < heartChance) {
      type = 'heart';
    } else {
      const types: Powerup['type'][] = ['beer', 'copper', 'silver', 'gold'];
      const weights = [0.45, 0.3, 0.2, 0.05];
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let rand = Math.random() * totalWeight;
      
      for (let i = 0; i < types.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
          type = types[i];
          break;
        }
      }
    }

    const x = Math.random() * (CANVAS_WIDTH - 20);
    const y = -20;
    powerupsRef.current.push({ type, x, y });
  };

  const addToast = (text: string, x: number, y: number) => {
    toastsRef.current.push({
        id: Math.random(),
        text,
        x,
        y,
        life: 900,
        maxLife: 900
    });
  };

  const update = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;

    const elapsed = timestamp - startTimeRef.current;
    const deltaTime = 16; // ~60fps
    const dt = deltaTime / 1000;

    // Update difficulty
    if (elapsed - lastDifficultyUpdateRef.current >= DIFFICULTY_STEP_MS) {
      updateDifficulty(elapsed);
      lastDifficultyUpdateRef.current = elapsed;
    }

    // Spawn logic
    const spawnRate = getSpawnRate();
    const maxOnScreen = getMaxOnScreen();
    const extraChance = getExtraChance();
    if (timestamp - lastSpawnRef.current > 1000 / spawnRate) {
      if (obstaclesRef.current.length < maxOnScreen) {
        spawnObstacle();
        if (Math.random() < extraChance) spawnObstacle();
      }
      if (Math.random() < 0.1) spawnPowerup(elapsed);
      lastSpawnRef.current = timestamp;
    }

    // Slow motion
    const timeScale = timestamp < slowEndTimeRef.current ? POWERUP_SLOW_SCALE : 1;

    // Update Background
    bgParticlesRef.current.forEach(p => {
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        if (p.y > CANVAS_HEIGHT) p.y = -10;
        if (p.x > CANVAS_WIDTH) p.x = 0;
        if (p.x < 0) p.x = CANVAS_WIDTH;
    });

    bgSpotlightsRef.current.forEach(s => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < 0 || s.x > CANVAS_WIDTH) s.vx *= -1;
        if (s.y < 0 || s.y > CANVAS_HEIGHT) s.vy *= -1;
    });

    // Update Toasts
    toastsRef.current = toastsRef.current.filter(t => {
        t.life -= deltaTime;
        t.y -= 20 * dt;
        return t.life > 0;
    });

    // Update obstacles
    obstaclesRef.current = obstaclesRef.current.filter(obs => {
      obs.x += obs.vx * dt * timeScale;
      obs.y += obs.vy * dt * timeScale;

      // Bounce logic
      if (obs.x < 0 || obs.x > CANVAS_WIDTH - obs.width) {
        obs.vx *= -0.8;
        obs.x = Math.max(0, Math.min(CANVAS_WIDTH - obs.width, obs.x));
      }

      return obs.y < CANVAS_HEIGHT;
    });

    // Update powerups
    powerupsRef.current = powerupsRef.current.filter(pow => {
      pow.y += 80 * timeScale * dt;
      return pow.y < CANVAS_HEIGHT;
    });

    // Collision detection
    const player = playerRef.current;
    const isInvulnerable = (player.slowUntil || 0) > timestamp;

    if (!isInvulnerable) {
      for (const obs of obstaclesRef.current) {
        if (
          player.x < obs.x + obs.width &&
          player.x + player.width > obs.x &&
          player.y < obs.y + obs.height &&
          player.y + player.height > obs.y
        ) {
          if (player.lives > 1) {
            player.lives -= 1;
            player.slowUntil = timestamp + 700; // 0.7s invulnerability
            obstaclesRef.current = obstaclesRef.current.filter(o => o !== obs);
            addToast("💥 -1 Vida", player.x + 15, player.y);
          } else {
            handleGameOver(elapsed, scoreRef.current);
            return;
          }
          break;
        }
      }
    }

    // Powerup collection
    for (const pow of powerupsRef.current) {
      if (
        player.x < pow.x + 20 &&
        player.x + player.width > pow.x &&
        player.y < pow.y + 20 &&
        player.y + player.height > pow.y
      ) {
        const tx = player.x + 15;
        const ty = player.y;
        switch (pow.type) {
          case 'beer':
            slowEndTimeRef.current = timestamp + POWERUP_SLOW_DURATION;
            addToast("🍻 Slow 3s", tx, ty);
            break;
          case 'heart':
            player.lives = Math.min(player.lives + 1, POWERUP_HEART_MAX);
            addToast("❤️ +1 Vida", tx, ty);
            break;
          case 'copper':
            scoreRef.current += POWERUP_COPPER_POINTS;
            addToast(`🥉 +${POWERUP_COPPER_POINTS}`, tx, ty);
            break;
          case 'silver':
            scoreRef.current += POWERUP_SILVER_POINTS;
            addToast(`🥈 +${POWERUP_SILVER_POINTS}`, tx, ty);
            break;
          case 'gold':
            scoreRef.current += POWERUP_GOLD_POINTS;
            addToast(`🥇 +${POWERUP_GOLD_POINTS}`, tx, ty);
            break;
        }
        powerupsRef.current = powerupsRef.current.filter(p => p !== pow);
        break;
      }
    }

    // Draw
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0b2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Spotlights
    ctx.globalCompositeOperation = 'screen';
    bgSpotlightsRef.current.forEach(s => {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size);
        g.addColorStop(0, s.color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    // 3. Streaks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    const timeOffset = timestamp * 0.05;
    for(let i=0; i<5; i++) {
        const x = (timeOffset + i * 100) % (CANVAS_WIDTH + 200) - 100;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 200, CANVAS_HEIGHT);
        ctx.stroke();
    }

    // 4. Particles
    bgParticlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw player (Teal glow)
    if (isInvulnerable && Math.floor(timestamp / 100) % 2 === 0) {
       ctx.globalAlpha = 0.5;
    }

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00E5FF';
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Draw obstacles
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    obstaclesRef.current.forEach(obs => {
      const cx = obs.x + obs.width/2;
      const cy = obs.y + obs.height/2;
      
      // Red glow background
      const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 30);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.fill();

      let emoji = '⚠️';
      switch(obs.kind) {
        case 'clock': emoji = '⏰'; break;
        case 'money': emoji = '💸'; break;
        case 'bottle': emoji = '🥃'; break;
        case 'shard': emoji = '⚠️'; break;
      }

      ctx.font = `${Math.min(obs.width, obs.height)}px Arial`;
      ctx.fillText(emoji, cx, cy);
    });

    // Draw powerups
    powerupsRef.current.forEach(pow => {
      const cx = pow.x + 10;
      const cy = pow.y + 10;
      
      // Green Glow
      const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, 25);
      g.addColorStop(0, 'rgba(0, 255, 127, 0.6)'); // SpringGreen
      g.addColorStop(1, 'rgba(0, 255, 127, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI*2);
      ctx.fill();
      
      let emoji = '❓';
      switch(pow.type) {
        case 'beer': emoji = '🍺'; break;
        case 'heart': emoji = '❤️'; break;
        case 'copper': emoji = '🥉'; break;
        case 'silver': emoji = '🥈'; break;
        case 'gold': emoji = '🥇'; break;
      }
      
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.fillText(emoji, cx, cy);
    });

    // Draw Toasts
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Arial';
    toastsRef.current.forEach(t => {
        const alpha = t.life / t.maxLife;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
    });

    // UI
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    ctx.fillText(`⏱️ ${(elapsed / 1000).toFixed(1)}s`, 10, 10);
    ctx.fillText(`✨ ${scoreRef.current}`, 10, 35);
    
    const livesStr = player.lives === 1 ? '❤️' : `❤️ x${player.lives}`;
    ctx.fillText(livesStr, 10, 60);

    // Top Right Status
    ctx.textAlign = 'right';
    ctx.fillStyle = '#88CCFF';
    ctx.fillText('🛡️ SIGUES EN PIE', CANVAS_WIDTH - 10, 10);

    animationRef.current = requestAnimationFrame(update);
  }, []);

  const handlePointer = useCallback((e: PointerEvent) => {
    if (screen !== 'play') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    playerRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - playerRef.current.width, x - playerRef.current.width / 2));
    playerRef.current.y = Math.max(0, Math.min(CANVAS_HEIGHT - playerRef.current.height, y - playerRef.current.height / 2));
  }, [screen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('pointermove', handlePointer);
    canvas.style.touchAction = 'none';
    
    if (screen === 'play') {
      animationRef.current = requestAnimationFrame(update);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('pointermove', handlePointer);
    };
  }, [handlePointer, screen, update]);

  // UI Components
  const Overlay = ({ children }: { children: React.ReactNode }) => (
    <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xl flex items-center justify-center p-6 md:p-7 z-10">
      <div className="w-full max-w-[520px] bg-zinc-900/80 border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 text-center">
        {children}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="max-w-full max-h-full object-contain"
      />

      {screen === 'story' && (
        <Overlay>
          <div className="flex flex-col items-center gap-6">
            <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
              STORY • {storyStep + 1}/{STORY_SLIDES.length}
            </div>
            <div className="text-6xl animate-bounce">{STORY_SLIDES[storyStep].icon}</div>
            <h2 className="text-2xl font-bold text-white">{STORY_SLIDES[storyStep].title}</h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              {STORY_SLIDES[storyStep].text}
            </p>
            <div className="flex flex-col w-full gap-3 mt-4">
              {storyStep < STORY_SLIDES.length - 1 ? (
                <button
                  onClick={() => setStoryStep(s => s + 1)}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  SIGUIENTE <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    localStorage.setItem('lounge_survive_story_seen', '1');
                    setStorySeen(true);
                    startGame();
                  }}
                  className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  JUGAR <Play size={20} />
                </button>
              )}
              {storySeen && (
                <button
                  onClick={() => setScreen('intro')}
                  className="text-zinc-500 text-sm font-medium hover:text-white transition-colors"
                >
                  Saltar tutorial
                </button>
              )}
              {!storySeen && (
                <span className="text-zinc-600 text-xs uppercase tracking-widest">Obligatorio</span>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {screen === 'intro' && (
        <Overlay>
          <div className="flex flex-col items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-cyan-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Trophy size={48} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white mb-2">SOBREVIVIR AL 2025</h1>
              <p className="text-zinc-400">¿Cuánto tiempo podrás aguantar?</p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={startGame}
                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                <Play size={20} /> JUGAR
              </button>
              <button
                onClick={() => {
                  setScreen('rank');
                  loadLeaderboard();
                }}
                className="w-full bg-zinc-800 text-white font-bold py-4 rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trophy size={20} /> VER RANKING
              </button>
              <button
                onClick={() => {
                  setStoryStep(0);
                  setScreen('story');
                }}
                className="text-zinc-500 text-sm font-medium hover:text-white transition-colors mt-2"
              >
                Ver tutorial
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {screen === 'over' && (
        <Overlay>
          <div className="flex flex-col items-center gap-6">
            <div className="text-6xl">💀</div>
            <div>
              <h2 className="text-4xl font-black text-white mb-2">CAÍSTE</h2>
              <p className="text-zinc-400">Aguantaste <span className="text-white font-bold">{(finalStats.time / 1000).toFixed(2)}s</span></p>
              <p className="text-zinc-500 text-sm mt-2">No todos llegaron tan lejos.</p>
            </div>

            {!submitted ? (
                <div className="w-full bg-zinc-950/50 p-4 rounded-xl border border-white/5">
                    <p className="text-sm text-zinc-400 mb-2">Guarda tu hazaña:</p>
                    <div className="flex gap-2">
                        <input 
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                            placeholder="Tu nombre"
                            maxLength={15}
                            className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-lg border border-zinc-700 focus:border-emerald-500 outline-none"
                        />
                        <button 
                            onClick={handleSubmitScore}
                            disabled={submitting || !playerName.trim()}
                            className="bg-emerald-500 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-emerald-400 font-bold flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full">
                    ✓ Puntuación guardada
                </div>
            )}

            <div className="flex flex-col w-full gap-3 mt-2">
              <button
                onClick={startGame}
                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} /> INTENTAR OTRA VEZ
              </button>
              <button
                onClick={() => {
                  setScreen('rank');
                  loadLeaderboard();
                }}
                className="w-full bg-zinc-800 text-white font-bold py-4 rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trophy size={20} /> VER RANKING
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {screen === 'rank' && (
        <Overlay>
          <div className="flex flex-col h-full max-h-[600px]">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center gap-2">
              <Trophy className="text-yellow-400" /> RANKING TOP 20
            </h2>
            
            <div className="flex-1 overflow-y-auto min-h-0 mb-6 bg-zinc-950/50 rounded-xl border border-white/5">
              {loadingRank ? (
                <div className="p-8 text-zinc-500">Cargando...</div>
              ) : leaderboard.length === 0 ? (
                <div className="p-8 text-zinc-500">Aún no hay registros.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-zinc-500 font-medium border-b border-white/10 sticky top-0 bg-zinc-900">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">JUGADOR</th>
                      <th className="p-3 text-right">TIEMPO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leaderboard.map((run, i) => (
                      <tr key={run.id} className="text-zinc-300">
                        <td className="p-3 text-center font-mono text-zinc-500">{i + 1}</td>
                        <td className="p-3 font-medium text-white truncate max-w-[120px]">
                          {run.display_name}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-400">
                          {(run.best_ms / 1000).toFixed(2)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => setScreen('intro')}
                className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} /> VOLVER
              </button>
              <button
                onClick={startGame}
                className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                <Play size={18} /> JUGAR
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
