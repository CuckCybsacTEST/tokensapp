export interface Run {
  id: string;
  created_at: string;
  event_id: string;
  display_name: string;
  best_ms: number;
  score: number;
  device_hash?: string;
  session_id?: string;
  meta?: Record<string, any>;
}

export interface SubmitPayload {
  eventId: string;
  displayName: string;
  bestMs: number;
  score: number;
  sessionId?: string;
  deviceHash?: string;
}

export interface LeaderboardResponse {
  runs: Run[];
}

export type Screen = 'intro' | 'story' | 'play' | 'over' | 'rank';

export interface Powerup {
  type: 'beer' | 'heart' | 'copper' | 'silver' | 'gold';
  x: number;
  y: number;
}

export type ObstacleKind = 'clock' | 'money' | 'bottle' | 'shard';

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  kind: ObstacleKind;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  lives: number;
  slowUntil?: number;
}