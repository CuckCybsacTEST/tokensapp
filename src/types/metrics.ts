export type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

export interface PeriodInfo {
  name: Period;
  startDate: string; // YYYY-MM-DD (UTC inclusive)
  endDate: string;   // YYYY-MM-DD (UTC inclusive)
}

// (Legacy metrics types removed)
