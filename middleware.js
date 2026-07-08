import { NextResponse } from "next/server";
export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/login")) return NextResponse.next();
  const cookie = req.cookies.get("portal_session");
  if (!cookie) {
    if (pathname.startsWith("/api/")) return new NextResponse(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
