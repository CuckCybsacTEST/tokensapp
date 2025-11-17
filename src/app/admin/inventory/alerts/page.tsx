"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";

interface AlertItem {
  id: string;
  type: "low_stock" | "expiring" | "expired" | "over_stock";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  item: {
    id: string;
    productName: string;
    variantName?: string;
    quantity: number;
    minStock?: number;
    maxStock?: number;
    expiryDate?: string;
    location?: string;
  };
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low_stock" | "expiring" | "expired" | "over_stock">("all");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/inventory/alerts");
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "low_stock":
        return "Stock Bajo";
      case "expiring":
        return "Próximo a Vencer";
      case "expired":
        return "Vencido";
      case "over_stock":
        return "Stock Excesivo";
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return "⚠️";
      case "expiring":
        return "⏰";
      case "expired":
        return "🚫";
      case "over_stock":
        return "📦";
      default:
        return "ℹ️";
    }
  };

  const filteredAlerts = alerts.filter(alert =>
    filter === "all" || alert.type === filter
  );

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const highCount = alerts.filter(a => a.severity === "high").length;
  const totalAlerts = alerts.length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">Cargando alertas...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alertas de Inventario</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Monitorea el estado de tu inventario y recibe notificaciones importantes
            </p>
          </div>
          <button
            onClick={fetchAlerts}
            className="btn btn-secondary w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition-colors duration-200"
          >
            Actualizar
          </button>
        </div>

      {/* Resumen de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📊</div>
            <div>
              <div className="text-2xl font-bold">{totalAlerts}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Alertas</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-700 p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🚨</div>
            <div>
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Críticas</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-orange-700 p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚠️</div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{highCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Altas</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">✅</div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {alerts.filter(a => a.severity === "low").length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Bajas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros - Responsive */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              filter === "all"
                ? "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
            }`}
          >
            Todas ({totalAlerts})
          </button>
          <button
            onClick={() => setFilter("low_stock")}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              filter === "low_stock"
                ? "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
            }`}
          >
            Stock Bajo ({alerts.filter(a => a.type === "low_stock").length})
          </button>
          <button
            onClick={() => setFilter("expiring")}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              filter === "expiring"
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
            }`}
          >
            Próximo a Vencer ({alerts.filter(a => a.type === "expiring").length})
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              filter === "expired"
                ? "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
            }`}
          >
            Vencidos ({alerts.filter(a => a.type === "expired").length})
          </button>
          <button
            onClick={() => setFilter("over_stock")}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              filter === "over_stock"
                ? "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
            }`}
          >
            Stock Excesivo ({alerts.filter(a => a.type === "over_stock").length})
          </button>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-5xl mb-4">✅</div>
            <h3 className="text-lg sm:text-xl font-medium text-slate-900 dark:text-white mb-2">
              ¡Todo en orden!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              {filter === "all"
                ? "No hay alertas activas en tu inventario."
                : `No hay alertas de tipo "${getTypeLabel(filter)}".`
              }
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white dark:bg-slate-800 rounded-lg border p-4 sm:p-6 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="text-2xl sm:text-3xl flex-shrink-0">
                  {getTypeIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white break-words">
                      {alert.item.productName}
                      {alert.item.variantName && ` (${alert.item.variantName})`}
                    </h3>
                    <span className="text-xs sm:text-sm font-medium px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                      {getTypeLabel(alert.type)}
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 mb-4 text-sm sm:text-base">
                    {alert.message}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <strong className="text-slate-900 dark:text-white">Cantidad actual:</strong>
                      <span className="font-medium">{alert.item.quantity}</span>
                    </span>
                    {alert.item.minStock && (
                      <span className="flex items-center gap-1">
                        <strong className="text-slate-900 dark:text-white">Mínimo:</strong>
                        <span className="font-medium">{alert.item.minStock}</span>
                      </span>
                    )}
                    {alert.item.maxStock && (
                      <span className="flex items-center gap-1">
                        <strong className="text-slate-900 dark:text-white">Máximo:</strong>
                        <span className="font-medium">{alert.item.maxStock}</span>
                      </span>
                    )}
                    {alert.item.expiryDate && (
                      <span className="flex items-center gap-1">
                        <strong className="text-slate-900 dark:text-white">Vence:</strong>
                        <span className="font-medium">{new Date(alert.item.expiryDate).toLocaleDateString()}</span>
                      </span>
                    )}
                    {alert.item.location && (
                      <span className="flex items-center gap-1 col-span-1 sm:col-span-2 lg:col-span-3">
                        <strong className="text-slate-900 dark:text-white">Ubicación:</strong>
                        <span className="font-medium break-words">{alert.item.location}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-600 pt-2">
                    Alertado el {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </AdminLayout>
  );
}
