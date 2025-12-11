"use client";
import React from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export const useErrorModal = () => {
  const [errorModal, setErrorModal] = React.useState<{title: string; message: string} | null>(null);

  const showError = (title: string, message: string) => {
    setErrorModal({ title, message });
  };

  const closeError = () => {
    setErrorModal(null);
  };

  return {
    errorModal,
    showError,
    closeError,
  };
};