import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/yedek — tüm verinin tek bir JSON dosyası halinde tam dökümü.
// Sadece admin çekebilir (telefon numaraları / erişim kodları gibi
// hassas veri içerdiği için).
const TABLOLAR = [
  "gruplar",
  "ogrenciler",
  "ogrenci_yakinlari",
  "yoklama_turleri",
  "yoklama",
  "namaz_yoklama",
  "gorev_listeleri",
  "gorev_gruplari",
  "gorev_kategorileri",
  "gorev_kisileri",
  "gorev_kayitlari",
  "mesaj_sablonlari",
  "erisim_kodlari",
  "erisim_kodu_moduller",
];

export async function GET() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session || !session.admin) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const dokum = { alinma_tarihi: new Date().toISOString() };

  for (const tablo of TABLOLAR) {
    const { data, error } = await supabase.from(tablo).select("*");
    if (error) {
      // Bir tablo bulunamazsa (örn. v9/v10 SQL'i henüz çalıştırılmadıysa)
      // tüm yedeği durdurmak yerine o tabloyu boş bırak, devam et.
      dokum[tablo] = { hata: error.message };
      continue;
    }
    dokum[tablo] = data;
  }

  return new NextResponse(JSON.stringify(dokum, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="yavuzturk-portal-yedek-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
