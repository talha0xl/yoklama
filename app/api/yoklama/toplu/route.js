import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../../lib/session";
import { modulErisimVarMi } from "../../../../lib/moduller";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { sunucuSaatiISO } from "../../../../lib/zaman";

// POST /api/yoklama/toplu  { tarih, tur_id, durum, ogrenci_ids: [...], saat? }
// Verilen öğrencilerden o gün/türde HENÜZ kaydı olmayanları topluca işaretler.
// Zaten kaydı olanlara (izinli, izinsiz, geldi) dokunmaz — başka bir hoca
// araya girip işaretlediyse onun işareti ezilmesin diye "çakışmada atla"
// çalışır. Tek tek işaretleme gibi, yoklamaya erişimi olan herkese açık.
export async function POST(req) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!modulErisimVarMi(session, "duz_yoklama")) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const tarih = body?.tarih;
  const turId = body?.tur_id;
  const durum = body?.durum;
  const ids = Array.isArray(body?.ogrenci_ids) ? [...new Set(body.ogrenci_ids)] : [];
  if (!tarih || !turId || !ids.length) {
    return NextResponse.json({ error: "tarih, tur_id ve ogrenci_ids gerekli" }, { status: 400 });
  }
  if (!["geldi", "izinli", "izinsiz"].includes(durum)) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }
  if (ids.length > 1000) {
    return NextResponse.json({ error: "Çok fazla öğrenci" }, { status: 400 });
  }

  const now = new Date();
  const gelenSaat = typeof body.saat === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(body.saat) ? body.saat : null;
  const saat = gelenSaat || sunucuSaatiISO(now);

  const supabase = supabaseServer();
  const satirlar = ids.map((id) => ({
    ogrenci_id: id,
    tarih,
    tur_id: turId,
    durum,
    not_metni: null,
    saat,
    updated_at: now.toISOString(),
  }));

  const { data, error } = await supabase
    .from("yoklama")
    .upsert(satirlar, { onConflict: "ogrenci_id,tarih,tur_id", ignoreDuplicates: true })
    .select("ogrenci_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, islenen: (data || []).length });
}
