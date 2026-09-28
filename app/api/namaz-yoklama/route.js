import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/namaz-yoklama?grup_id=...&tarih=2026-09-16
export async function GET(req) {
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const tarih = req.nextUrl.searchParams.get("tarih");
  const supabase = supabaseServer();

  let ogrenciQ = supabase.from("ogrenciler").select("*, ogrenci_yakinlari(*)").eq("aktif", true).order("ad_soyad");
  if (grupId) ogrenciQ = ogrenciQ.eq("grup_id", grupId);
  const { data: ogrenciler, error: e1 } = await ogrenciQ;
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const ids = ogrenciler.map((o) => o.id);
  let kayitlar = [];
  if (ids.length && tarih) {
    const { data, error: e2 } = await supabase
      .from("namaz_yoklama")
      .select("*")
      .eq("tarih", tarih)
      .in("ogrenci_id", ids);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    kayitlar = data;
  }

  return NextResponse.json({ ogrenciler, kayitlar });
}

// POST { ogrenci_id, tarih, vakit, durum }
export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("namaz_yoklama")
    .upsert(
      {
        ogrenci_id: body.ogrenci_id,
        tarih: body.tarih,
        vakit: body.vakit,
        durum: body.durum,
        not_metni: body.not_metni ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ogrenci_id,tarih,vakit" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kayit: data });
}

// DELETE /api/namaz-yoklama?ogrenci_id=...&tarih=...&vakit=...  (işaretlemeyi geri al)
export async function DELETE(req) {
  const ogrenciId = req.nextUrl.searchParams.get("ogrenci_id");
  const tarih = req.nextUrl.searchParams.get("tarih");
  const vakit = req.nextUrl.searchParams.get("vakit");
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("namaz_yoklama")
    .delete()
    .eq("ogrenci_id", ogrenciId)
    .eq("tarih", tarih)
    .eq("vakit", vakit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
