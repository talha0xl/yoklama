import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { denetimKaydet } from "../../../../lib/denetim";

export async function PATCH(req, { params }) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("erisim_kodlari")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await denetimKaydet(supabase, {
    islem: "guncelleme",
    hedefTablo: "erisim_kodlari",
    hedefId: data.id,
    aciklama: `"${data.sahip_adi || data.kod}" kodu güncellendi`,
  });
  return NextResponse.json({ kod: data });
}

export async function DELETE(req, { params }) {
  const supabase = supabaseServer();
  const { data: silinen } = await supabase.from("erisim_kodlari").select("sahip_adi, kod").eq("id", params.id).maybeSingle();
  const { error } = await supabase.from("erisim_kodlari").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await denetimKaydet(supabase, {
    islem: "silme",
    hedefTablo: "erisim_kodlari",
    hedefId: params.id,
    aciklama: `"${silinen?.sahip_adi || silinen?.kod || params.id}" kodu silindi`,
  });
  return NextResponse.json({ ok: true });
}
