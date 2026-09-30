import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { denetimKaydet } from "../../../lib/denetim";

// GET /api/ogrenci-yakinlari?ogrenci_id=...
export async function GET(req) {
  const ogrenciId = req.nextUrl.searchParams.get("ogrenci_id");
  if (!ogrenciId) return NextResponse.json({ error: "ogrenci_id gerekli" }, { status: 400 });
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ogrenci_yakinlari")
    .select("*")
    .eq("ogrenci_id", ogrenciId)
    .order("siralama");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ yakinlar: data });
}

// POST { ogrenci_id, yakinlik, ad_soyad, telefon, meslek, yasadigi_yer }
export async function POST(req) {
  const body = await req.json();
  if (!body.ogrenci_id || !body.yakinlik?.trim()) {
    return NextResponse.json({ error: "Yakınlık ve öğrenci bilgisi gerekli" }, { status: 400 });
  }
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ogrenci_yakinlari")
    .insert({
      ogrenci_id: body.ogrenci_id,
      yakinlik: body.yakinlik.trim(),
      ad_soyad: body.ad_soyad || null,
      telefon: body.telefon || null,
      meslek: body.meslek || null,
      yasadigi_yer: body.yasadigi_yer || null,
      siralama: body.siralama ?? 0,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: ogrenci } = await supabase.from("ogrenciler").select("ad_soyad").eq("id", body.ogrenci_id).maybeSingle();
  await denetimKaydet(supabase, {
    islem: "ekleme",
    hedefTablo: "ogrenci_yakinlari",
    hedefId: data.id,
    aciklama: `${ogrenci?.ad_soyad || "?"} için ${data.yakinlik} eklendi${data.ad_soyad ? ` (${data.ad_soyad})` : ""}`,
  });

  return NextResponse.json({ yakin: data });
}
