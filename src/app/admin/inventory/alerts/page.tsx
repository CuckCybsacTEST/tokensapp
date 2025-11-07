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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Alertas de Inventario</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Monitorea el estado de tu inventario y recibe notificaciones importantes
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="btn btn-secondary"
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

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "all"
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            Todas ({totalAlerts})
          </button>
          <button
            onClick={() => setFilter("low_stock")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "low_stock"
                ? "bg-orange-100 text-orange-800 border border-orange-200"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            Stock Bajo ({alerts.filter(a => a.type === "low_stock").length})
          </button>
          <button
            onClick={() => setFilter("expiring")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "expiring"
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            Próximo a Vencer ({alerts.filter(a => a.type === "expiring").length})
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "expired"
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            Vencidos ({alerts.filter(a => a.type === "expired").length})
          </button>
          <button
            onClick={() => setFilter("over_stock")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "over_stock"
                ? "bg-purple-100 text-purple-800 border border-purple-200"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            Stock Excesivo ({alerts.filter(a => a.type === "over_stock").length})
          </button>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              ¡Todo en orden!
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
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
              className={`bg-white dark:bg-slate-800 rounded-lg border p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start">
                <div className="text-2xl mr-4">
                  {getTypeIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">
                      {alert.item.productName}
                      {alert.item.variantName && ` (${alert.item.variantName})`}
                    </h3>
                    <span className="text-sm font-medium px-2 py-1 rounded border">
                      {getTypeLabel(alert.type)}
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 mb-3">
                    {alert.message}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span>
                      <strong>Cantidad actual:</strong> {alert.item.quantity}
                    </span>
                    {alert.item.minStock && (
                      <span>
                        <strong>Mínimo:</strong> {alert.item.minStock}
                      </span>
                    )}
                    {alert.item.maxStock && (
                      <span>
                        <strong>Máximo:</strong> {alert.item.maxStock}
                      </span>
                    )}
                    {alert.item.expiryDate && (
                      <span>
                        <strong>Vence:</strong> {new Date(alert.item.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                    {alert.item.location && (
                      <span>
                        <strong>Ubicación:</strong> {alert.item.location}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
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
