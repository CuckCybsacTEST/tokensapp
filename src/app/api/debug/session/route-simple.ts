import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Debug session endpoint works',
    timestamp: Date.now(),
    method: 'GET'
  });
}