"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { Zap, Sparkles, RotateCcw } from "lucide-react";

export interface SpinButtonProps {
  onSpin: () => void;
  spinning?: boolean;
  disabled?: boolean;
  cooldown?: number; // tiempo en segundos
  lastSpinTime?: number;
  variant?: "primary" | "secondary" | "premium";
  size?: "md" | "lg";
  className?: string;
}

export function SpinButton({
  onSpin,
  spinning = false,
  disabled = false,
  cooldown = 0,
  lastSpinTime,
  variant = "primary",
  size = "lg",
  className = "",
}: SpinButtonProps) {
  const [isCooldown, setIsCooldown] = React.useState(false);
  const [cooldownTime, setCooldownTime] = React.useState(0);

  React.useEffect(() => {
    if (lastSpinTime && cooldown > 0) {
      const elapsed = Date.now() - lastSpinTime;
      const remaining = Math.max(0, cooldown * 1000 - elapsed);

      if (remaining > 0) {
        setIsCooldown(true);
        setCooldownTime(Math.ceil(remaining / 1000));

        const interval = setInterval(() => {
          const newElapsed = Date.now() - lastSpinTime;
          const newRemaining = Math.max(0, cooldown * 1000 - newElapsed);

          if (newRemaining <= 0) {
            setIsCooldown(false);
            setCooldownTime(0);
            clearInterval(interval);
          } else {
            setCooldownTime(Math.ceil(newRemaining / 1000));
          }
        }, 100);

        return () => clearInterval(interval);
      }
    }
  }, [lastSpinTime, cooldown]);

  const handleClick = () => {
    if (!spinning && !disabled && !isCooldown) {
      onSpin();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "premium":
        return {
          base: "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 shadow-2xl hover:shadow-purple-500/25",
          glow: "shadow-purple-500/50",
        };
      case "secondary":
        return {
          base: "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-800 hover:to-gray-700 shadow-xl hover:shadow-gray-500/25",
          glow: "shadow-gray-500/50",
        };
      default:
        return {
          base: "bg-gradient-to-r from-[#FF4D2E] to-[#E6442A] hover:from-[#E6442A] hover:to-[#D13B24] shadow-2xl hover:shadow-[#FF4D2E]/50",
          glow: "shadow-[#FF4D2E]/50",
        };
    }
  };

  const styles = getVariantStyles();
  const isDisabled = disabled || spinning || isCooldown;

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`relative overflow-hidden rounded-xl ${styles.base} transition-all duration-300`}
        whileHover={!isDisabled ? { scale: 1.05 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
        animate={spinning ? {
          boxShadow: [
            "0 0 20px rgba(255, 77, 46, 0.5)",
            "0 0 40px rgba(255, 77, 46, 0.8)",
            "0 0 20px rgba(255, 77, 46, 0.5)",
          ],
        } : {}}
        transition={{
          scale: { type: "spring", stiffness: 400, damping: 17 },
          boxShadow: { duration: 1, repeat: Infinity },
        }}
      >
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className="relative w-full h-full px-8 py-4 text-white font-bold text-lg disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-3 min-w-[200px]"
        >
          {/* Background particles */}
          <AnimatePresence>
            {spinning && (
              <motion.div className="absolute inset-0">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-white rounded-full"
                    initial={{
                      x: "50%",
                      y: "50%",
                      opacity: 0,
                    }}
                    animate={{
                      x: `${50 + Math.cos(i * 60 * Math.PI / 180) * 80}%`,
                      y: `${50 + Math.sin(i * 60 * Math.PI / 180) * 80}%`,
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <AnimatePresence mode="wait">
            {spinning && (
              <motion.div
                key="spinning"
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RotateCcw className="w-6 h-6" />
                </motion.div>
                <span>Girando...</span>
              </motion.div>
            )}

            {isCooldown && (
              <motion.div
                key="cooldown"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-3"
              >
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <span>{cooldownTime}s</span>
              </motion.div>
            )}

            {!spinning && !isCooldown && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-3"
              >
                <Zap className="w-6 h-6" />
                <span>¡GIRAR!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ripple effect */}
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-xl"
            initial={{ scale: 0, opacity: 1 }}
            whileTap={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        </button>
      </motion.div>

      {/* Glow effect */}
      <motion.div
        className={`absolute inset-0 rounded-xl ${styles.glow} opacity-0 blur-xl`}
        animate={spinning ? { opacity: 0.6 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

// Variante compacta para espacios reducidos
export function CompactSpinButton({
  onSpin,
  spinning = false,
  disabled = false,
  className = "",
}: Omit<SpinButtonProps, "cooldown" | "lastSpinTime" | "variant" | "size">) {
  return (
    <motion.button
      onClick={() => !spinning && !disabled && onSpin()}
      disabled={disabled || spinning}
      className={`relative overflow-hidden rounded-lg bg-[#FF4D2E] hover:bg-[#E6442A] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-white font-semibold flex items-center gap-2 ${className}`}
      whileHover={!spinning && !disabled ? { scale: 1.05 } : {}}
      whileTap={!spinning && !disabled ? { scale: 0.95 } : {}}
      animate={spinning ? {
        boxShadow: [
          "0 0 10px rgba(255, 77, 46, 0.5)",
          "0 0 20px rgba(255, 77, 46, 0.8)",
          "0 0 10px rgba(255, 77, 46, 0.5)",
        ],
      } : {}}
      transition={{
        scale: { type: "spring", stiffness: 400, damping: 17 },
        boxShadow: { duration: 0.8, repeat: spinning ? Infinity : 0 },
      }}
    >
      <AnimatePresence mode="wait">
        {spinning ? (
          <motion.div
            key="spinning"
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            >
              <RotateCcw className="w-4 h-4" />
            </motion.div>
            <span className="text-sm">...</span>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>GIRAR</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}