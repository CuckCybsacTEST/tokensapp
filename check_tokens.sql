SELECT
  it.code,
  it.kind,
  it.status,
  it."expiresAt",
  br."celebrantName",
  br.date,
  br.status as reservation_status
FROM "InviteToken" it
JOIN "BirthdayReservation" br ON it."reservationId" = br.id
ORDER BY it."createdAt" DESC
LIMIT 20;