import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserSessionCookie } from '@/lib/auth';

export default async function AdminDashboard() {
  const raw = cookies().get('user_session')?.value;
  console.log('Admin page - Raw cookie:', raw ? 'present' : 'null');
  
  const session = await verifyUserSessionCookie(raw);
  console.log('Admin page - Session:', session);
  
  if (!session) {
    console.log('Admin page - No session, redirecting to login');
    redirect('/u/login');
  }
  
  if (session.role === 'STAFF') {
    console.log('Admin page - STAFF user, redirecting to /u');
    redirect('/u');
  }
  
  if (session.role !== 'ADMIN') {
    console.log('Admin page - Non-admin role:', session.role, 'redirecting to login');
    redirect('/u/login');
  }

  console.log('Admin page - Admin access granted for user:', session.userId);

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      <div className='mx-auto max-w-4xl px-4 py-8'>
        <div className='bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 p-6'>
          <div className='flex items-center mb-6'>
            <div className='mr-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
              <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6 text-blue-600 dark:text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl font-bold text-slate-900 dark:text-slate-100'>Panel de Administración</h1>
              <p className='text-sm text-slate-600 dark:text-slate-400 mt-1'>Bienvenido al sistema de control completo</p>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            <a href='/admin/tokens' className='block p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors'>
              <div className='flex items-center mb-2'>
                <svg className='h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
                <h3 className='font-semibold text-slate-900 dark:text-slate-100'>Tokens y Ruleta</h3>
              </div>
              <p className='text-sm text-slate-600 dark:text-slate-400'>Control del sistema de tokens</p>
            </a>

            <a href='/admin/users' className='block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors'>
              <div className='flex items-center mb-2'>
                <svg className='h-5 w-5 text-blue-600 dark:text-blue-400 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
                </svg>
                <h3 className='font-semibold text-slate-900 dark:text-slate-100'>Personal</h3>
              </div>
              <p className='text-sm text-slate-600 dark:text-slate-400'>Gestión de colaboradores</p>
            </a>

            <a href='/admin/birthdays' className='block p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors'>
              <div className='flex items-center mb-2'>
                <svg className='h-5 w-5 text-pink-600 dark:text-pink-400 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 01-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2' />
                </svg>
                <h3 className='font-semibold text-slate-900 dark:text-slate-100'>Cumpleaños</h3>
              </div>
              <p className='text-sm text-slate-600 dark:text-slate-400'>Reservas y gestión</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
