"use client";

import React, { useEffect, useRef } from 'react';

type CanvasConfettiProps = {
  active: boolean;
  lowMotion?: boolean;
  durationMs?: number; // total animation time
  emitMs?: number; // emission window
  maxParticles?: number;
  colors?: string[];
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number; // gravity
  size: number;
  rot: number;
  vr: number; // rotation speed
  color: string;
  shape: 0 | 1; // 0 rect, 1 circle
  life: number; // ms
  maxLife: number; // ms
  opacity: number;
};

const defaultColors = ['#FF8A00', '#FF5252', '#E040FB', '#7C4DFF', '#448AFF', '#18FFFF', '#B2FF59', '#EEFF41', '#FFC400', '#FF6D00'];

export default function CanvasConfetti({
  active,
  lowMotion = false,
  durationMs = 4000,
  emitMs = 900,
  maxParticles,
  colors = defaultColors,
}: CanvasConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Heurística para cap y calidad
  const smallViewport = typeof window !== 'undefined' && (window.innerWidth < 480 || window.innerHeight < 720);
  const targetMax = maxParticles ?? (lowMotion ? (smallViewport ? 28 : 40) : (smallViewport ? 70 : 160));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let particles: Particle[] = [];
    let start = performance.now();
    let last = start;

    // Setup size and DPR scaling
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const spawn = (count: number) => {
      const wCss = window.innerWidth;
      const margin = Math.max(24, Math.floor(wCss * 0.02)); // margen para evitar “paredes” laterales
      for (let i = 0; i < count && particles.length < targetMax; i++) {
        const x = -margin + Math.random() * (wCss + margin * 2);
        const y = -10; // from top
        const angle = (-Math.PI / 2) + ((Math.random() - 0.5) * (Math.PI / 3));
        const speed = lowMotion ? (220 + Math.random() * 140) : (280 + Math.random() * 220);
        const vx = Math.cos(angle) * speed / 1000; // px/ms
        const vy = Math.sin(angle) * speed / 1000; // px/ms
        const g = lowMotion ? 0.0012 : 0.0018; // px/ms^2
        const size = lowMotion ? (5 + Math.random() * 8) : (6 + Math.random() * 12);
        const rot = Math.random() * Math.PI * 2;
        const vr = (Math.random() - 0.5) * (lowMotion ? 0.014 : 0.02); // rad/ms
        const color = colors[Math.floor(Math.random() * colors.length)] || '#fff';
        const shape = Math.random() > 0.5 ? 0 : 1;
        const maxLife = durationMs * (0.75 + Math.random() * 0.5);
        particles.push({ x, y, vx, vy, g, size, rot, vr, color, shape, life: 0, maxLife, opacity: 1 });
      }
    };

  const tick = (now: number) => {
      if (!running) return;
      const dt = now - last; // ms
      last = now;

      const elapsed = now - start;
      // emission window
      if (elapsed < emitMs * (lowMotion ? 1 : 1.2)) {
        // adaptive burst rate (+desktop)
        const toSpawn = lowMotion ? 6 : (smallViewport ? 12 : 16);
        spawn(toSpawn);
      }

      // update
  // Clear in device pixels (decouple from current transform to avoid banding)
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life += dt;
        // fade out near end of life
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio > 0.7) p.opacity = Math.max(0, 1 - (lifeRatio - 0.7) / 0.3);

        // draw
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          const w = p.size;
          const h = p.size * (0.5 + Math.random() * 0.6);
          ctx.fillRect(-w / 2, -h / 2, w, h);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // remove off-screen or dead
        if (p.life > p.maxLife || p.y > window.innerHeight + 50) {
          particles.splice(i, 1);
        }
      }

      // stop conditions
      if (elapsed > durationMs && particles.length === 0) {
        running = false;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame((n) => { last = n; tick(n); });

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener('resize', onResize);
      // clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, lowMotion, durationMs, emitMs, targetMax, colors]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        pointerEvents: 'none',
      }}
    />
  );
}
