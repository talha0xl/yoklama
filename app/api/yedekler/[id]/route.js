import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../../lib/session";
import { supabaseServer } from "../../../../lib/supabaseServer";

// GET /api/yedekler/[id] — geçmiş bir otomatik yedeğin tam içeriğini (.json) indirir.
export async function GET(req, { params }) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session?.admin) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.from("yedekler").select("*").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "Yedek bulunamadı" }, { status: 404 });

  return new NextResponse(JSON.stringify(data.icerik, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="yavuzturk-portal-oto-yedek-${data.olusturma_tarihi.slice(0, 10)}.json"`,
    },
  });
}
