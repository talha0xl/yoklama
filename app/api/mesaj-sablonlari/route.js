import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/mesaj-sablonlari?kaynak=yoklama|namaz (opsiyonel filtre)
export async function GET(req) {
  const kaynak = req.nextUrl.searchParams.get("kaynak");
  const supabase = supabaseServer();
  let q = supabase.from("mesaj_sablonlari").select("*").order("kaynak").order("siralama");
  if (kaynak) q = q.in("kaynak", [kaynak, "genel"]);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sablonlar: data });
}

// POST { ad, kaynak, icerik }
export async function POST(req) {
  const body = await req.json();
  if (!body.ad?.trim() || !body.icerik?.trim()) {
    return NextResponse.json({ error: "Şablon adı ve içeriği gerekli" }, { status: 400 });
  }
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("mesaj_sablonlari")
    .insert({
      ad: body.ad.trim(),
      kaynak: body.kaynak || "genel",
      icerik: body.icerik,
      siralama: body.siralama ?? 99,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sablon: data });
}
