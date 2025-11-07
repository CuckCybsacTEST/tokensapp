import { describe, it, expect, beforeEach } from 'vitest';

describe('Trivia API', () => {
  describe('POST /api/trivia/session', () => {
    it('should create a new trivia session', async () => {
      const response = await fetch('/api/trivia/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.session).toBeDefined();
      expect(data.session.id).toBeDefined();
      expect(data.session.currentQuestionIndex).toBe(0);
      expect(data.session.completed).toBe(false);
    });

    it('should resume existing session', async () => {
      // First create a session
      const createResponse = await fetch('/api/trivia/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const createData = await createResponse.json();
      const sessionId = createData.session.id;

      // Then try to resume it
      const resumeResponse = await fetch('/api/trivia/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      expect(resumeResponse.status).toBe(200);
      const resumeData = await resumeResponse.json();
      expect(resumeData.redirect).toBe(true);
      expect(resumeData.sessionId).toBe(sessionId);
    });
  });

  describe('GET /api/trivia/session', () => {
    it('should return session state', async () => {
      // Create session first
      const createResponse = await fetch('/api/trivia/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const createData = await createResponse.json();
      const sessionId = createData.session.id;

      // Get session state
      const response = await fetch(`/api/trivia/session?sessionId=${sessionId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.session.id).toBe(sessionId);
      expect(data.session.completed).toBe(false);
    });

    it('should return 400 without sessionId', async () => {
      const response = await fetch('/api/trivia/session');
      expect(response.status).toBe(400);
    });
  });
});
