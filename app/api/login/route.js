import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const expected = process.env.ACCESS_PASSWORD || "";
  const secret = process.env.SESSION_SECRET || "";
  if (!expected || !secret) {
    return NextResponse.json(
      { error: "Server not configured: set ACCESS_PASSWORD and SESSION_SECRET." },
      { status: 500 }
    );
  }
  if (body?.password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("portal_auth", secret, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8,
  });
  return res;
}
