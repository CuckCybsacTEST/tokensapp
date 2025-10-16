"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { Modal } from "./Modal";

interface SystemMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "danger";
  };
}

export function SystemMessageModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  actionButton
}: SystemMessageModalProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: {
      icon: "text-green-500",
      bg: "bg-green-500/10 border-green-500/20",
      button: "bg-green-600 hover:bg-green-700"
    },
    error: {
      icon: "text-red-500",
      bg: "bg-red-500/10 border-red-500/20",
      button: "bg-red-600 hover:bg-red-700"
    },
    warning: {
      icon: "text-yellow-500",
      bg: "bg-yellow-500/10 border-yellow-500/20",
      button: "bg-yellow-600 hover:bg-yellow-700"
    },
    info: {
      icon: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
      button: "bg-blue-600 hover:bg-blue-700"
    }
  };

  const Icon = icons[type];
  const colorScheme = colors[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnBackdropClick={false}
    >
      <div className="text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${colorScheme.bg} border mb-4`}
        >
          <Icon className={`w-8 h-8 ${colorScheme.icon}`} />
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-semibold text-white mb-2"
        >
          {title}
        </motion.h3>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-300 mb-6"
        >
          {message}
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 justify-center"
        >
          {actionButton && (
            <button
              onClick={actionButton.onClick}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                actionButton.variant === "danger"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : actionButton.variant === "secondary"
                  ? "bg-gray-600 hover:bg-gray-700 text-white"
                  : colorScheme.button + " text-white"
              }`}
            >
              {actionButton.label}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            Cerrar
          </button>
        </motion.div>
      </div>
    </Modal>
  );
}