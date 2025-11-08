'use client';

import React, { useState, useEffect } from 'react';
import { IconUser, IconId, IconMapPin, IconShield, IconKey, IconCheck, IconX } from '@tabler/icons-react';

interface UserProfile {
  id: string;
  username: string;
  role: string;
  personCode: string | null;
  personName: string | null;
  area: string | null;
  dni: string | null;
}

export default function ProfileClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const response = await fetch('/api/user/me');
      const data = await response.json();

      if (response.ok && data.ok) {
        setProfile(data.user);
      } else {
        setError('Error al cargar el perfil');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch('/api/user/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setMessage('Contraseña cambiada exitosamente');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen sm:min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-sm sm:text-base text-slate-600 dark:text-slate-300">Cargando perfil...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-screen sm:min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-sm sm:text-base text-red-600 dark:text-red-400">Error al cargar el perfil</div>
      </div>
    );
  }

  return (
    <div className="h-screen sm:min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-4xl px-3 sm:px-6 lg:px-8 py-2 sm:py-6 lg:py-8">
        <div className="space-y-3 sm:space-y-6 lg:space-y-8">
          {/* Información Personal */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <IconUser className="w-4 sm:w-6 h-4 sm:h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-slate-100">Información Personal</h2>
              </div>
            </div>

            <div className="p-3 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    <IconUser className="w-3 sm:w-4 h-3 sm:h-4" />
                    Nombre
                  </div>
                  <div className="text-gray-900 dark:text-slate-100 font-medium text-xs sm:text-base">
                    {profile.personName || 'No especificado'}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    <IconId className="w-3 sm:w-4 h-3 sm:h-4" />
                    Usuario
                  </div>
                  <div className="text-gray-900 dark:text-slate-100 font-medium text-xs sm:text-base">
                    {profile.username}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    <IconId className="w-3 sm:w-4 h-3 sm:h-4" />
                    DNI
                  </div>
                  <div className="text-gray-900 dark:text-slate-100 font-medium text-xs sm:text-base">
                    {profile.dni || 'No especificado'}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    <IconMapPin className="w-3 sm:w-4 h-3 sm:h-4" />
                    Área
                  </div>
                  <div className="text-gray-900 dark:text-slate-100 font-medium text-xs sm:text-base">
                    {profile.area || 'No especificado'}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    <IconShield className="w-3 sm:w-4 h-3 sm:h-4" />
                    Rol
                  </div>
                  <div className="text-gray-900 dark:text-slate-100 font-medium text-xs sm:text-base">
                    {profile.role === 'STAFF' ? (profile.area ? profile.area.charAt(0).toUpperCase() + profile.area.slice(1).toLowerCase() : 'Staff') : profile.role}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400">
                    <IconId className="w-3 sm:w-4 h-3 sm:h-4" />
                    Código
                  </div>
                  <div className="text-gray-900 dark:text-slate-100 font-medium font-mono text-xs sm:text-base">
                    {profile.personCode || 'No especificado'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cambio de Contraseña */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-700">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <IconKey className="w-4 sm:w-6 h-4 sm:h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-slate-100">Cambiar Contraseña</h2>
              </div>
            </div>

            <div className="p-3 sm:p-6">
              {message && (
                <div className="mb-2 sm:mb-6 p-2 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <IconCheck className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">{message}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-2 sm:mb-6 p-2 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <IconX className="w-4 sm:w-5 h-4 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3 sm:space-y-6">
                <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6">
                  <div className="sm:col-span-2">
                    <label htmlFor="currentPassword" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 sm:mb-2">
                      Contraseña Actual
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="block w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 transition-colors text-sm sm:text-base"
                      placeholder="Ingresa tu contraseña actual"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 sm:mb-2">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="block w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 transition-colors text-sm sm:text-base"
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 sm:mb-2">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="block w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 transition-colors text-sm sm:text-base"
                      placeholder="Repite la nueva contraseña"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 border border-transparent shadow-sm text-xs sm:text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {changingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-3 sm:h-4 w-3 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                        Cambiando...
                      </>
                    ) : (
                      <>
                        <IconKey className="w-3 sm:w-5 h-3 sm:h-5 mr-1 sm:mr-2" />
                        Cambiar Contraseña
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
