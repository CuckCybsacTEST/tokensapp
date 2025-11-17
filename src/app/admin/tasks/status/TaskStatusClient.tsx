"use client";

import React, { useEffect, useState } from 'react';
import { ALLOWED_AREAS } from '@/lib/areas';

type TaskStatus = {
  taskId: string;
  label: string;
  priority: number;
  measureEnabled: boolean;
  targetValue: number | null;
  unitLabel: string | null;
  status: {
    done: boolean;
    value: number;
    updatedAt: string;
    updatedBy: string | null;
  } | null;
};

type UserTaskStatus = {
  id: string;
  code: string;
  name: string;
  area: string | null;
  username: string | null;
  tasks: TaskStatus[];
};

type TaskStatusResponse = {
  ok: boolean;
  day: string;
  area: string;
  tasks: { id: string; label: string }[];
  users: UserTaskStatus[];
};

export function TaskStatusPage() {
  const [data, setData] = useState<TaskStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [selectedArea, setSelectedArea] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        day: selectedDay,
        ...(selectedArea && { area: selectedArea })
      });
      const res = await fetch(`/api/admin/tasks/status?${params}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.code || 'Error loading data');
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDay, selectedArea]);

  const getStatusDisplay = (task: TaskStatus) => {
    if (!task.status) {
      return { text: 'Pendiente', className: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700' };
    }

    if (task.measureEnabled) {
      const value = task.status.value;
      const target = task.targetValue;
      const unit = task.unitLabel || '';

      if (target !== null) {
        const completed = value >= target;
        return {
          text: `${value}/${target} ${unit}`,
          className: completed ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20' : 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20'
        };
      } else {
        const completed = value > 0;
        return {
          text: `${value} ${unit}`,
          className: completed ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20' : 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20'
        };
      }
    } else {
      return task.status.done
        ? { text: 'Completada', className: 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20' }
        : { text: 'Pendiente', className: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20' };
    }
  };

  const getCompletionStats = (user: UserTaskStatus) => {
    const total = user.tasks.length;
    const completed = user.tasks.filter(t => {
      if (!t.status) return false;
      if (t.measureEnabled) {
        return t.targetValue !== null ? t.status.value >= t.targetValue : t.status.value > 0;
      }
      return t.status.done;
    }).length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6 text-slate-900 dark:text-slate-100">Estado de Tareas por Usuario</h1>

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Día</label>
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="input-sm w-full sm:w-auto border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Área</label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="input-sm w-full sm:w-auto border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">Todas las áreas</option>
            {ALLOWED_AREAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded disabled:opacity-50 transition-colors"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
          Error: {error}
        </div>
      )}

      {/* Vista móvil: tarjetas */}
      <div className="md:hidden space-y-4">
        {data && data.users.map(user => {
          const stats = getCompletionStats(user);
          return (
            <div key={user.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">@{user.username}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{user.area || 'Sin área'}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {stats.completed}/{stats.total}
                  </div>
                  <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{stats.percentage}%</span>
                </div>
              </div>

              <div className="space-y-2">
                {user.tasks.map(task => {
                  const status = getStatusDisplay(task);
                  return (
                    <div key={task.taskId} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={task.label}>
                          {task.label}
                        </div>
                        {task.status && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(task.status.updatedAt).toLocaleTimeString()}
                            {task.status.updatedBy && ` por ${task.status.updatedBy}`}
                          </div>
                        )}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${status.className}`}>
                        {status.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Área
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Progreso
                </th>
                {data?.tasks.map(task => (
                  <th key={task.id} className="px-2 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[120px]">
                    <div className="truncate max-w-[120px]" title={task.label}>
                      {task.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {data?.users.map(user => {
                const stats = getCompletionStats(user);
                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {user.area || 'Sin área'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {stats.completed}/{stats.total}
                        </div>
                        <div className="ml-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{stats.percentage}%</span>
                      </div>
                    </td>
                    {user.tasks.map(task => {
                      const status = getStatusDisplay(task);
                      return (
                        <td key={task.taskId} className="px-2 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
                            {status.text}
                          </span>
                          {task.status && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {new Date(task.status.updatedAt).toLocaleTimeString()}
                              {task.status.updatedBy && ` por ${task.status.updatedBy}`}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.users.length === 0 && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No hay usuarios con tareas para mostrar
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="mt-2 text-slate-600 dark:text-slate-400">Cargando datos...</div>
        </div>
      )}
    </div>
  );
}