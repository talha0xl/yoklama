import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { denetimKaydet } from "../../../lib/denetim";

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("gruplar").select("*").order("siralama");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ gruplar: data });
}

export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("gruplar")
    .insert({ isim: body.isim, siralama: body.siralama ?? 99 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await denetimKaydet(supabase, { islem: "ekleme", hedefTablo: "gruplar", hedefId: data.id, aciklama: `"${data.isim}" grubu eklendi` });
  return NextResponse.json({ grup: data });
}

export async function PATCH(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { id, ...rest } = body;
  const { data, error } = await supabase.from("gruplar").update(rest).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if ("veli_bilgilendirme_aktif" in rest) {
    await denetimKaydet(supabase, {
      islem: "guncelleme",
      hedefTablo: "gruplar",
      hedefId: data.id,
      aciklama: `"${data.isim}" grubunun Veli Bilgilendirme görünürlüğü ${rest.veli_bilgilendirme_aktif ? "açıldı" : "kapatıldı"}`,
    });
  }
  return NextResponse.json({ grup: data });
}
