'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MIN_SURVIVE_MS } from '../constants';

interface NameModalProps {
  time: number;
  score: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export default function NameModal({ time, score, onSubmit, onCancel }: NameModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 16) {
      return 'El nombre debe tener entre 2 y 16 caracteres.';
    }
    if (!/^[a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ_-]+$/.test(trimmed)) {
      return 'Solo letras, números, espacios, guiones y tildes.';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateName(name);
    if (err) {
      setError(err);
      return;
    }
    onSubmit(name.trim());
  };

  const canSubmit = time >= MIN_SURVIVE_MS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">¡Buen Trabajo!</h2>
        <p className="mb-2">Tiempo: {(time / 1000).toFixed(1)}s</p>
        <p className="mb-4">Puntos: {score}</p>
        {canSubmit ? (
          <>
            <p className="mb-4">Ingresa tu nombre para el ranking:</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                className="w-full p-2 border rounded mb-2"
                placeholder="Tu nombre"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded">
                  Guardar y Ver Ranking
                </button>
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-500 text-white rounded">
                  Cancelar
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="text-red-500 mb-4">
              Aguanta 8s para entrar al ranking.
            </p>
            <button onClick={onCancel} className="w-full px-4 py-2 bg-gray-500 text-white rounded">
              Intentar Otra Vez
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}