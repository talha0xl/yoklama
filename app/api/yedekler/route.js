import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/yedekler — geçmiş otomatik yedeklerin listesi (sadece tarih, içerik değil).
export async function GET() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session?.admin) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("yedekler")
    .select("id, olusturma_tarihi")
    .order("olusturma_tarihi", { ascending: false })
    .limit(24);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ yedekler: data });
}
