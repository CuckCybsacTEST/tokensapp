'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';

interface Customer {
  id: string;
  dni: string;
  name: string;
  email: string | null;
  phone: string;
  whatsapp: string | null;
  birthday: string | null;
  membershipLevel: string;
  points: number;
  totalSpent: number;
  visitCount: number;
  lastVisit: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CustomerSession {
  expiresAt: string;
  lastActivity: string;
}

interface AuthState {
  customer: Customer | null;
  session: CustomerSession | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (dni: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    customer: null,
    session: null,
    loading: true,
    error: null
  });

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/customer/auth/me');

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setAuthState({
            customer: data.customer,
            session: data.session,
            loading: false,
            error: null
          });
        } else {
          setAuthState({
            customer: null,
            session: null,
            loading: false,
            error: null
          });
        }
      } else {
        setAuthState({
          customer: null,
          session: null,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      setAuthState({
        customer: null,
        session: null,
        loading: false,
        error: 'Error de conexión'
      });
    }
  };

  const login = async (dni: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni })
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setAuthState({
          customer: data.customer,
          session: null, // Will be set by checkAuth
          loading: false,
          error: null
        });
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.message || 'Error al iniciar sesión'
        }));
        return false;
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Error de conexión'
      }));
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/customer/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setAuthState({
        customer: null,
        session: null,
        loading: false,
        error: null
      });
    }
  };

  const refresh = async () => {
    await checkAuth();
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    refresh
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}