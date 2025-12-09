// DEPRECATED: This endpoint is deprecated. Use /api/admin/reusable-tokens/generate-single instead.
// This endpoint will be removed in a future version.

import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';

export async function POST(req: NextRequest) {
  return apiError('DEPRECATED', 'This endpoint is deprecated. Use /api/admin/reusable-tokens/generate-single instead.', undefined, 410);
}