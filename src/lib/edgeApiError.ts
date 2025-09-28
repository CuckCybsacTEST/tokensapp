// Helper ligero para middleware (edge-friendly) evitando dependencias pesadas.
export function edgeApiError(code: string, message?: string, details?: any, status = 401, headers?: Record<string,string>) {
  const body: any = { code, message: message || code };
  if (details) body.details = details;
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export function edgeApiOk(data: any, status = 200, headers?: Record<string,string>) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
