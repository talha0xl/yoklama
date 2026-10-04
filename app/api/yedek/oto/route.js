import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { tumVeriyiTopla } from "../../../../lib/yedekOlustur";

const GUN_MS = 24 * 60 * 60 * 1000;
const SIKLIK_GUN = { haftalik: 7, aylik: 30 };
const SAKLANACAK_ADET = 12; // en fazla bu kadar otomatik yedek tutulur, eskiler silinir

function yetkiliMi(req) {
  // CRON_SECRET ortam değişkeni ayarlanmadıysa (varsayılan kurulum) kontrolü
  // atla — Vercel Cron zaten kendi projenizden çağırıyor. İsterseniz Vercel'de
  // CRON_SECRET adında rastgele bir değer tanımlayıp koruma ekleyebilirsiniz.
  const gizli = process.env.CRON_SECRET;
  if (!gizli) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${gizli}`;
}

// GET /api/yedek/oto — Vercel Cron tarafından her gün bir kere çağrılır
// (bkz. vercel.json). Yönetim panelinden seçilen sıklığa (haftalık = 7
// gün, aylık = 30 gün) göre süresi dolmuşsa yeni bir otomatik yedek
// kaydeder; dolmadıysa hiçbir şey yapmadan çıkar.
export async function GET(req) {
  if (!yetkiliMi(req)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: ayar, error: ayarHata } = await supabase
    .from("yedek_ayarlari")
    .select("*")
    .eq("id", 1)
    .single();
  if (ayarHata) return NextResponse.json({ error: ayarHata.message }, { status: 500 });

  const gunSayisi = SIKLIK_GUN[ayar?.siklik] || 7;
  const sonTarih = ayar?.son_yedek_tarihi ? new Date(ayar.son_yedek_tarihi) : null;
  const simdi = new Date();

  if (sonTarih && simdi.getTime() - sonTarih.getTime() < gunSayisi * GUN_MS) {
    return NextResponse.json({ atlandi: true });
  }

  const dokum = await tumVeriyiTopla(supabase);

  const { error: eklemeHata } = await supabase.from("yedekler").insert({ icerik: dokum });
  if (eklemeHata) return NextResponse.json({ error: eklemeHata.message }, { status: 500 });

  await supabase.from("yedek_ayarlari").update({ son_yedek_tarihi: simdi.toISOString() }).eq("id", 1);

  // Eskileri temizle: sadece son SAKLANACAK_ADET kadarını tut.
  const { data: hepsi } = await supabase
    .from("yedekler")
    .select("id")
    .order("olusturma_tarihi", { ascending: false });
  if (hepsi && hepsi.length > SAKLANACAK_ADET) {
    const silinecekIdler = hepsi.slice(SAKLANACAK_ADET).map((y) => y.id);
    await supabase.from("yedekler").delete().in("id", silinecekIdler);
  }

  return NextResponse.json({ olusturuldu: true, tarih: simdi.toISOString() });
}
