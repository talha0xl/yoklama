import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/denetim — son değişiklik kayıtlarını listeler. Sadece admin.
export async function GET(req) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session || !session.admin) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "200", 10) || 200, 500);
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("denetim_kayitlari")
    .select("*")
    .order("tarih", { ascending: false })
    .limit(limit);
  if (error) {
    // Tablo henüz oluşturulmamışsa (v11 SQL'i çalıştırılmadıysa) boş liste dön.
    return NextResponse.json({ kayitlar: [], hazirDegil: true });
  }
  return NextResponse.json({ kayitlar: data });
}
