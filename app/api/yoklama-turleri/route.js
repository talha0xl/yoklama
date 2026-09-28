import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("yoklama_turleri")
    .select("*")
    .eq("aktif", true)
    .order("siralama");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ turler: data });
}

export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("yoklama_turleri")
    .insert({ isim: body.isim, siralama: body.siralama ?? 99 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tur: data });
}
