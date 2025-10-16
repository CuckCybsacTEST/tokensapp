"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { CheckCircle, XCircle, AlertCircle, Loader2, Zap } from "lucide-react";

export interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
}

export function ActionButton({
  onClick,
  children,
  loading = false,
  success = false,
  error = false,
  disabled = false,
  variant = "primary",
  size = "md",
  icon,
  successMessage = "¡Éxito!",
  errorMessage = "Error",
  className = "",
}: ActionButtonProps) {
  const [showFeedback, setShowFeedback] = React.useState(false);

  React.useEffect(() => {
    if (success || error) {
      setShowFeedback(true);
      const timer = setTimeout(() => setShowFeedback(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleClick = () => {
    if (!loading && !disabled) {
      onClick();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={handleClick}
        loading={loading}
        disabled={disabled || success}
        variant={error ? "danger" : variant}
        size={size}
        icon={icon}
        className="relative overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando...
            </motion.div>
          )}
          {success && !loading && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {successMessage}
            </motion.div>
          )}
          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {errorMessage}
            </motion.div>
          )}
          {!loading && !success && !error && (
            <motion.div
              key="default"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Feedback overlay */}
      <AnimatePresence>
        {showFeedback && (success || error) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute inset-0 rounded-lg flex items-center justify-center ${
              success ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={`p-2 rounded-full ${
                success ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {success ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <XCircle className="w-6 h-6 text-white" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Botón específico para acciones rápidas
export function QuickActionButton({
  onClick,
  children,
  disabled = false,
  className = "",
}: Omit<ActionButtonProps, "loading" | "success" | "error" | "variant" | "size">) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Zap className="w-3 h-3" />
      {children}
    </motion.button>
  );
}

// Botón de estado con indicador visual
export function StatusButton({
  status,
  onClick,
  children,
  className = "",
}: {
  status: "idle" | "loading" | "success" | "error";
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const statusConfig = {
    idle: { color: "bg-gray-600 hover:bg-gray-500", icon: null },
    loading: { color: "bg-blue-600", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    success: { color: "bg-green-600", icon: <CheckCircle className="w-4 h-4" /> },
    error: { color: "bg-red-600", icon: <XCircle className="w-4 h-4" /> },
  };

  const config = statusConfig[status];

  return (
    <motion.button
      onClick={onClick}
      disabled={status === "loading"}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:cursor-not-allowed ${config.color} ${className}`}
      whileHover={status !== "loading" ? { scale: 1.02 } : {}}
      whileTap={status !== "loading" ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {config.icon}
      {children}
    </motion.button>
  );
}