-- Reset sequence
SELECT setval('curriculum_question_id_seq', (SELECT MAX(id) FROM curriculum_question) + 1);