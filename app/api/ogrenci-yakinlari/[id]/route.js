import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { denetimKaydet } from "../../../../lib/denetim";

export async function PATCH(req, { params }) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ogrenci_yakinlari")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: ogrenci } = await supabase.from("ogrenciler").select("ad_soyad").eq("id", data.ogrenci_id).maybeSingle();
  await denetimKaydet(supabase, {
    islem: "guncelleme",
    hedefTablo: "ogrenci_yakinlari",
    hedefId: data.id,
    aciklama: `${ogrenci?.ad_soyad || "?"} — ${data.yakinlik} bilgisi güncellendi`,
  });

  return NextResponse.json({ yakin: data });
}

export async function DELETE(req, { params }) {
  const supabase = supabaseServer();
  const { data: silinen } = await supabase.from("ogrenci_yakinlari").select("*").eq("id", params.id).maybeSingle();
  const { error } = await supabase.from("ogrenci_yakinlari").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (silinen) {
    const { data: ogrenci } = await supabase.from("ogrenciler").select("ad_soyad").eq("id", silinen.ogrenci_id).maybeSingle();
    await denetimKaydet(supabase, {
      islem: "silme",
      hedefTablo: "ogrenci_yakinlari",
      hedefId: params.id,
      aciklama: `${ogrenci?.ad_soyad || "?"} — ${silinen.yakinlik} kaldırıldı`,
    });
  }

  return NextResponse.json({ ok: true });
}
