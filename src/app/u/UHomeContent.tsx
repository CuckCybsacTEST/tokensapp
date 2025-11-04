"use client";

import Link from 'next/link';
import { useState } from 'react';
import AutoAttendanceCard from './AutoAttendanceCard';
import CommitmentModal from './CommitmentModal';
import { IconUser, IconListCheck, IconQrcode, IconDice6, IconCake, IconGlass } from '@tabler/icons-react';

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
};

export default function UHomeContent({ session, isStaff, hasCartaAccess, lastType, personName, commitmentAcceptedVersion }: PageProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'work'>('personal');

  const REQUIRED_COMMITMENT_VERSION = 1;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-1 pb-4 sm:pt-2 sm:pb-6">
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
                Trabajo
              </button>
            </nav>
          </div>

          {/* Contenido de las pestañas */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <Link href="/u/profile" className="block rounded-lg border border-blue-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition dark:border-blue-800/60 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <IconUser className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="text-lg font-medium text-gray-900 dark:text-slate-100">Mi Perfil</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 ml-9">Ver mi información personal y cambiar mi contraseña.</p>
                <div className="mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm ml-9">Ver perfil →</div>
              </Link>
              <AutoAttendanceCard initialLastType={lastType} />
              <Link href="/u/checklist" className="block rounded-lg border border-amber-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition dark:border-amber-800/60 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <IconListCheck className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div className="text-lg font-medium text-gray-900 dark:text-slate-100">Ver mi lista de tareas</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 ml-9">Revisa tus tareas del día, marca las completadas y sigue tu progreso.</p>
                <div className="mt-4 inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm ml-9">Ver mis tareas →</div>
              </Link>
              {session.role === 'STAFF' && (
                <Link href="/u/attendance" className="block rounded-lg border border-indigo-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition dark:border-indigo-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconListCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <div className="text-lg font-medium text-gray-900 dark:text-slate-100">Mi Registro de Asistencia</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-9">Revisa tu historial de entradas y salidas del día.</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm ml-9">Ver registro →</div>
                </Link>
              )}
            </div>
          )}

          {activeTab === 'work' && (
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {session.role === 'STAFF' && (
                <Link href="/u/scanner" className="block rounded-lg border border-teal-300/70 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition dark:border-teal-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconQrcode className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Escáner QR</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-9">Escanea invitaciones y otros códigos operativos. (No registra entrada/salida).</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm ml-9">Abrir escáner →</div>
                </Link>
              )}
              {isStaff && (
                <Link href="/u/tokens" className="block rounded-lg border border-emerald-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition dark:border-emerald-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconDice6 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div className="text-lg font-medium text-gray-900 dark:text-slate-100">Control Ruleta</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-9">Gestiona los tokens y premios de la ruleta.</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm ml-9">Administrar ruleta →</div>
                </Link>
              )}
              {session.role === 'STAFF' && (
                <Link href="/u/birthdays" className="block rounded-lg border border-pink-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition dark:border-pink-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconCake className="w-6 h-6 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                    <div className="text-lg font-medium text-gray-900 dark:text-slate-100">Gestión de Cumpleaños</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-9">Administra tokens y ofertas de cumpleaños.</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 text-sm ml-9">Gestionar cumpleaños →</div>
                </Link>
              )}
              {session.role === 'STAFF' && hasCartaAccess && (
                <Link href="/u/menu" className="block rounded-lg border border-orange-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition dark:border-orange-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconGlass className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div className="text-lg font-medium text-gray-900 dark:text-slate-100">Gestión de Carta y Pedidos</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-9">Accede al menú y controla pedidos.</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm ml-9">Gestionar carta →</div>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      <CommitmentModal userId={session.userId} initialAcceptedVersion={commitmentAcceptedVersion} requiredVersion={REQUIRED_COMMITMENT_VERSION} />
    </div>
  );
}