import { NextResponse } from "next/server";
import { verifySession } from "./lib/session";
import { yolIcinModul, modulErisimVarMi, istatistikErisimVarMi, mesajErisimVarMi } from "./lib/moduller";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  const public_paths = ["/login", "/api/login"];
  if (
    public_paths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/logo.png") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon")
  ) {
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

  // Sadece admin olanlar /admin sayfasına girebilsin
  if (pathname.startsWith("/admin") && !session.admin) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // İstatistik ve Veli Bilgilendirme birden fazla modülün verisini
  // gösteriyor, bu yüzden ayrı ayrı (daha geniş) kontrol ediliyor.
  if (pathname.startsWith("/istatistik") && !istatistikErisimVarMi(session)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  // Sunum Modu, İstatistik ile aynı özet veriyi gösteriyor — aynı erişim kuralı.
  if (pathname.startsWith("/sunum") && !istatistikErisimVarMi(session)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/mesaj") && !mesajErisimVarMi(session)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Modül bazlı erişim kontrolü: bir modülün korunan yoluna, o modüle
  // izni olmayan (ve admin olmayan) bir kod giremesin.
  const modul = yolIcinModul(pathname);
  if (modul && !modulErisimVarMi(session, modul.anahtar)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|icon.png|apple-icon.png).*)"],
};
