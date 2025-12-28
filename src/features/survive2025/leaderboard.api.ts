import { SubmitPayload, LeaderboardResponse } from './types';
import { EVENT_ID, LEADERBOARD_LIMIT } from './constants';

export async function submitRun(payload: SubmitPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/survive2025', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Error submitting run' };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export async function fetchLeaderboard(eventId: string = EVENT_ID, limit: number = LEADERBOARD_LIMIT): Promise<LeaderboardResponse> {
  try {
    const response = await fetch(`/api/survive2025?eventId=${eventId}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return { runs: [] };
  }
}