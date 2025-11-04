// Admin home: simple entry points to main modules (no metrics here)
import { cookies } from "next/headers";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";

export default async function AdminDashboard() {
  // Si el usuario es STAFF, redirigimos directamente al panel de control de tokens
  const cookie = cookies().get("admin_session")?.value;
  const session = await verifySessionCookie(cookie);
  if (session?.role === "STAFF") {
    redirect("/admin/tokens");
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Juegos & Sorteos */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="mr-3 p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Juegos & Sorteos</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Gestiona la ruleta, tokens individuales, premios y lotes.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/tokens" className="btn-sm">Ruleta</a>
              <a href="/admin/prizesstatics" className="btn-sm">Tokens Individuales</a>
            </div>
          </div>

          {/* Gestión de Personal */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="mr-3 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gestión de Personal</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Control de asistencia de colaboradores.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/attendance" className="btn-sm">Asistencia</a>
            </div>
          </div>

          {/* Clientes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="mr-3 p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Clientes</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Gestión de la base de clientes.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/customers" className="btn-sm">Clientes</a>
            </div>
          </div>

          {/* Operaciones */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="mr-3 p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Operaciones</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Gestión de tareas, métricas y control de inventario.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/tasks" className="btn-sm">Tareas</a>
              <a href="/admin/inventory/stock" className="btn-sm">Inventario</a>
            </div>
          </div>

          {/* Entretenimiento */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="mr-3 p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-red-600 dark:text-red-400" fill="currentColor">
                  <path d="M12 2l2.09 6.26L20.97 9l-5.18 3.76L17.82 20 12 15.9 6.18 20l2.03-7.24L3.03 9l6.88-.74L12 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Entretenimiento</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Shows, tickets y gestión de cumpleaños.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/shows" className="btn-sm">Shows</a>
              <a href="/admin/birthdays" className="btn-sm">Cumpleaños</a>
            </div>
          </div>

          {/* Comercial */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="mr-3 p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Comercial</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Ofertas, carta del menú y gestión de pedidos.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/offers" className="btn-sm">Ofertas</a>
              <a href="/admin/menu" className="btn-sm">Carta</a>
            </div>
          </div>

          {/* Próximamente */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm opacity-75">
            <div className="flex items-center mb-4">
              <div className="mr-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                <svg className="h-6 w-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Próximamente</h3>
              <span className="ml-2 text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">En desarrollo</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Nuevas funcionalidades en camino.
            </p>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Pedidos musicales • Recompensas • Fidelización
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-xs text-slate-500 dark:text-slate-400 text-center p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center">
            <svg className="h-4 w-4 mr-1 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Última actualización: {new Date().toLocaleString()}
          </div>
        </footer>
      </div>
    </AdminLayout>
  );
}
