import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { denetimKaydet } from "../../../../lib/denetim";

export async function DELETE(req, { params }) {
  const supabase = supabaseServer();

  // Grupta hâlâ aktif öğrenci varsa silmeyi engelle — yoksa o öğrencilerin
  // grup_id'si sahipsiz kalır ve her yerde görünmez olurlar.
  const { count, error: e1 } = await supabase
    .from("ogrenciler")
    .select("id", { count: "exact", head: true })
    .eq("grup_id", params.id)
    .eq("aktif", true);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (count > 0) {
    return NextResponse.json(
      { error: `Bu grupta ${count} öğrenci var. Önce öğrencileri başka bir gruba taşıyın (Öğrenciler > Düzenle), sonra grubu silin.` },
      { status: 400 }
    );
  }

  const { data: silinen } = await supabase.from("gruplar").select("isim").eq("id", params.id).maybeSingle();
  const { error } = await supabase.from("gruplar").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await denetimKaydet(supabase, { islem: "silme", hedefTablo: "gruplar", hedefId: params.id, aciklama: `"${silinen?.isim || params.id}" grubu silindi` });
  return NextResponse.json({ ok: true });
}
