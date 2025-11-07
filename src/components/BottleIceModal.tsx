"use client";

import React from "react";
import { Modal } from "@/components/Modal";
import { Snowflake, Wine, Info, GlassWater } from "lucide-react";

interface BottleIceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function BottleIceModal({ isOpen, onClose, onContinue }: BottleIceModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Información sobre complementos"
      size="lg"
      showCloseButton={false}
      closeOnBackdropClick={false}
    >
      <div className="space-y-6">
        {/* Iconos principales */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
              <GlassWater className="w-8 h-8 text-amber-400" />
            </div>
            <span className="text-sm font-medium text-amber-400">Complementos por separado</span>
          </div>
        </div>

        {/* Mensaje principal */}
        <div className="text-center space-y-4">
          <p className="text-slate-300 leading-relaxed">
            Los complementos para tu botella <strong className="text-amber-400">(gaseosas,jugos, etc.)</strong> <strong className="text-amber-400">NO ESTÁN INCLUIDOS</strong> en el precio del pack,  puedes adquirirlos por separado en nuestra barra.
          </p>
        </div>

        {/* Información adicional */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-300">
              <p className="mb-2">
                <strong>¿Qué incluye tu pack?</strong>
              </p>
              <ul className="space-y-1 text-xs">
                <li>• Botella de cortesía según el pack seleccionado</li>
                <li>• Hielo para mantener la bebida fría</li>
                <li>• Tarjetas QR para tu ingreso y el de tus invitados</li>
                <li>• Decoración y ambientación especial</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancelar reserva
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all"
          >
            Continuar y ver QRs
          </button>
        </div>
      </div>
    </Modal>
  );
}
