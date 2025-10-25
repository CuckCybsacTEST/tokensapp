SELECT id, title, "validFrom", "validUntil", "availableDays", "startTime", "endTime"
FROM "Offer"
WHERE "validUntil" < NOW() OR "validFrom" > NOW()
ORDER BY "validUntil" DESC
LIMIT 10;