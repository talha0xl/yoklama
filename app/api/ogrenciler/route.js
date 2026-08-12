import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET(req) {
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const supabase = supabaseServer();
  let q = supabase.from("ogrenciler").select("*").eq("aktif", true).order("ad_soyad");
  if (grupId) q = q.eq("grup_id", grupId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ogrenciler: data });
}

export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ogrenciler")
    .insert({
      ad_soyad: body.ad_soyad,
      grup_id: body.grup_id,
      veli_adi: body.veli_adi || null,
      veli_telefon: body.veli_telefon || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ogrenci: data });
}
