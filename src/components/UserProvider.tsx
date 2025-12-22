"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface UserInfo {
  role: string;
  displayName: string;
  dni?: string | null;
  area?: string | null;
  jobTitle?: string | null;
  code?: string | null;
}

interface UserContextType {
  userInfo: UserInfo | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  userInfo: null,
  loading: true,
  refreshUser: async () => {},
});

export const useUser = () => useContext(UserContext);

export function UserProvider({ children, hasSession = true }: { children: React.ReactNode, hasSession?: boolean }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchUser = async () => {
    if (!hasSession) {
        setUserInfo({ role: 'GUEST', displayName: 'Invitado' });
        setLoading(false);
        return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
      } else {
        setUserInfo({ role: 'GUEST', displayName: 'Invitado' });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      setUserInfo({ role: 'GUEST', displayName: 'Invitado' });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const refreshUser = async () => {
    // Force refresh by ignoring the ref check or resetting it?
    // We can just call fetchUser, but we need to make sure we don't block if it's not actually fetching.
    // Since we reset ref to false in finally, it should be fine to call fetchUser again.
    // However, if we want to force a refresh even if one is in progress (unlikely), we might need to handle that.
    // For now, just calling fetchUser is safe and prevents parallel requests.
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, [hasSession]);

  return (
    <UserContext.Provider value={{ userInfo, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}
