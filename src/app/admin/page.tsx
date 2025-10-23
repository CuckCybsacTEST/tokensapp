// Admin home: simple entry points to main modules (no metrics here)
import { cookies } from "next/headers";
import { verifySessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  // Si el usuario es STAFF, redirigimos directamente al panel de control de tokens
  const cookie = cookies().get("admin_session")?.value;
  const session = await verifySessionCookie(cookie);
  if (session?.role === "STAFF") {
    redirect("/admin/tokens");
  }

  return (
    <div className="space-y-8">
      

      {/* Nueva home con dos funciones principales */}
  <section className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="mr-3 p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Gestión de Tokens</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <a href="/admin/tokens" className="btn">Panel de Control</a>
            <a href="/admin/prizes" className="btn">Gestión de Tokens</a>
            <a href="/admin/batches" className="btn">Lotes</a>
            <a href="/admin/print" className="btn">Impresión</a>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="mr-3 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Gestión de Personal y Actividades</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <a href="/admin/attendance" className="btn">Control de Asistencia</a>
            <a href="/admin/tasks/metrics" className="btn">Métricas de Tareas</a>
            <a href="/admin/users" className="btn">Gestión de Colaboradores</a>
            <a href="/admin/tasks" className="btn">Gestión de tareas</a>
            <a href="/admin/day-brief" className="btn">Brief del día</a>
            <a href="/scanner" className="btn">Escáner</a>
          </div>
        </div>

        {/* Control de Shows Estelares */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="mr-3 p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 text-red-600 dark:text-red-400" fill="currentColor">
                <path d="M12 2l2.09 6.26L20.97 9l-5.18 3.76L17.82 20 12 15.9 6.18 20l2.03-7.24L3.03 9l6.88-.74L12 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Control de Shows Estelares</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 max-w-prose">
            Administra el lineup publicado, imágenes optimizadas, slots, contenido destacado y configuración de tickets que aparece en la landing de marketing.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/shows" className="btn">Shows</a>
            <a href="/admin/tickets" className="btn">Tickets</a>
            <a href="/marketing#shows" className="btn-secondary text-xs px-3 py-2">Ver en marketing</a>
          </div>
        </div>

        {/* Gestión de Cumpleaños */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="mr-3 p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15a4 4 0 01-4 4H7a4 4 0 110-8h10a4 4 0 014 4zM8 7v.01M12 7v.01M16 7v.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Gestión de Cumpleaños</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <a href="/admin/birthdays" className="btn">Reservas</a>
            <a href="/admin/birthdays/referrers" className="btn">Referrers</a>
            <a href="/admin/birthdays/referrers/metrics" className="btn">Métricas</a>
          </div>
        </div>

        {/* Gestión de Inventario */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="mr-3 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Gestión de Inventario</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 max-w-prose">
            Controla proveedores, stock de productos, alertas de inventario y unidades de medida.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/inventory/suppliers" className="btn">Proveedores</a>
            <a href="/admin/inventory/stock" className="btn">Control de Stock</a>
            <a href="/admin/inventory/alerts" className="btn">Alertas</a>
            <a href="/admin/inventory/units" className="btn">Unidades</a>
          </div>
        </div>

        {/* Gestión de la Carta */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="mr-3 p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Gestión de Restaurante</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 max-w-prose">
            Administra mesas, carta del menú, pedidos y operaciones del restaurante.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/mesas" className="btn">Gestión de Mesas</a>
            <a href="/admin/menu" className="btn">Gestión de Menú</a>
            <a href="/admin/pedidos" className="btn">Panel de Pedidos</a>
            <a href="/menu" className="btn-secondary text-xs px-3 py-2">Menú Público</a>
          </div>
        </div>

        {/* Próximamente: Gestión de Pedidos Musicales */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="mr-3 p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 19V6l12-2v13" />
                <circle cx="6" cy="19" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Gestión de Pedidos Musicales</h3>
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-200">Próximamente</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn opacity-60 cursor-not-allowed pointer-events-none" aria-disabled="true" title="Disponible próximamente">Próximamente</button>
          </div>
        </div>

        {/* Próximamente: Gestión de Recompensas y Fidelización */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="mr-3 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Gestión de Recompensas y Fidelización</h3>
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-200">Próximamente</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn opacity-60 cursor-not-allowed pointer-events-none" aria-disabled="true" title="Disponible próximamente">Próximamente</button>
          </div>
        </div>
      </section>
      
      {/* (El panel y métricas de tokens ahora viven en /admin/tokens) */}
      
      <footer className="text-xs text-slate-500 dark:text-slate-400 text-center p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Última actualización: {new Date().toLocaleString()}
        </div>
      </footer>
    </div>
  );
}
