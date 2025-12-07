'use client';

import React, { useState, useEffect } from 'react';

// Componente simplificado para gestión de temas
export default function ThemeManager({ initialThemes }: { initialThemes?: any }) {
  const [themes, setThemes] = useState<any>(initialThemes || {});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar temas al montar
  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      const response = await fetch('/api/admin/themes');
      if (response.ok) {
        const data = await response.json();
        setThemes(data.configs);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar temas' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Temas de Ruleta</h1>
        <p className="text-gray-600">Administra los temas visuales de la ruleta</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-blue-800 font-semibold mb-2">Cómo gestionar temas:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Los temas se configuran directamente en el código fuente</li>
          <li>• Edita <code className="bg-blue-100 px-1 rounded">src/lib/themes/registry.ts</code></li>
          <li>• Modifica <code className="bg-blue-100 px-1 rounded">src/lib/themes/types.ts</code> para nuevos tipos</li>
          <li>• Reinicia el servidor después de cambios</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(themes).map(([themeName, config]: [string, any]) => (
          <div key={themeName} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{config.displayName}</h3>
                <p className="text-sm text-gray-500">({themeName})</p>
              </div>
            </div>

            {/* Preview de colores */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: config.colors.primary }}
                  title="Primary"
                ></div>
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: config.colors.secondary }}
                  title="Secondary"
                ></div>
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: config.colors.accent }}
                  title="Accent"
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {config.roulette.segments.palette.length} colores de segmento
              </p>
            </div>

            {/* Botón de preview */}
            <div className="mt-4">
              <a
                href={`/marketing/ruleta?theme=${themeName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-700 underline"
              >
                Ver Preview →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}