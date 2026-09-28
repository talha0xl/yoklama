import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

export async function PATCH(req, { params }) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("mesaj_sablonlari")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sablon: data });
}

export async function DELETE(req, { params }) {
  const supabase = supabaseServer();
  const { error } = await supabase.from("mesaj_sablonlari").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
