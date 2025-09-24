// Minimal shims for test-only import aliases that reference routes or test helpers
// IMPORTANT: Do NOT declare modules for real source libraries (auth, featureFlags, batchStats, birthdays) to avoid masking exports.
// If tests outside src need these, they should use relative paths or be moved under src.
declare module '@/test/setupTestDb' { const v: any; export = v; }