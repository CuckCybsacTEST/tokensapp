'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/lib/hooks/use-customer-auth';

interface CustomerProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function CustomerProtectedRoute({
  children,
  redirectTo = '/login'
}: CustomerProtectedRouteProps) {
  const { customer, loading } = useCustomerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !customer) {
      router.push(redirectTo);
    }
  }, [customer, loading, router, redirectTo]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!customer) {
    return null;
  }

  return <>{children}</>;
}