$env:ATTENDANCE_CUTOFF_HOUR='14'
Write-Host "ATTENDANCE_CUTOFF_HOUR=$env:ATTENDANCE_CUTOFF_HOUR"
npx tsx scripts/recompute-business-day.ts --dry
