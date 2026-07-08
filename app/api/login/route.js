import { NextResponse } from "next/server";
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== process.env.ACCESS_PASSWORD)
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("portal_session", "ok", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
