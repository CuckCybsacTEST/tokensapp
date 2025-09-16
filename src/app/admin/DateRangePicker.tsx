"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';

const PERIODS = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  THIS_WEEK: "this_week",
  LAST_WEEK: "last_week",
  THIS_MONTH: "this_month",
  LAST_MONTH: "last_month",
  CUSTOM: "custom"
};

export default function DateRangePicker({ onPeriodChange }: { onPeriodChange: (period: string, startDate?: string, endDate?: string) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [period, setPeriod] = useState(PERIODS.THIS_WEEK);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const handlePeriodSelect = async (selectedPeriod: string) => {
    setPeriod(selectedPeriod);
    setIsOpen(false);
    
    if (selectedPeriod !== PERIODS.CUSTOM) {
      await onPeriodChange(selectedPeriod);
    }
  };
  
  const handleCustomDateApply = async () => {
    if (startDate && endDate) {
      await onPeriodChange(PERIODS.CUSTOM, startDate, endDate);
      setIsOpen(false);
    }
  };
  
  const getPeriodDisplayName = (periodKey: string) => {
    switch (periodKey) {
      case PERIODS.TODAY: return "Hoy";
      case PERIODS.YESTERDAY: return "Ayer";
      case PERIODS.THIS_WEEK: return "Esta semana";
      case PERIODS.LAST_WEEK: return "Semana anterior";
      case PERIODS.THIS_MONTH: return "Este mes";
      case PERIODS.LAST_MONTH: return "Mes anterior";
      case PERIODS.CUSTOM: return "Personalizado";
      default: return "Esta semana";
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-purple-500 dark:text-purple-400"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>{getPeriodDisplayName(period)}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl">
          <div className="p-3">
            <div className="grid grid-cols-1 gap-1.5">
              <button
                className={`w-full rounded-md p-2.5 text-left text-sm font-medium flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${period === PERIODS.TODAY ? 'bg-slate-100 dark:bg-slate-700/70 text-purple-600 dark:text-purple-400' : ''}`}
                onClick={() => handlePeriodSelect(PERIODS.TODAY)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Hoy
              </button>
              <button
                className={`w-full rounded-md p-2.5 text-left text-sm font-medium flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${period === PERIODS.YESTERDAY ? 'bg-slate-100 dark:bg-slate-700/70 text-purple-600 dark:text-purple-400' : ''}`}
                onClick={() => handlePeriodSelect(PERIODS.YESTERDAY)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Ayer
              </button>
              <button
                className={`w-full rounded-md p-2.5 text-left text-sm font-medium flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${period === PERIODS.THIS_WEEK ? 'bg-slate-100 dark:bg-slate-700/70 text-purple-600 dark:text-purple-400' : ''}`}
                onClick={() => handlePeriodSelect(PERIODS.THIS_WEEK)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zm11 14V6H4v10h12z" clipRule="evenodd" />
                </svg>
                Esta semana
              </button>
              <button
                className={`w-full rounded-md p-2.5 text-left text-sm font-medium flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${period === PERIODS.LAST_WEEK ? 'bg-slate-100 dark:bg-slate-700/70 text-purple-600 dark:text-purple-400' : ''}`}
                onClick={() => handlePeriodSelect(PERIODS.LAST_WEEK)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zm11 14V6H4v10h12z" clipRule="evenodd" />
                </svg>
                Semana anterior
              </button>
              <button
                className={`w-full rounded-md p-2.5 text-left text-sm font-medium flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${period === PERIODS.THIS_MONTH ? 'bg-slate-100 dark:bg-slate-700/70 text-purple-600 dark:text-purple-400' : ''}`}
                onClick={() => handlePeriodSelect(PERIODS.THIS_MONTH)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                Este mes
              </button>
              <button
                className={`w-full rounded-md p-2.5 text-left text-sm font-medium flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${period === PERIODS.LAST_MONTH ? 'bg-slate-100 dark:bg-slate-700/70 text-purple-600 dark:text-purple-400' : ''}`}
                onClick={() => handlePeriodSelect(PERIODS.LAST_MONTH)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                Mes anterior
              </button>
              
              <hr className="my-2 border-slate-200 dark:border-slate-600" />
              
              <div className={`space-y-2 ${period === PERIODS.CUSTOM ? 'bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600' : ''}`}>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="custom"
                    name="period"
                    className="mr-2 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    checked={period === PERIODS.CUSTOM}
                    onChange={() => setPeriod(PERIODS.CUSTOM)}
                  />
                  <label htmlFor="custom" className="text-sm font-medium">
                    Personalizado
                  </label>
                </div>
                
                {(period === PERIODS.CUSTOM) && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Desde</label>
                        <input
                          type="date"
                          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Hasta</label>
                        <input
                          type="date"
                          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <button
                      className="w-full rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      onClick={handleCustomDateApply}
                      disabled={!startDate || !endDate}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
