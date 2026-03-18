"use client";
import React, { useState, useEffect } from "react";

type AcceptanceItem = {
  id: string;
  username: string;
  name: string;
  dni: string | null;
  area: string | null;
  jobTitle: string | null;
  versionAccepted: number;
  acceptedAt: string | null;
  accepted: boolean;
};

type AcceptanceStats = {
  total: number;
  accepted: number;
  pending: number;
};

type TabType = "contenido" | "aceptacion";

interface Props {
  regulationName: string;
  regulationParagraphs: string[];
  requiredVersion: number;
}

export default function RegulationsClient({
  regulationName,
  regulationParagraphs,
  requiredVersion,
}: Props) {
  const [tab, setTab] = useState<TabType>("contenido");
  const [items, setItems] = useState<AcceptanceItem[]>([]);
  const [stats, setStats] = useState<AcceptanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filterArea, setFilterArea] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "accepted" | "pending">("all");
  const [searchText, setSearchText] = useState("");

  // Fetch acceptance data when switching to that tab
  useEffect(() => {
    if (tab === "aceptacion" && !loaded) {
      setLoading(true);
      fetch("/api/admin/regulations/acceptance")
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            setItems(data.items);
            setStats(data.stats);
          }
        })
        .finally(() => {
          setLoading(false);
          setLoaded(true);
        });
    }
  }, [tab, loaded]);

  // Unique areas for filter
  const areas = Array.from(new Set(items.map((i) => i.area).filter(Boolean) as string[])).sort();

  // Filtered list
  const filtered = items.filter((i) => {
    if (filterStatus === "accepted" && !i.accepted) return false;
    if (filterStatus === "pending" && i.accepted) return false;
    if (filterArea && i.area !== filterArea) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      if (
        !i.name.toLowerCase().includes(q) &&
        !(i.dni ?? "").toLowerCase().includes(q) &&
        !i.username.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const pct = stats && stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Reglamento Interno
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Versión requerida: <span className="font-semibold">v{requiredVersion}</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
          <button
            onClick={() => setTab("contenido")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "contenido"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            📄 Contenido
          </button>
          <button
            onClick={() => setTab("aceptacion")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "aceptacion"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            ✅ Aceptación
            {stats && (
              <span className="ml-2 text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                {stats.accepted}/{stats.total}
              </span>
            )}
          </button>
        </div>

        {/* TAB: Contenido */}
        {tab === "contenido" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 p-6 md:p-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {regulationName}
              </h2>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <div className="space-y-3">
                {regulationParagraphs.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Aceptación */}
        {tab === "aceptacion" && (
          <div className="space-y-4">
            {/* Stats cards */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Total colaboradores
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {stats.total}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    Aceptaron
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {stats.accepted}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                  <div className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Pendientes
                  </div>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                    {stats.pending}
                  </div>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {stats && stats.total > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Progreso de aceptación
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {pct}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500 bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Buscar nombre, DNI..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Todas las áreas</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">Todos</option>
                  <option value="accepted">✅ Aceptaron</option>
                  <option value="pending">⏳ Pendientes</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                Cargando...
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                          Colaborador
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                          DNI
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                          Área
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                          Versión
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                          Estado
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                          Fecha aceptación
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filtered.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {item.username}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">
                            {item.dni ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {item.area ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-xs font-mono px-2 py-0.5 rounded ${
                                item.accepted
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              }`}
                            >
                              v{item.versionAccepted}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.accepted ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Aceptado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                            {item.acceptedAt
                              ? new Date(item.acceptedAt).toLocaleDateString("es-PE", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                            No se encontraron colaboradores con los filtros aplicados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {[item.area, item.dni].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div>
                          {item.accepted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                              ✅ v{item.versionAccepted}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                              ⏳ v{item.versionAccepted}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.acceptedAt && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Aceptado:{" "}
                          {new Date(item.acceptedAt).toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                      Sin resultados
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Count */}
            {!loading && (
              <div className="text-xs text-slate-400 dark:text-slate-500 text-right">
                Mostrando {filtered.length} de {items.length} colaboradores
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
