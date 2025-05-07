// app/api/set-cookie/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  const body = await req.json();
  const { session } = body;

  if (!session) {
    return NextResponse.json({ error: "No session provided" }, { status: 400 });
  }

  // Here you can use cookies() from 'next/headers' to set an HTTP-only cookie
  // Example: cookies().set("sb-access-token", session.access_token, { httpOnly: true, secure: true, sameSite: 'Lax' });

  return NextResponse.json({ message: "Session received" }, { status: 200 });
}

export function GET() {
  return NextResponse.json({ message: "Only POST allowed" }, { status: 405 });
}
