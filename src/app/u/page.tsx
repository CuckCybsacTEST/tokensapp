import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function UHome() {
  // Validar sesión de colaborador; si no está logueado, ir a /u/login
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/user/me`, { cache: 'no-store' });
    if (r.status === 401) {
      redirect(`/u/login?next=${encodeURIComponent('/u')}`);
    }
  } catch {}

  // Página de selección de acciones: Escanear QR / Ver lista de tareas
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-6">¿Qué querés hacer?</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/u/scanner" className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-slate-700 dark:bg-slate-800">
            <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Escanear QR</div>
            <p className="text-sm text-gray-600 dark:text-slate-300">Abrí el escáner para registrar tu entrada o salida escaneando el QR global.</p>
            <div className="mt-4 flex items-center gap-3 text-blue-600 dark:text-blue-400 text-sm">
              <span>Abrir escáner →</span>
              <a className="underline text-xs" href="/u/manual">o cargar manualmente</a>
            </div>
          </Link>
          <Link href="/u/checklist" className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-slate-700 dark:bg-slate-800">
            <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Ver lista de tareas</div>
            <p className="text-sm text-gray-600 dark:text-slate-300">Revisá tus tareas del día, marcá las completadas y seguí tu progreso.</p>
            <div className="mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">Ver tareas →</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
