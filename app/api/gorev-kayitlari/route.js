import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/gorev-kayitlari?liste_id=...&tarih=2026-09-16
export async function GET(req) {
  const listeId = req.nextUrl.searchParams.get("liste_id");
  const tarih = req.nextUrl.searchParams.get("tarih");
  const supabase = supabaseServer();
  let q = supabase.from("gorev_kayitlari").select("*");
  if (listeId) q = q.eq("liste_id", listeId);
  if (tarih) q = q.eq("tarih", tarih);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kayitlar: data });
}

// POST { liste_id, kisi_id, tarih, yapildi, not_metni, vakit }  -> upsert
// vakit verilmezse 'gun' kabul edilir (vakit bazlı olmayan listeler için).
export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("gorev_kayitlari")
    .upsert(
      {
        liste_id: body.liste_id,
        kisi_id: body.kisi_id,
        tarih: body.tarih,
        vakit: body.vakit || "gun",
        yapildi: !!body.yapildi,
        not_metni: body.not_metni ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "kisi_id,tarih,vakit" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kayit: data });
}

// DELETE /api/gorev-kayitlari?kisi_id=...&tarih=...&vakit=...  (işareti geri al)
export async function DELETE(req) {
  const kisiId = req.nextUrl.searchParams.get("kisi_id");
  const tarih = req.nextUrl.searchParams.get("tarih");
  const vakit = req.nextUrl.searchParams.get("vakit") || "gun";
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("gorev_kayitlari")
    .delete()
    .eq("kisi_id", kisiId)
    .eq("tarih", tarih)
    .eq("vakit", vakit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
