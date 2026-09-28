import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../../lib/session";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { denetimKaydet } from "../../../../lib/denetim";

// POST /api/yedek/geri-yukle — daha önce "Yedeği indir" ile alınmış bir
// .json dosyasını geri yükler. Tabloları, birbirine bağımlı olduğu sıraya
// göre (önce gruplar, sonra öğrenciler, sonra yoklama kayıtları...) tek tek
// "upsert" eder: dosyadaki her satır kendi orijinal id'siyle yazılır — aynı
// id zaten varsa üzerine yazılır, yoksa eklenir. Yedek dosyasında OLMAYAN
// / o tarihten sonra eklenmiş kayıtlara dokunmaz, silmez.
const SIRA = [
  "gruplar",
  "yoklama_turleri",
  "gorev_kategorileri",
  "gorev_listeleri",
  "gorev_gruplari",
  "gorev_kisileri",
  "ogrenciler",
  "ogrenci_yakinlari",
  "yoklama",
  "namaz_yoklama",
  "gorev_kayitlari",
  "mesaj_sablonlari",
  "erisim_kodlari",
  "erisim_kodu_moduller",
];

export async function POST(req) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session || !session.admin) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }

  let dokum;
  try {
    dokum = await req.json();
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı — geçerli bir yedek dosyası (.json) seçtiğinizden emin olun." }, { status: 400 });
  }
  if (!dokum || typeof dokum !== "object") {
    return NextResponse.json({ error: "Bu dosya bir yedek dosyasına benzemiyor." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const sonuclar = {};
  let toplamSatir = 0;

  for (const tablo of SIRA) {
    const satirlar = dokum[tablo];
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
      sonuclar[tablo] = { atlandi: true };
      continue;
    }
    const { error } = await supabase.from(tablo).upsert(satirlar, { onConflict: "id" });
    if (error) {
      sonuclar[tablo] = { hata: error.message };
    } else {
      sonuclar[tablo] = { geri_yuklenen: satirlar.length };
      toplamSatir += satirlar.length;
    }
  }

  await denetimKaydet(supabase, {
    islem: "guncelleme",
    hedefTablo: "yedek",
    hedefId: null,
    aciklama: `Yedekten geri yükleme yapıldı — toplam ${toplamSatir} kayıt işlendi (${dokum.alinma_tarihi ? `yedek tarihi: ${dokum.alinma_tarihi.slice(0, 10)}` : "tarih bilinmiyor"})`,
  });

  return NextResponse.json({ ok: true, toplamSatir, sonuclar });
}
