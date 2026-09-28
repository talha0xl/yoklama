import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { denetimKaydet } from "../../../lib/denetim";

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("erisim_kodlari")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kodlar: data });
}

export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("erisim_kodlari")
    .insert({
      kod: body.kod,
      sahip_adi: body.sahip_adi,
      admin: !!body.admin,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const moduller = Array.isArray(body.moduller) ? body.moduller : [];
  if (!body.admin && moduller.length) {
    await supabase.from("erisim_kodu_moduller").insert(moduller.map((m) => ({ erisim_kodu_id: data.id, modul_anahtari: m })));
  }

  await denetimKaydet(supabase, {
    islem: "ekleme",
    hedefTablo: "erisim_kodlari",
    hedefId: data.id,
    aciklama: `"${data.sahip_adi || data.kod}" için ${data.admin ? "yönetici" : "kullanıcı"} kodu oluşturuldu`,
  });

  return NextResponse.json({ kod: data });
}
