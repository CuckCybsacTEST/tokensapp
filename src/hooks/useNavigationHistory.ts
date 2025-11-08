"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const STORAGE_KEY = 'u_navigation_history';
const MAX_HISTORY_ITEMS = 10;

export function useNavigationHistory() {
  const pathname = usePathname();
  const router = useRouter();
  const [history, setHistory] = useState<string[]>([]);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedHistory = JSON.parse(stored) as string[];
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.warn('Failed to load navigation history:', error);
    }
  }, []);

  // Update history when pathname changes (but not when navigating back)
  useEffect(() => {
    if (pathname && pathname.startsWith('/u') && !isNavigatingBack) {
      setHistory(prev => {
        // If history is empty and we're not on /u, initialize with /u first
        if (prev.length === 0 && pathname !== '/u') {
          return ['/u', pathname];
        }

        // If history is empty and we're on /u, just initialize with /u
        if (prev.length === 0) {
          return [pathname];
        }

        // Remove current path if it exists elsewhere in history
        const filtered = prev.filter(path => path !== pathname);
        // Add current path to the end
        const newHistory = [...filtered, pathname].slice(-MAX_HISTORY_ITEMS);
        return newHistory;
      });
    }

    // Reset the flag after navigation
    if (isNavigatingBack) {
      setIsNavigatingBack(false);
    }
  }, [pathname, isNavigatingBack]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save navigation history:', error);
    }
  }, [history]);

  // Get the previous page
  const getPreviousPage = (): string | null => {
    if (history.length < 2) return null;
    // The last item is current page, second to last is previous
    return history[history.length - 2] || null;
  };

  // Navigate back
  const navigateBack = () => {
    const previousPage = getPreviousPage();
    if (previousPage) {
      setIsNavigatingBack(true);
      router.push(previousPage);
    } else {
      router.push('/u');
    }
  };

  return {
    history,
    getPreviousPage,
    navigateBack,
    currentPath: pathname
  };
}