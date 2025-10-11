"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function RetryOverlay({ open }: { open: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(10,12,16,0.6)", backdropFilter: "blur(10px)" }}
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="relative z-10 rounded-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(20,20,28,0.95), rgba(18,18,24,0.95))",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#5B86E5] to-[#36D1DC] animate-pulse flex items-center justify-center text-3xl">🔄</div>
              <div className="text-white/90 text-lg sm:text-2xl font-bold mt-2">Nuevo intento</div>
              <div className="mt-2 text-white/70 text-sm sm:text-base">Preparando tu siguiente giro…</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
