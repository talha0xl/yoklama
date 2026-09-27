import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { denetimKaydet } from "../../../lib/denetim";
import { kitapTakipOgrenciEkle } from "../../../lib/kitapTakipSenkron";

export async function GET(req) {
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const supabase = supabaseServer();
  let q = supabase.from("ogrenciler").select("*, ogrenci_yakinlari(*)").eq("aktif", true).order("ad_soyad");
  if (grupId) q = q.eq("grup_id", grupId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ogrenciler: data });
}

// POST { ad_soyad, grup_id, yasadigi_yer, yakinlar: [{ yakinlik, ad_soyad, telefon, meslek, yasadigi_yer }] }
export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data: ogrenci, error } = await supabase
    .from("ogrenciler")
    .insert({
      ad_soyad: body.ad_soyad,
      grup_id: body.grup_id,
      yasadigi_yer: body.yasadigi_yer || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const yakinlar = (body.yakinlar || []).filter((y) => y.yakinlik?.trim());
  if (yakinlar.length) {
    const { error: e2 } = await supabase.from("ogrenci_yakinlari").insert(
      yakinlar.map((y, i) => ({
        ogrenci_id: ogrenci.id,
        yakinlik: y.yakinlik.trim(),
        ad_soyad: y.ad_soyad || null,
        telefon: y.telefon || null,
        meslek: y.meslek || null,
        yasadigi_yer: y.yasadigi_yer || null,
        siralama: i,
      }))
    );
    if (e2) return NextResponse.json({ error: `Öğrenci eklendi ama yakınlar kaydedilemedi: ${e2.message}` }, { status: 500 });
  }

  await denetimKaydet(supabase, { islem: "ekleme", hedefTablo: "ogrenciler", hedefId: ogrenci.id, aciklama: `${ogrenci.ad_soyad} eklendi` });

  // Kitap Takip'e de otomatik ekle (sınıfın adıyla eşleşen hocaya) — bu
  // adım başarısız olsa bile öğrenci ana portala zaten eklenmiş durumda.
  const { data: grup } = await supabase.from("gruplar").select("isim").eq("id", body.grup_id).maybeSingle();
  await kitapTakipOgrenciEkle(supabase, { grupIsim: grup?.isim, adSoyad: ogrenci.ad_soyad });

  return NextResponse.json({ ogrenci });
}
