'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerLogin() {
  const router = useRouter();
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Buscar customer por DNI
      const response = await fetch(`/api/customers/search?dni=${encodeURIComponent(dni)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al buscar cliente');
      }

      const data = await response.json();

      if (!data.customer) {
        setError('Cliente no encontrado. ¿Ya te registraste?');
        return;
      }

      // Guardar información del cliente en localStorage o session
      localStorage.setItem('customer', JSON.stringify(data.customer));

      // Redirigir al perfil del cliente
      router.push('/profile');

    } catch (err) {
      console.error('Error:', err);
      setError('Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Iniciar Sesión</h1>
          <p className="text-white/80">Ingresa tu DNI para acceder a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="dni" className="block text-sm font-medium text-white/90 mb-2">
              DNI
            </label>
            <input
              type="text"
              id="dni"
              name="dni"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ingresa tu DNI"
              required
              maxLength={8}
              pattern="[0-9]{8}"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !dni}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white/80 text-sm">
            ¿No tienes cuenta?{' '}
            <a
              href="/register"
              className="text-purple-300 hover:text-purple-200 font-medium underline"
            >
              Regístrate aquí
            </a>
          </p>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/marketing"
            className="text-white/60 hover:text-white/80 text-sm underline"
          >
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}