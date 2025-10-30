export function getAllowedOrigins(): string[] {
  const env = (process.env.CORS_ALLOWED_ORIGINS || '').trim();
  if (env) return env.split(',').map(s => s.trim()).filter(Boolean);
  // Sensible default for local dev
  return ['http://localhost:3003'];
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes('*')
    ? '*'
    : (origin && allowed.includes(origin) ? origin : (allowed[0] || '*'));
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Content-Range',
    'Access-Control-Max-Age': '600',
  };
}
