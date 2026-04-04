// NextAuth route stub - project uses custom auth via useToken/adminApi
// This file exists to prevent routing conflicts

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Use /api/auth/login instead' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ message: 'Use /api/auth/login instead' }, { status: 404 });
}
