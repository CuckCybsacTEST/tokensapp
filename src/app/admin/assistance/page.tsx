"use client";
import AttendanceScannerCore from "@/components/attendance/AttendanceScannerCore";

export default function AssistanceScannerPage() {
  return <AttendanceScannerCore backHref="/admin" loginPath="/u/login" />;
}
