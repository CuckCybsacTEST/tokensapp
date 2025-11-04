"use client";

import { AdminLayout } from "@/components/AdminLayout";

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
}

export function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
  return <AdminLayout>{children}</AdminLayout>;
}