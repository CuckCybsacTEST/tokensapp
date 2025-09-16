"use client";

import { useState } from 'react';
import DateRangePicker from './DateRangePicker';
import StatCard from './StatCard';

export default function MetricsDashboard({ initialMetrics }: { initialMetrics: any }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isLoading, setIsLoading] = useState(false);

  const handlePeriodChange = async (period: string, startDate?: string, endDate?: string) => {
    setIsLoading(true);
    try {
      // Construir la URL con los parámetros de consulta
      const queryParams = new URLSearchParams();
      queryParams.append('period', period);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const response = await fetch(`/api/admin/metrics?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Error al cargar métricas');
      
      const newMetrics = await response.json();
      setMetrics(newMetrics);
    } catch (error) {
      console.error('Error al cambiar el período:', error);
      // Mostrar un mensaje al usuario
    } finally {
      setIsLoading(false);
    }
  };

  const pct = (part: number) => (metrics.total ? ((part / metrics.total) * 100).toFixed(1) + "%" : "-");
  
  // Formatear fecha para mostrar
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
      {/* Métricas generales en tarjetas principales */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center">
            <div className="mr-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </div>
            Métricas Globales
          </h2>
          <div className="text-xs px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full font-medium">
            Datos en tiempo real
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-700/80 p-5 rounded-xl border border-blue-100 dark:border-slate-600 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="flex-1 bg-white/80 dark:bg-slate-800/50 p-4 rounded-lg shadow-sm">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1 block">Total de Tokens</span>
                <div className="text-3xl font-bold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {metrics.total.toLocaleString()}
                </div>
              </div>
              <div className="flex-1 bg-white/80 dark:bg-slate-800/50 p-4 rounded-lg shadow-sm">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1 block">Activos / Disponibles</span>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {metrics.active.toLocaleString()} 
                  <span className="text-sm text-slate-500 ml-2">({pct(metrics.active)})</span>
                </div>
              </div>
              <div className="flex-1 bg-white/80 dark:bg-slate-800/50 p-4 rounded-lg shadow-sm">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1 block">Stock Pendiente</span>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {metrics.pending.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        
          <StatCard
            label="Tokens Canjeados"
            value={metrics.redeemed}
            description={pct(metrics.redeemed) + " del total"}
            color="text-emerald-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <StatCard
            label="Tokens Expirados"
            value={metrics.expired}
            description={pct(metrics.expired) + " del total"}
            color="text-amber-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Emitidos Históricos"
            value={metrics.emittedAggregate}
            description="Total acumulado"
            color="text-indigo-600"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        </div>
      </div>
      
      {/* Métricas por período con filtro de fechas */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 mb-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold flex items-center">
            <div className="mr-3 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            Métricas del Período
          </h2>
          <div className="bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 rounded-lg p-1">
            <DateRangePicker onPeriodChange={handlePeriodChange} />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 animate-pulse">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando datos...</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 px-5 py-3 rounded-lg border border-purple-100 dark:border-purple-900/30">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-purple-800 dark:text-purple-300">
                  Período: {metrics.period.name === 'custom' 
                    ? `${formatDate(metrics.period.startDate)} - ${formatDate(metrics.period.endDate)}`
                    : metrics.period.name === 'today' ? 'Hoy'
                    : metrics.period.name === 'yesterday' ? 'Ayer'
                    : metrics.period.name === 'this_week' ? 'Esta semana'
                    : metrics.period.name === 'last_week' ? 'Semana anterior'
                    : metrics.period.name === 'this_month' ? 'Este mes'
                    : metrics.period.name === 'last_month' ? 'Mes anterior'
                    : 'Personalizado'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <StatCard 
                label="Tokens Creados" 
                value={metrics.period.tokens} 
                description="En este período" 
                compact 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              />
              <StatCard 
                label="Tokens Canjeados" 
                value={metrics.period.redeemed} 
                description="En este período" 
                color="text-emerald-600"
                compact 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              />
              <StatCard 
                label="Sesiones Ruleta" 
                value={metrics.period.rouletteSessions} 
                description="En este período" 
                color="text-amber-600"
                compact 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              />
              <StatCard 
                label="Giros Ruleta" 
                value={metrics.period.rouletteSpins} 
                description="En este período" 
                color="text-fuchsia-600"
                compact 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
