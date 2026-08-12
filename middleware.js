import { NextResponse } from "next/server";
import { verifySession } from "./lib/session";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  const public_paths = ["/login", "/api/login"];
  if (public_paths.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next") || pathname.startsWith("/logo.png")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Sadece yönetici olanlar /admin sayfasına girebilsin
  if (pathname.startsWith("/admin") && session.yetki !== "yonetici") {
    const url = req.nextUrl.clone();
    url.pathname = "/yoklama";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
