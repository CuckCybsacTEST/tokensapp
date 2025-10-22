"use client";

import React from "react";
import { CheckCircle, X } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  orderId?: string;
  autoCloseDelay?: number; // en milisegundos
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  orderId,
  autoCloseDelay = 5000
}: SuccessModalProps) {
  React.useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, autoCloseDelay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/90 border border-white/20 rounded-xl p-6 max-w-sm w-full mx-4">
        {/* Header con ícono de éxito */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-3">
          <p className="text-gray-300 text-sm leading-relaxed">
            {message}
          </p>

          {orderId && (
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Número de pedido</p>
              <p className="text-white font-mono text-sm">#{orderId.slice(-8)}</p>
            </div>
          )}
        </div>

        {/* Botón de cerrar */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#FF4D2E]/90 transition-colors font-semibold"
          >
            Entendido
          </button>
        </div>

        {/* Auto-close indicator */}
        {autoCloseDelay > 0 && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Se cerrará automáticamente en {Math.ceil(autoCloseDelay / 1000)}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}