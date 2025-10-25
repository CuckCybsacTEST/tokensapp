SELECT
  COUNT(*) as total_tokens,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tokens,
  COUNT(CASE WHEN status = 'redeemed' THEN 1 END) as redeemed_tokens,
  COUNT(CASE WHEN status = 'exhausted' THEN 1 END) as exhausted_tokens,
  COUNT(CASE WHEN "expiresAt" < NOW() THEN 1 END) as expired_tokens
FROM "InviteToken";

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
LIMIT 10;