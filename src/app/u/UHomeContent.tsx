"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import AutoAttendanceCard from './AutoAttendanceCard';
import { IconUser, IconListCheck, IconQrcode, IconDice6, IconCake, IconGlass, IconPackage, IconShieldLock } from '@tabler/icons-react';

type SessionData = {
  userId: string;
  role: string;
};

type PageProps = {
  session: SessionData;
  isStaff: boolean;
  hasCartaAccess: boolean;
  lastType: 'IN' | 'OUT' | null;
  personName?: string;
  commitmentAcceptedVersion: number;
  hasDefaultPassword?: boolean;
};

export default function UHomeContent({ session, isStaff, hasCartaAccess, lastType, personName, commitmentAcceptedVersion, hasDefaultPassword = false }: PageProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'work'>('personal');
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  // Mostrar modal de reset de contraseña si es necesario
  useEffect(() => {
    if (hasDefaultPassword) {
      // Verificar si ya se mostró el modal en esta sesión
      const modalShown = sessionStorage.getItem('passwordResetModalShown');
      if (!modalShown) {
        setShowPasswordResetModal(true);
      }
    }
  }, [hasDefaultPassword]);

  const handleClosePasswordModal = () => {
    setShowPasswordResetModal(false);
    sessionStorage.setItem('passwordResetModalShown', 'true');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-3 sm:px-6 lg:px-8 pt-1 pb-3 sm:pt-2 sm:pb-6">
        <div className="space-y-6 sm:space-y-8">
          {/* Pestañas */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex justify-center space-x-4 sm:space-x-8">
              <button
                onClick={() => setActiveTab('personal')}
                className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-base sm:text-sm transition-colors ${
                  activeTab === 'personal'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setActiveTab('work')}
                className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-base sm:text-sm transition-colors ${
                  activeTab === 'work'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Herramientas
              </button>
            </nav>
          </div>

          {/* Contenido de las pestañas */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 gap-3 sm:gap-6">
              <AutoAttendanceCard initialLastType={lastType} />

              <Link href="/u/profile" className="block rounded-lg border border-blue-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-blue-800/60 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <IconUser className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Mi Perfil</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Ver mi información personal y cambiar mi contraseña.</p>
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm ml-8 sm:ml-9">Ver perfil →</div>
              </Link>

              {session.role === 'STAFF' && (
                <Link href="/u/attendance" className="block rounded-lg border border-indigo-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-indigo-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconListCheck className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Mi Registro de Asistencia</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Revisa tu historial de entradas y salidas del día.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm ml-8 sm:ml-9">Ver registro →</div>
                </Link>
              )}

              <Link href="/u?view-regulation=1" className="block rounded-lg border-2 border-red-300 bg-red-50/50 p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-red-600/60 dark:bg-red-900/20">
                <div className="flex items-center gap-3 mb-2">
                  <IconShieldLock className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div className="text-base sm:text-lg font-semibold text-red-900 dark:text-red-100">Reglamento Interno</div>
                </div>
                <p className="text-sm text-red-800 dark:text-red-200 ml-8 sm:ml-9">Lee el reglamento interno y firma tu compromiso de cumplimiento.</p>
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-red-700 dark:text-red-300 font-medium text-sm ml-8 sm:ml-9">Abrir reglamento →</div>
              </Link>
            </div>
          )}

          {activeTab === 'work' && (
            <div className="grid grid-cols-1 gap-3 sm:gap-6">
              {session.role === 'STAFF' && (
                <Link href="/u/scanner" className="block rounded-lg border border-teal-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-teal-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconQrcode className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Escáner QR</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Escanea invitaciones y otros códigos operativos. (No registra entrada/salida).</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm ml-8 sm:ml-9">Abrir escáner →</div>
                </Link>
              )}
              <Link href="/u/checklist" className="block rounded-lg border border-amber-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-amber-800/60 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <IconListCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Ver mi lista de tareas</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Revisa tus tareas del día, marca las completadas y sigue tu progreso.</p>
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm ml-8 sm:ml-9">Ver mis tareas →</div>
              </Link>
              {session.role === 'STAFF' && (
                <Link href="/u/birthdays" className="block rounded-lg border border-pink-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-pink-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconCake className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Gestión de Cumpleaños</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Administra tokens y ofertas de cumpleaños.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 text-sm ml-8 sm:ml-9">Gestionar cumpleaños →</div>
                </Link>
              )}
              {isStaff && (
                <Link href="/u/tokens" className="block rounded-lg border border-emerald-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-emerald-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconDice6 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Control Ruleta</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Gestiona los tokens y premios de la ruleta.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm ml-8 sm:ml-9">Administrar ruleta →</div>
                </Link>
              )}
              {session.role === 'STAFF' && (
                <Link href="/u/statics-batches" className="block rounded-lg border border-violet-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-violet-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconPackage className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Lotes Estáticos</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Gestiona lotes de tokens estáticos y sus códigos.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm ml-8 sm:ml-9">Gestionar lotes →</div>
                </Link>
              )}
              {session.role === 'STAFF' && (
                <Link href="/u/sorteos-qr?tab=batches" className="block rounded-lg border border-cyan-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-cyan-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconQrcode className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Sorteos QR</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Visualiza los sorteos QR personalizados y sus detalles.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-sm ml-8 sm:ml-9">Ver sorteos →</div>
                </Link>
              )}
              {session.role === 'STAFF' && hasCartaAccess && (
                <Link href="/u/menu" className="block rounded-lg border border-orange-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-orange-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconGlass className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Gestión de Carta y Pedidos</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Accede al menú y controla pedidos.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm ml-8 sm:ml-9">Gestionar carta →</div>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de Reset de Contraseña */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                    ¡Importante! Cambio de Contraseña Requerido
                  </h3>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                  Por motivos de seguridad, todas las contraseñas han sido reseteadas a tu DNI. 
                  Debes crear una nueva contraseña personal para continuar usando la aplicación.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Tu contraseña actual es tu DNI.</strong> Cámbiala inmediatamente por seguridad.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/u/change-password"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
                  onClick={handleClosePasswordModal}
                >
                  Cambiar Contraseña
                </Link>
                <button
                  onClick={handleClosePasswordModal}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 font-medium transition-colors"
                >
                  Recordar Después
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
