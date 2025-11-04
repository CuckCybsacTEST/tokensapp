-- Verificar datos de trivia en la base de datos
SELECT 'TriviaQuestionSet' as table_name, COUNT(*) as count FROM TriviaQuestionSet
UNION ALL
SELECT 'TriviaQuestion' as table_name, COUNT(*) as count FROM TriviaQuestion
UNION ALL
SELECT 'TriviaAnswer' as table_name, COUNT(*) as count FROM TriviaAnswer
UNION ALL
SELECT 'TriviaPrize' as table_name, COUNT(*) as count FROM TriviaPrize;

-- Verificar sets activos
SELECT id, name, active, createdAt FROM TriviaQuestionSet WHERE active = true;

-- Verificar preguntas por set
SELECT tqs.name as set_name, COUNT(tq.id) as question_count
FROM TriviaQuestionSet tqs
LEFT JOIN TriviaQuestion tq ON tq.questionSetId = tqs.id
GROUP BY tqs.id, tqs.name;

-- Verificar premios activos
SELECT id, name, active, validFrom, validUntil FROM TriviaPrize WHERE active = true;