'use client';

import ExchangeForm from './ExchangeForm';

export default function IntercambioPage() {
  return (
    <div className="min-h-screen bg-[#0E0606] text-white">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent mb-2">
            Intercambio Cliente
          </h1>
          <p className="text-white/60 text-sm sm:text-base">
            Comparte tu experiencia y obtén un premio
          </p>
        </div>
        <ExchangeForm />
      </div>
    </div>
  );
}
