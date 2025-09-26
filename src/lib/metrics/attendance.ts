// Attendance metrics module removed.
// Rationale: business metrics produced misleading zeroed aggregates and have been
// permanently deprecated. This stub intentionally throws if invoked so any
// forgotten import is surfaced during runtime/testing.
// Do not reintroduce without explicit product decision.

export function getAttendanceMetrics(): never {
  throw new Error('attendance metrics removed (getAttendanceMetrics should not be called)');
}
