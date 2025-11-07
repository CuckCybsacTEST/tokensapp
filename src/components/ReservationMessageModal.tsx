"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X, Phone, FileText, Calendar, Package } from "lucide-react";
import { Modal } from "./Modal";

interface ReservationMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  suggestions?: string[];
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "danger";
  };
  field?: "name" | "whatsapp" | "documento" | "date" | "pack" | "general";
}

export function ReservationMessageModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  suggestions = [],
  actionButton,
  field
}: ReservationMessageModalProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const fieldIcons = {
    name: <span className="text-lg">👤</span>,
    whatsapp: <Phone className="w-5 h-5" />,
    documento: <FileText className="w-5 h-5" />,
    date: <Calendar className="w-5 h-5" />,
    pack: <Package className="w-5 h-5" />,
    general: <Info className="w-5 h-5" />
  };

  const colors = {
    success: {
      icon: "text-green-500",
      bg: "bg-green-500/10 border-green-500/20",
      button: "bg-green-600 hover:bg-green-700",
      text: "text-green-400"
    },
    error: {
      icon: "text-red-500",
      bg: "bg-red-500/10 border-red-500/20",
      button: "bg-red-600 hover:bg-red-700",
      text: "text-red-400"
    },
    warning: {
      icon: "text-yellow-500",
      bg: "bg-yellow-500/10 border-yellow-500/20",
      button: "bg-yellow-600 hover:bg-yellow-700",
      text: "text-yellow-400"
    },
    info: {
      icon: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
      button: "bg-blue-600 hover:bg-blue-700",
      text: "text-blue-400"
    }
  };

  const Icon = icons[type];
  const colorScheme = colors[type];
  const FieldIcon = field ? fieldIcons[field] : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={true}
      closeOnBackdropClick={true}
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

        {/* Field indicator */}
        {field && field !== 'general' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-center gap-2 mb-2"
          >
            <span className="text-gray-400">{FieldIcon}</span>
            <span className="text-sm text-gray-400 uppercase tracking-wide">
              {field === 'name' && 'Nombre'}
              {field === 'whatsapp' && 'WhatsApp'}
              {field === 'documento' && 'Documento'}
              {field === 'date' && 'Fecha'}
              {field === 'pack' && 'Pack'}
            </span>
          </motion.div>
        )}

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-semibold text-white mb-3"
        >
          {title}
        </motion.h3>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-300 mb-4 leading-relaxed"
        >
          {message}
        </motion.p>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left"
          >
            <h4 className={`text-sm font-semibold ${colorScheme.text} mb-2 flex items-center gap-2`}>
              <Info className="w-4 h-4" />
              Sugerencias para corregir:
            </h4>
            <ul className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Action Button */}
        {actionButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 justify-center"
          >
            <button
              onClick={actionButton.onClick}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                actionButton.variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : actionButton.variant === 'secondary'
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : colorScheme.button + ' text-white'
              }`}
            >
              {actionButton.label}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              Cerrar
            </button>
          </motion.div>
        )}

        {/* Close button if no action button */}
        {!actionButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center mt-6"
          >
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              Entendido
            </button>
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
