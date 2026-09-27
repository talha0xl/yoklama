import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { sunumVerisiGetir } from "../../../lib/sunumVerisi";

// GET /api/sunum?grup_id=...&tur_id=... — Sunum Modu'nun canlı yenilenmesi
// için. Herhangi bir geçerli oturum yeterli (İstatistik ile aynı erişim
// mantığı). grup_id/tur_id verilmezse "Toplu Talebe" ve tüm türler birlikte.
export async function GET(req) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session) return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });

  const grupId = req.nextUrl.searchParams.get("grup_id") || null;
  const turId = req.nextUrl.searchParams.get("tur_id") || null;

  const veri = await sunumVerisiGetir(session, { grupId, turId });
  return NextResponse.json(veri);
}
