import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const allCookies = cookies().getAll();

  return NextResponse.json({
    allCookies: allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })),
    userSessionCookie: cookies().get('user_session')?.value ? 'present' : 'not present',
    timestamp: new Date().toISOString()
  });
}