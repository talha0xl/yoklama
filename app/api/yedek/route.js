import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";
import { tumVeriyiTopla } from "../../../lib/yedekOlustur";

// GET /api/yedek — tüm verinin tek bir JSON dosyası halinde tam dökümü.
// Sadece admin çekebilir (telefon numaraları / erişim kodları gibi
// hassas veri içerdiği için).
export async function GET() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session || !session.admin) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const dokum = await tumVeriyiTopla(supabase);

  return new NextResponse(JSON.stringify(dokum, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="yavuzturk-portal-yedek-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
