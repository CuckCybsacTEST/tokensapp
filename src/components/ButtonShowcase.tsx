"use client";

import React, { useState } from "react";
import {
  Button,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  SuccessButton,
  OutlineButton,
  ActionButton,
  QuickActionButton,
  StatusButton,
  SpinButton,
  CompactSpinButton
} from "./index";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Zap, Star } from "lucide-react";

export function ButtonShowcase() {
  const [actionState, setActionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [spinState, setSpinState] = useState(false);
  const [lastSpinTime, setLastSpinTime] = useState<number | undefined>();

  const handleAction = async () => {
    setActionState("loading");
    // Simular operación asíncrona
    await new Promise(resolve => setTimeout(resolve, 2000));
    setActionState(Math.random() > 0.5 ? "success" : "error");
    setTimeout(() => setActionState("idle"), 3000);
  };

  const handleSpin = () => {
    setSpinState(true);
    setLastSpinTime(Date.now());
    // Simular giro
    setTimeout(() => setSpinState(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#FF4D2E] to-purple-600 bg-clip-text text-transparent">
            Sistema de Botones Animados
          </h1>
          <p className="text-gray-400 text-lg">
            Componentes de botones con animaciones avanzadas para el sistema de pedidos
          </p>
        </motion.div>

        {/* Botones básicos */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
            Botones Básicos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Variantes</h3>
              <div className="space-y-3">
                <PrimaryButton>Botón Primario</PrimaryButton>
                <SecondaryButton>Botón Secundario</SecondaryButton>
                <DangerButton>Botón Peligro</DangerButton>
                <SuccessButton>Botón Éxito</SuccessButton>
                <OutlineButton>Botón Outline</OutlineButton>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tamaños</h3>
              <div className="space-y-3">
                <Button size="sm">Botón Pequeño</Button>
                <Button size="md">Botón Mediano</Button>
                <Button size="lg">Botón Grande</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Con Iconos</h3>
              <div className="space-y-3">
                <Button icon={<CheckCircle className="w-4 h-4" />}>Con Icono Izq</Button>
                <Button icon={<XCircle className="w-4 h-4" />} iconPosition="right">
                  Con Icono Der
                </Button>
                <Button loading>Cargando...</Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Botones de acción */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
            Botones de Acción
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Botón de Acción con Estados</h3>
              <ActionButton
                onClick={handleAction}
                loading={actionState === "loading"}
                success={actionState === "success"}
                error={actionState === "error"}
                successMessage="¡Operación completada!"
                errorMessage="Error en la operación"
              >
                Ejecutar Acción
              </ActionButton>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Botones de Estado</h3>
              <div className="space-y-3">
                <StatusButton status="idle" onClick={() => {}}>
                  Estado Idle
                </StatusButton>
                <StatusButton status="loading" onClick={() => {}}>
                  Estado Loading
                </StatusButton>
                <StatusButton status="success" onClick={() => {}}>
                  Estado Success
                </StatusButton>
                <StatusButton status="error" onClick={() => {}}>
                  Estado Error
                </StatusButton>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Acciones Rápidas</h3>
            <div className="flex flex-wrap gap-3">
              <QuickActionButton onClick={() => {}}>
                Acción Rápida 1
              </QuickActionButton>
              <QuickActionButton onClick={() => {}}>
                Acción Rápida 2
              </QuickActionButton>
              <QuickActionButton onClick={() => {}} disabled>
                Deshabilitada
              </QuickActionButton>
            </div>
          </div>
        </motion.section>

        {/* Botones de giro */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
            Botones de Giro
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Botón de Giro Premium</h3>
              <SpinButton
                onSpin={handleSpin}
                spinning={spinState}
                cooldown={5}
                lastSpinTime={lastSpinTime}
                variant="premium"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Botón de Giro Estándar</h3>
              <SpinButton
                onSpin={handleSpin}
                spinning={spinState}
                cooldown={3}
                lastSpinTime={lastSpinTime}
                variant="primary"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Botón Compacto</h3>
            <div className="flex justify-center">
              <CompactSpinButton
                onSpin={handleSpin}
                spinning={spinState}
              />
            </div>
          </div>
        </motion.section>

        {/* Información de uso */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gray-800 rounded-lg p-6"
        >
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Información de Uso
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2 text-[#FF4D2E]">Características</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Animaciones con Framer Motion</li>
                <li>• Estados de loading y feedback visual</li>
                <li>• Variantes premium y estándar</li>
                <li>• Sistema de cooldown para giros</li>
                <li>• Efectos de ripple y glow</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-[#FF4D2E]">Uso Recomendado</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• SpinButton para ruleta principal</li>
                <li>• ActionButton para operaciones CRUD</li>
                <li>• StatusButton para indicadores de estado</li>
                <li>• QuickActionButton para acciones rápidas</li>
              </ul>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
