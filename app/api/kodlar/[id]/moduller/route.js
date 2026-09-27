import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabaseServer";

// GET /api/kodlar/:id/moduller
export async function GET(req, { params }) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("erisim_kodu_moduller")
    .select("modul_anahtari")
    .eq("erisim_kodu_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ moduller: (data || []).map((d) => d.modul_anahtari) });
}

// PUT { moduller: ["duz_yoklama", "namaz_yoklama", ...] }  -> tam listeyi bununla değiştirir
export async function PUT(req, { params }) {
  const body = await req.json();
  const moduller = Array.isArray(body.moduller) ? body.moduller : [];
  const supabase = supabaseServer();

  const { error: e1 } = await supabase.from("erisim_kodu_moduller").delete().eq("erisim_kodu_id", params.id);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  if (moduller.length) {
    const { error: e2 } = await supabase
      .from("erisim_kodu_moduller")
      .insert(moduller.map((m) => ({ erisim_kodu_id: params.id, modul_anahtari: m })));
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, moduller });
}
