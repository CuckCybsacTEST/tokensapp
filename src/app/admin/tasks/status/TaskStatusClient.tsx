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
      return { text: 'Pendiente', className: 'text-gray-500 bg-gray-50' };
    }

    if (task.measureEnabled) {
      const value = task.status.value;
      const target = task.targetValue;
      const unit = task.unitLabel || '';

      if (target !== null) {
        const completed = value >= target;
        return {
          text: `${value}/${target} ${unit}`,
          className: completed ? 'text-green-700 bg-green-50' : 'text-orange-700 bg-orange-50'
        };
      } else {
        const completed = value > 0;
        return {
          text: `${value} ${unit}`,
          className: completed ? 'text-green-700 bg-green-50' : 'text-orange-700 bg-orange-50'
        };
      }
    } else {
      return task.status.done
        ? { text: 'Completada', className: 'text-green-700 bg-green-50' }
        : { text: 'Pendiente', className: 'text-red-700 bg-red-50' };
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
      <h1 className="text-2xl font-semibold mb-6">Estado de Tareas por Usuario</h1>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="input-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="input-sm"
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          Error: {error}
        </div>
      )}

      {/* Tabla */}
      {data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progreso
                  </th>
                  {data.tasks.map(task => (
                    <th key={task.id} className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      <div className="truncate max-w-[120px]" title={task.label}>
                        {task.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.users.map(user => {
                  const stats = getCompletionStats(user);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {user.area || 'Sin área'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {stats.completed}/{stats.total}
                          </div>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${stats.percentage}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-gray-500">{stats.percentage}%</span>
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
                              <div className="text-xs text-gray-500 mt-1">
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

          {data.users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay usuarios con tareas para mostrar
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="mt-2 text-gray-600">Cargando datos...</div>
        </div>
      )}
    </div>
  );
}