SELECT *
FROM xp
WHERE user_id = (
    SELECT id FROM "user" WHERE username = 'asanchez'
);
