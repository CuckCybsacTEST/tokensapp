export type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export interface PeriodInfo {
  name: Period;
  startDate: string; // YYYY-MM-DD (UTC inclusive)
  endDate: string;   // YYYY-MM-DD (UTC inclusive)
}

export interface AttendanceMetrics {
  uniquePersons: number;
  totals: { IN: number; OUT: number };
  completedDaysPct: number; // 0..100
  avgDurationMin: number | null;
  heatmapByHour: Array<{ hour: number; in: number; out: number }>;
  byArea: Array<{ area: string | null; present: number; completedPct: number }>;
}

export interface TaskMetrics {
  completionRatePct: number; // 0..100
  fullyCompletedPct: number; // 0..100
  topIncompleteTasks: Array<{ taskId: string; label: string; missingCount: number }>;
  timeToFirstTaskMin: number | null;
  timeToLastTaskMin: number | null;
}

export interface SeriesByDay {
  day: string; // YYYY-MM-DD (UTC)
  in: number;
  out: number;
  uniquePersons: number;
  avgDurationMin: number | null;
  completionRatePct: number; // 0..100
}

export interface MetricsResponse {
  period: PeriodInfo;
  attendance: AttendanceMetrics;
  tasks: TaskMetrics;
  series: { byDay: SeriesByDay[] };
}
