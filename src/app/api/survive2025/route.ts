import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { EVENT_ID, MIN_SURVIVE_MS, MAX_SURVIVE_MS, RATE_LIMIT_SUBMITS, RATE_LIMIT_WINDOW_MS } from '@/features/survive2025/constants';

// Rate limiting: simple in-memory map (for dev; use Redis in prod)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const submitSchema = z.object({
  eventId: z.string().min(1),
  displayName: z.string().min(2).max(16).regex(/^[a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ_-]+$/),
  bestMs: z.number().int().min(MIN_SURVIVE_MS).max(MAX_SURVIVE_MS),
  score: z.number().int().min(0),
  sessionId: z.string().optional(),
  deviceHash: z.string().optional(),
});

function checkRateLimit(deviceHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(deviceHash);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(deviceHash, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_SUBMITS) {
    return false;
  }
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { eventId, displayName, bestMs, score, sessionId, deviceHash } = parsed.data;

    if (deviceHash && !checkRateLimit(deviceHash)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { error } = await supabaseAdmin
      .from('survive2025_runs')
      .insert({
        event_id: eventId,
        display_name: displayName.trim(),
        best_ms: bestMs,
        score,
        session_id: sessionId,
        device_hash: deviceHash,
      });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || EVENT_ID;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const { data, error } = await supabaseAdmin
      .from('survive2025_runs')
      .select('*')
      .eq('event_id', eventId)
      .order('best_ms', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Supabase select error:', error);
      return NextResponse.json({ runs: [] }, { status: 500 });
    }

    return NextResponse.json({ runs: data || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ runs: [] }, { status: 500 });
  }
}