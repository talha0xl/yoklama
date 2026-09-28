import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

// PATCH: sadece isim/sıralama değiştirmek için.
export async function PATCH(req, { params }) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("yoklama_turleri")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tur: data });
}

// DELETE: tam silme değil, "aktif = false" — bu türle daha önce alınmış
// yoklama kayıtları (yoklama.tur_id) korunur, sadece tür seçim listesinden
// kalkar. Böylece geçmiş istatistik/PDF raporları bozulmaz.
export async function DELETE(req, { params }) {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("yoklama_turleri")
    .update({ aktif: false })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
