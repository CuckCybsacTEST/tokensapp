const STORY_SEEN_KEY = 'lounge_survive_story_seen';

export function readStorySeen(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORY_SEEN_KEY) === '1';
}

export function writeStorySeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORY_SEEN_KEY, '1');
}