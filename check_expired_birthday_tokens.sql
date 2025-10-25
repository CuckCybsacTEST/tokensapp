SELECT code, "expiresAt", "createdAt", "kind", "status"
FROM "InviteToken"
WHERE "expiresAt" < NOW()
ORDER BY "expiresAt" DESC
LIMIT 10;