"use client";
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { SECTIONS } from '../constants/sections';

type Props = {
  className?: string;
};

export function ScrollDownToShows({ className }: Props) {

  return (
    <motion.a
      href="#shows"
      key="scroll-down"
      initial={{ y: 0 }}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={className ?? "absolute bottom-10 z-[1100] flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md cursor-pointer hover:opacity-90 pointer-events-auto"}
      aria-label="Ir a Próximos Shows"
      title="Ir a Próximos Shows"
      style={{ touchAction: 'manipulation' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-gray-800">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </motion.a>
  );
}

export default ScrollDownToShows;
