export type ApiErrorShape = { code: string; message: string; details?: any };

export function apiError(
  code: string,
  message?: string,
  details?: any,
  status = 400,
  headers?: Record<string, string>
) {
  const body: ApiErrorShape = { code, message: message || code, ...(details ? { details } : {}) };
  return new Response(JSON.stringify(body), { status, headers });
}

export function apiOk(data: any, status = 200, headers?: Record<string, string>) {
  const responseData = typeof data === 'object' && data !== null && !Array.isArray(data)
    ? { ...data, ok: true }
    : { data, ok: true };
  return new Response(JSON.stringify(responseData), { status, headers });
}
