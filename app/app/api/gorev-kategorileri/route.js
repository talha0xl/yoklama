import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/gorev-kategorileri?liste_id=...
export async function GET(req) {
  const listeId = req.nextUrl.searchParams.get("liste_id");
  const supabase = supabaseServer();
  let q = supabase.from("gorev_kategorileri").select("*").order("siralama");
  if (listeId) q = q.eq("liste_id", listeId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kategoriler: data });
}

// POST { liste_id, isim, siralama }
export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("gorev_kategorileri")
    .insert({ liste_id: body.liste_id, isim: body.isim, siralama: body.siralama ?? 99 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kategori: data });
}
