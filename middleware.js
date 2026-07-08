import { NextResponse } from "next/server";

// Protect everything except the login page, the login API, and static assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/login).*)"],
};

export function middleware(req) {
  const secret = process.env.SESSION_SECRET || "";
  const cookie = req.cookies.get("portal_auth")?.value;
  if (secret && cookie === secret) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
