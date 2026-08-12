import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

export async function PATCH(req, { params }) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("ogrenciler")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ogrenci: data });
}

export async function DELETE(req, { params }) {
  const supabase = supabaseServer();
  // Kalıcı silmek yerine pasif işaretliyoruz, geçmiş yoklama kayıtları bozulmasın diye
  const { error } = await supabase.from("ogrenciler").update({ aktif: false }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
