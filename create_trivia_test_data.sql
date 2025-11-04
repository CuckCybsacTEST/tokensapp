-- Crear datos de prueba para el sistema de trivia
-- Insertar un set de preguntas de ejemplo
INSERT INTO "TriviaQuestionSet" (id, name, description, active, "createdAt", "updatedAt")
VALUES ('test-set-1', 'Trivia de Conocimientos Generales', 'Preguntas sobre cultura general y conocimientos básicos', true, NOW(), NOW());

-- Insertar preguntas para el set
INSERT INTO "TriviaQuestion" (id, "questionSetId", question, active, "order", "createdAt", "updatedAt")
VALUES
  ('q1', 'test-set-1', '¿Cuál es la capital de Francia?', true, 1, NOW(), NOW()),
  ('q2', 'test-set-1', '¿Cuántos planetas tiene el sistema solar?', true, 2, NOW(), NOW()),
  ('q3', 'test-set-1', '¿Quién escribió "Don Quijote de la Mancha"?', true, 3, NOW(), NOW());

-- Insertar respuestas para las preguntas
INSERT INTO "TriviaAnswer" (id, "questionId", answer, "isCorrect", "createdAt", "updatedAt")
VALUES
  -- Pregunta 1: Capital de Francia
  ('a1-1', 'q1', 'París', true, NOW(), NOW()),
  ('a1-2', 'q1', 'Londres', false, NOW(), NOW()),
  ('a1-3', 'q1', 'Madrid', false, NOW(), NOW()),
  ('a1-4', 'q1', 'Roma', false, NOW(), NOW()),

  -- Pregunta 2: Planetas del sistema solar
  ('a2-1', 'q2', '8', true, NOW(), NOW()),
  ('a2-2', 'q2', '9', false, NOW(), NOW()),
  ('a2-3', 'q2', '7', false, NOW(), NOW()),
  ('a2-4', 'q2', '10', false, NOW(), NOW()),

  -- Pregunta 3: Autor de Don Quijote
  ('a3-1', 'q3', 'Miguel de Cervantes', true, NOW(), NOW()),
  ('a3-2', 'q3', 'Gabriel García Márquez', false, NOW(), NOW()),
  ('a3-3', 'q3', 'Pablo Neruda', false, NOW(), NOW()),
  ('a3-4', 'q3', 'Jorge Luis Borges', false, NOW(), NOW());

-- Insertar premios para el set de preguntas
INSERT INTO "TriviaPrize" (id, "questionSetId", name, description, "qrCode", "validFrom", "validUntil", active, "createdAt", "updatedAt")
VALUES
  ('prize-1', 'test-set-1', 'Descuento 20% en consumición', 'Vale por un descuento del 20% en cualquier consumición', 'TRIVIA-DESC20', NOW(), NOW() + INTERVAL '30 days', true, NOW(), NOW()),
  ('prize-2', 'test-set-1', 'Entrada gratis al próximo evento', 'Entrada gratuita para el próximo evento especial', 'TRIVIA-FREE', NOW(), NOW() + INTERVAL '30 days', true, NOW(), NOW());