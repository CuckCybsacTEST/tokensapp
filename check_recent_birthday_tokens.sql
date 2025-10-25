SELECT code, "expiresAt", "createdAt", "kind", "status",
       CASE WHEN "expiresAt" < NOW() THEN 'EXPIRED' ELSE 'VALID' END as validity_status
FROM "InviteToken"
ORDER BY "expiresAt" DESC
LIMIT 10;