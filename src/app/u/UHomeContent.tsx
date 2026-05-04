"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import SharedAutoAttendanceCard from '@/components/attendance/SharedAutoAttendanceCard';
import { IconUser, IconListCheck, IconQrcode, IconDice6, IconCake, IconGlass, IconPackage, IconShieldLock, IconClipboardCheck, IconRefresh, IconBell, IconVideo, IconConfetti } from '@tabler/icons-react';

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
  userArea?: string | null;
};

export default function UHomeContent({ session, isStaff, hasCartaAccess, lastType, personName, commitmentAcceptedVersion, hasDefaultPassword = false, userArea }: PageProps) {
  const isCoordinator = ['COORDINATOR', 'ADMIN'].includes(session.role);
  const hasReusableTokensAccess = isCoordinator || (isStaff && (userArea === 'Animación' || userArea === 'Multimedia'));
  const [activeTab, setActiveTab] = useState<'today' | 'personal' | 'work' | 'cumpleanos' | 'novedades'>('today');
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  // Cumpleaños state
  interface StaffBirthday {
    personId: string;
    name: string;
    area: string | null;
    jobTitle: string | null;
    birthdayMonth: number;
    birthdayDay: number;
    birthdayThisYear: string;
    group: 'today' | 'thisWeek' | 'thisMonth';
  }
  const [birthdayItems, setBirthdayItems] = useState<StaffBirthday[]>([]);
  const [birthdayLoading, setBirthdayLoading] = useState(false);
  const [birthdayLoaded, setBirthdayLoaded] = useState(false);
  const [todayBirthdayCount, setTodayBirthdayCount] = useState(0);

  // Fetch today count on mount for badge
  useEffect(() => {
    fetch('/api/user/notifications/staff-birthdays')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.ok) setTodayBirthdayCount(d.meta.todayCount);
      })
      .catch(() => {});
  }, []);

  const fetchBirthdays = async () => {
    if (birthdayLoaded) return;
    setBirthdayLoading(true);
    try {
      const res = await fetch('/api/user/notifications/staff-birthdays');
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setBirthdayItems(data.birthdays);
          setTodayBirthdayCount(data.meta.todayCount);
        }
      }
    } catch {}
    finally {
      setBirthdayLoading(false);
      setBirthdayLoaded(true);
    }
  };

  // Novedades (inbox) state
  interface InboxItem {
    id: string;
    title: string;
    status: string;
    mandatory: boolean;
    assignedAt: string;
    completedAt: string | null;
    preview: string;
    content: string | null;
  }
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxLoaded, setInboxLoaded] = useState(false);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending count on mount for badge
  useEffect(() => {
    fetch('/api/user/commitment/inbox')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.ok) setPendingCount(d.items.filter((i: InboxItem) => i.status === 'PENDING').length);
      })
      .catch(() => {});
  }, []);

  const fetchInbox = async () => {
    if (inboxLoaded) return;
    setInboxLoading(true);
    try {
      const res = await fetch('/api/user/commitment/inbox');
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setInboxItems(data.items);
          setPendingCount(data.items.filter((i: InboxItem) => i.status === 'PENDING').length);
        }
      }
    } catch {}
    finally {
      setInboxLoading(false);
      setInboxLoaded(true);
    }
  };

  // Mark a non-mandatory comunicado as read when expanded
  const markAsRead = async (item: InboxItem) => {
    if (item.status !== 'PENDING' || item.mandatory) return;
    try {
      const res = await fetch('/api/user/commitment/inbox/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: item.id }),
      });
      if (res.ok) {
        const now = new Date().toISOString();
        setInboxItems(prev =>
          prev.map(i => i.id === item.id ? { ...i, status: 'COMPLETED', completedAt: now } : i)
        );
        setPendingCount(prev => Math.max(0, prev - 1));
      }
    } catch {}
  };

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

  // Añadir animación personalizada para resaltar el checklist
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .highlight-bounce {
        animation: highlightBounce 4s infinite;
      }
      @keyframes highlightBounce {
        0% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
        100% { transform: translateY(0); }
      }
      @keyframes fabPing {
        0%   { transform: scale(1);   opacity: .55; }
        70%  { transform: scale(1.55); opacity: 0; }
        100% { transform: scale(1.55); opacity: 0; }
      }
      .animate-fab-ping {
        animation: fabPing 2.4s cubic-bezier(0,.6,.4,1) infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
            <nav className="-mb-px flex justify-around">
              {/* Hoy */}
              <button
                title="Hoy"
                onClick={() => setActiveTab('today')}
                className={`py-3 px-4 border-b-2 ${
                  activeTab === 'today'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Mi Perfil */}
              <button
                title="Mi Perfil"
                onClick={() => setActiveTab('personal')}
                className={`py-3 px-4 border-b-2 ${
                  activeTab === 'personal'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {/* Herramientas */}
              <button
                title="Herramientas"
                onClick={() => setActiveTab('work')}
                className={`py-3 px-4 border-b-2 ${
                  activeTab === 'work'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Aniversarios */}
              <button
                title="Aniversarios del equipo"
                onClick={() => { setActiveTab('cumpleanos'); fetchBirthdays(); }}
                className={`py-3 px-4 border-b-2 relative ${
                  activeTab === 'cumpleanos'
                    ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                    : todayBirthdayCount > 0
                      ? 'border-transparent text-pink-500 dark:text-pink-400'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
                </svg>
                {todayBirthdayCount > 0 && (
                  <span className="absolute top-1.5 right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
                  </span>
                )}
              </button>

              {/* Novedades */}
              <button
                title="Novedades"
                onClick={() => { setActiveTab('novedades'); fetchInbox(); }}
                className={`py-3 px-4 border-b-2 relative ${
                  activeTab === 'novedades'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : pendingCount > 0
                      ? 'border-transparent text-amber-500 dark:text-amber-400'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute top-1.5 right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Contenido de las pestañas */}
          <div className="min-h-[420px]">
          {activeTab === 'today' && (
            <div className="grid grid-cols-1 gap-3 sm:gap-6">
              <SharedAutoAttendanceCard initialLastType={lastType} basePath="/u" />

              <Link href="/u/daily-evaluation" className="block rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-5 shadow-md hover:shadow-lg transition-all ring-1 ring-emerald-200/50 dark:border-emerald-600 dark:from-emerald-900/20 dark:to-teal-900/20 dark:ring-emerald-700/30">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/40">
                    <IconClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-semibold text-emerald-900 dark:text-emerald-100">Jornada</div>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 ml-12 sm:ml-[52px]">Revisa lo que tenemos hoy o verifica datos de jornadas pasadas.</p>
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium text-sm ml-12 sm:ml-[52px]">Ver jornada →</div>
              </Link>

              <Link href="/u/checklist" className="block rounded-lg border border-amber-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-amber-800/60 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <IconListCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Ver mi lista de tareas</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Revisa tus tareas del día, marca las completadas y sigue tu progreso.</p>
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm ml-8 sm:ml-9">Ver mis tareas →</div>
              </Link>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 gap-3 sm:gap-6">

              <Link href="/u/profile" className="block rounded-lg border border-blue-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-blue-800/60 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <IconUser className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Mi Perfil</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Ver mi información personal y cambiar mi contraseña.</p>
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm ml-8 sm:ml-9">Ver perfil →</div>
              </Link>

              {isStaff && (
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
              <Link href="/u/scanner" className="block rounded-lg border border-teal-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-teal-800/60 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <IconQrcode className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                  <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Escáner QR</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Escanea invitaciones y otros códigos operativos. (No registra entrada/salida).</p>
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm ml-8 sm:ml-9">Abrir escáner →</div>
              </Link>
              {isCoordinator && (
                <Link href="/u/equipo" className="block rounded-lg border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-slate-50 p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-indigo-700/60 dark:from-indigo-900/20 dark:to-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconUser className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-semibold text-indigo-900 dark:text-indigo-100">Gestión de Equipo</div>
                  </div>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 ml-8 sm:ml-9">Edita datos, cumpleaños y áreas de colaboradores, o elimina usuarios que ya no trabajen con nosotros.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-sm ml-8 sm:ml-9">Gestionar equipo →</div>
                </Link>
              )}
              {isStaff && (
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
              {isStaff && (
                <Link href="/u/statics-batches" className="block rounded-lg border border-violet-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-violet-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconPackage className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Lotes Estáticos</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Gestiona lotes de tokens estáticos y sus códigos.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm ml-8 sm:ml-9">Gestionar lotes →</div>
                </Link>
              )}
              {isStaff && (
                <Link href="/u/sorteos-qr?tab=batches" className="block rounded-lg border border-cyan-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-cyan-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconQrcode className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Sorteos QR</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Visualiza los sorteos QR personalizados y sus detalles.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-sm ml-8 sm:ml-9">Ver sorteos →</div>
                </Link>
              )}
              {hasReusableTokensAccess && (
                <Link href="/u/reusable-tokens" className="block rounded-lg border border-purple-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-purple-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconRefresh className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Tokens Reutilizables</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Visualiza grupos de tokens con QR para descargar, compartir y previsualizar.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm ml-8 sm:ml-9">Ver tokens →</div>
                </Link>
              )}
              {isStaff && hasCartaAccess && (
                <Link href="/u/menu" className="block rounded-lg border border-orange-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-orange-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconGlass className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Gestión de Carta y Pedidos</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Accede al menú y controla pedidos.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm ml-8 sm:ml-9">Gestionar carta →</div>
                </Link>
              )}
              {isStaff && (
                <Link href="/u/producciones" className="block rounded-lg border border-pink-200 bg-white p-3 sm:p-5 shadow-sm hover:shadow-md transition dark:border-pink-800/60 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <IconVideo className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                    <div className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">Producción Multimedia</div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 ml-8 sm:ml-9">Solicita, consulta y da seguimiento a reels, videos, fotos y diseños.</p>
                  <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 text-sm ml-8 sm:ml-9">Ver producciones →</div>
                </Link>
              )}
            </div>
          )}

          {/* ====== PESTAÑA ANIVERSARIOS ====== */}
          {activeTab === 'cumpleanos' && (
            <div className="space-y-5">
              {/* Aviso aclaratorio */}
              <div className="flex items-start gap-2.5 rounded-lg bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800/40 px-3.5 py-2.5">
                <svg className="w-4 h-4 text-pink-500 dark:text-pink-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-pink-700 dark:text-pink-300 leading-relaxed">
                  Estos son los <strong>cumpleaños del equipo de trabajo</strong>. No tiene relación con las reservas o cumpleaños de clientes.
                </p>
              </div>
              {birthdayLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
                </div>
              ) : birthdayItems.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <IconCake className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No hay aniversarios de colaboradores este mes.</p>
                </div>
              ) : (
                <>
                  {/* HOY */}
                  {birthdayItems.filter(b => b.group === 'today').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-xl">🎂</span>
                        <h3 className="text-sm font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wide">Hoy</h3>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                          {birthdayItems.filter(b => b.group === 'today').length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {birthdayItems.filter(b => b.group === 'today').map(b => (
                          <BirthdayCard key={b.personId} item={b} highlight />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ESTA SEMANA */}
                  {birthdayItems.filter(b => b.group === 'thisWeek').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-base">📅</span>
                        <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Esta semana</h3>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {birthdayItems.filter(b => b.group === 'thisWeek').length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {birthdayItems.filter(b => b.group === 'thisWeek').map(b => (
                          <BirthdayCard key={b.personId} item={b} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ESTE MES */}
                  {birthdayItems.filter(b => b.group === 'thisMonth').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-base">🗓️</span>
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Este mes</h3>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {birthdayItems.filter(b => b.group === 'thisMonth').length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {birthdayItems.filter(b => b.group === 'thisMonth').map(b => (
                          <BirthdayCard key={b.personId} item={b} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ====== PESTAÑA NOVEDADES ====== */}
          {activeTab === 'novedades' && (
            <div className="space-y-3">
              {inboxLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : inboxItems.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <IconBell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No tienes comunicados aún.</p>
                </div>
              ) : (
                inboxItems.map(item => (
                  <div key={item.id}>
                    <button
                      onClick={() => {
                        const isOpening = openItemId !== item.id;
                        setOpenItemId(isOpening ? item.id : null);
                        if (isOpening) markAsRead(item);
                      }}
                      className="w-full text-left rounded-xl border bg-white dark:bg-slate-800 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          item.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {item.status === 'PENDING' ? '📢' : '✅'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</h4>
                            {item.status === 'PENDING' && (
                              <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                Pendiente
                              </span>
                            )}
                            {item.mandatory && (
                              <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                Obligatorio
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.preview}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {new Date(item.assignedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {item.completedAt && (
                              <span className="text-[10px] text-green-600 dark:text-green-400">
                                Leído {new Date(item.completedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform ${openItemId === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {openItemId === item.id && item.content && (
                      <div className="mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 sm:p-5">
                        <style jsx global>{`
                          .inbox-content ul { padding-left: 1.5rem; margin: 0.5rem 0; list-style-type: disc; }
                          .inbox-content ol { padding-left: 1.5rem; margin: 0.5rem 0; list-style-type: decimal; }
                          .inbox-content li { margin: 0.25rem 0; }
                          .inbox-content p { margin: 0.5rem 0; }
                          .inbox-content strong, .inbox-content b { font-weight: 700; }
                          .inbox-content em, .inbox-content i { font-style: italic; }
                          .inbox-content u { text-decoration: underline; }
                          .inbox-content br { display: block; content: ""; margin: 0.25rem 0; }
                        `}</style>
                        <div
                          className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 inbox-content"
                          dangerouslySetInnerHTML={{ __html: item.content }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          </div>{/* /min-h wrapper */}
        </div>
      </div>

      {/* FAB Scanner — siempre visible para todos */}
      <Link
        href="/u/scanner"
        className="fab-scanner fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3.5 text-white shadow-lg hover:bg-teal-700 active:scale-95 transition-all duration-150 ring-2 ring-teal-400/30"
        aria-label="Abrir escáner QR"
      >
        <IconQrcode className="w-6 h-6" />
        <span className="text-sm font-semibold hidden sm:inline">Escáner</span>
        {/* Ping ring micro-animation */}
        <span className="pointer-events-none absolute inset-0 rounded-full animate-fab-ping bg-teal-400/40" aria-hidden="true" />
      </Link>

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

// ---------------------------------------------------------------------------
// BirthdayCard — sub-component for rendering a single birthday entry
// ---------------------------------------------------------------------------

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface BirthdayCardProps {
  item: {
    personId: string;
    name: string;
    area: string | null;
    jobTitle: string | null;
    birthdayMonth: number;
    birthdayDay: number;
    group: 'today' | 'thisWeek' | 'thisMonth';
  };
  highlight?: boolean;
}

function BirthdayCard({ item, highlight = false }: BirthdayCardProps) {
  const month = MONTHS_ES[(item.birthdayMonth - 1) % 12];
  const label = `${item.birthdayDay} de ${month}`;
  const meta = [item.area, item.jobTitle].filter(Boolean).join(' · ');

  if (highlight) {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-pink-300 bg-gradient-to-r from-pink-50 to-rose-50 dark:border-pink-700 dark:from-pink-900/20 dark:to-rose-900/20 p-3 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-800/40 flex items-center justify-center text-xl">
          🎂
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-pink-900 dark:text-pink-100 truncate">{item.name}</p>
          {meta && <p className="text-xs text-pink-700 dark:text-pink-300 truncate">{meta}</p>}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-pink-200 text-pink-800 dark:bg-pink-800/60 dark:text-pink-200">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-base">
        🎁
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
        {meta && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{meta}</p>}
      </div>
      <div className="flex-shrink-0">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{label}</span>
      </div>
    </div>
  );
}
