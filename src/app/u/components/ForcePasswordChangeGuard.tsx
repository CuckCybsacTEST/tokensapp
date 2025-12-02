'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface ForcePasswordChangeGuardProps {
  required: boolean;
}

const ForcePasswordChangeGuard = ({ required }: ForcePasswordChangeGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const isChangePasswordPage = pathname?.startsWith('/u/change-password') ?? false;

  useEffect(() => {
    if (!required) return;
    if (!pathname) return;
    if (isChangePasswordPage) return;

    const currentUrl = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`
      : pathname;

    router.replace(`/u/change-password?next=${encodeURIComponent(currentUrl || '/u')}`);
  }, [required, pathname, router, isChangePasswordPage]);

  if (!required || !isChangePasswordPage) {
    return null;
  }

  return (
    <div className="mb-4 rounded border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-950/35 dark:text-amber-200">
      Tu contraseña fue restablecida por administración. Debes crear una nueva para continuar.
    </div>
  );
};

export default ForcePasswordChangeGuard;
