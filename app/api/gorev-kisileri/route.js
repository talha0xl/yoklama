import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/gorev-kisileri?liste_id=...
export async function GET(req) {
  const listeId = req.nextUrl.searchParams.get("liste_id");
  const supabase = supabaseServer();
  let q = supabase.from("gorev_kisileri").select("*").eq("aktif", true).order("sira");
  if (listeId) q = q.eq("liste_id", listeId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kisiler: data });
}

// POST { liste_id, ad_soyad, sira, grup_id }
export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("gorev_kisileri")
    .insert({ liste_id: body.liste_id, ad_soyad: body.ad_soyad, sira: body.sira ?? 99, grup_id: body.grup_id ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kisi: data });
}
