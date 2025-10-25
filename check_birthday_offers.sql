SELECT id, title, description, category, tags
FROM "Offer"
WHERE LOWER(title) LIKE '%birthday%'
   OR LOWER(title) LIKE '%cumple%'
   OR LOWER(description) LIKE '%birthday%'
   OR LOWER(description) LIKE '%cumple%'
   OR category = 'birthday'
   OR 'birthday' = ANY(tags);