-- Reset sequence for the user table
SELECT setval('user_id_seq', (SELECT MAX(id) FROM "user") + 1);

-- Reset sequence for the questions table
SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions) + 1);

-- Reset sequence for the curriculum_question table
SELECT setval('curriculum_question_id_seq', (SELECT MAX(id) FROM curriculum_question) + 1);

-- Reset sequence for the content_curriculum table
SELECT setval('content_curriculum_id_seq', (SELECT MAX(id) FROM content_curriculum) + 1);

-- Add other tables as needed (only those with data).

