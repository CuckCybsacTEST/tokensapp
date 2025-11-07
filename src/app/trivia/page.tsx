"use client";
import React, { useState, useEffect } from "react";
import TriviaGame from "./TriviaGame";

export default function TriviaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">
            🧠 Trivia Interactiva
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
            Responde todas las preguntas correctamente y gana un premio exclusivo.
            ¡Demuestra tus conocimientos y obtén tu QR de premio!
          </p>
        </div>

        <TriviaGame />
      </div>
    </div>
  );
}
