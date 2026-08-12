import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/yoklama?grup_id=...&tarih=2026-08-12
export async function GET(req) {
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const tarih = req.nextUrl.searchParams.get("tarih");
  const supabase = supabaseServer();

  let ogrenciQ = supabase.from("ogrenciler").select("*").eq("aktif", true).order("ad_soyad");
  if (grupId) ogrenciQ = ogrenciQ.eq("grup_id", grupId);
  const { data: ogrenciler, error: e1 } = await ogrenciQ;
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const ids = ogrenciler.map((o) => o.id);
  let kayitlar = [];
  if (ids.length && tarih) {
    const { data, error: e2 } = await supabase
      .from("yoklama")
      .select("*")
      .eq("tarih", tarih)
      .in("ogrenci_id", ids);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    kayitlar = data;
  }

  return NextResponse.json({ ogrenciler, kayitlar });
}

// POST { ogrenci_id, tarih, durum }  -> tek tık, anında kayıt (upsert)
export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const now = new Date();
  const saat = now.toTimeString().slice(0, 8);

  const { data, error } = await supabase
    .from("yoklama")
    .upsert(
      {
        ogrenci_id: body.ogrenci_id,
        tarih: body.tarih,
        durum: body.durum,
        saat,
        updated_at: now.toISOString(),
      },
      { onConflict: "ogrenci_id,tarih" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kayit: data });
}

// DELETE /api/yoklama?ogrenci_id=...&tarih=...  (işaretlemeyi geri al)
export async function DELETE(req) {
  const ogrenciId = req.nextUrl.searchParams.get("ogrenci_id");
  const tarih = req.nextUrl.searchParams.get("tarih");
  const supabase = supabaseServer();
  const { error } = await supabase.from("yoklama").delete().eq("ogrenci_id", ogrenciId).eq("tarih", tarih);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
