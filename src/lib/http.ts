import { NextResponse } from 'next/server';

export function problem(status: number, title: string, detail: string) {
  return NextResponse.json(
    { type: 'about:blank', title, status, detail },
    { status }
  );
}

