import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";
import { sunucuSaatiISO } from "../../../lib/zaman";

// GET /api/yoklama?grup_id=...&tarih=2026-08-12&tur_id=...
export async function GET(req) {
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const tarih = req.nextUrl.searchParams.get("tarih");
  const turId = req.nextUrl.searchParams.get("tur_id");
  const supabase = supabaseServer();

  let ogrenciQ = supabase.from("ogrenciler").select("*, ogrenci_yakinlari(*)").eq("aktif", true).order("ad_soyad");
  if (grupId) ogrenciQ = ogrenciQ.eq("grup_id", grupId);
  const { data: ogrenciler, error: e1 } = await ogrenciQ;
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const ids = ogrenciler.map((o) => o.id);
  let kayitlar = [];
  if (ids.length && tarih && turId) {
    const { data, error: e2 } = await supabase
      .from("yoklama")
      .select("*")
      .eq("tarih", tarih)
      .eq("tur_id", turId)
      .in("ogrenci_id", ids);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    kayitlar = data;
  }

  return NextResponse.json({ ogrenciler, kayitlar });
}

// POST { ogrenci_id, tarih, tur_id, durum }  -> tek tık, anında kayıt (upsert)
export async function POST(req) {
  const body = await req.json();
  const supabase = supabaseServer();
  const now = new Date();
  // Tarayıcı kendi (kullanıcının gördüğü) saatini gönderiyorsa onu kullan;
  // göndermediyse sunucu UTC'de çalışsa da Türkiye saatiyle hesapla.
  const gelenSaat = typeof body.saat === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(body.saat) ? body.saat : null;
  const saat = gelenSaat || sunucuSaatiISO(now);

  const { data, error } = await supabase
    .from("yoklama")
    .upsert(
      {
        ogrenci_id: body.ogrenci_id,
        tarih: body.tarih,
        tur_id: body.tur_id,
        durum: body.durum,
        not_metni: body.not_metni ?? null,
        saat,
        updated_at: now.toISOString(),
      },
      { onConflict: "ogrenci_id,tarih,tur_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kayit: data });
}

// DELETE /api/yoklama?ogrenci_id=...&tarih=...&tur_id=...  (tek öğrencinin işaretini geri al — "Sıfırla")
// DELETE /api/yoklama  body: { tarih, tur_id, ogrenci_ids: [...] }  (o günün o türdeki tüm işaretlerini topluca sil)
// Not: tek tek "Sıfırla" yoklamaya erişebilen herkese açık; günün tamamını
// topluca silmek ise daha riskli bir işlem olduğu için admin'e kısıtlı kalıyor.
export async function DELETE(req) {
  const ogrenciId = req.nextUrl.searchParams.get("ogrenci_id");
  const supabase = supabaseServer();

  if (ogrenciId) {
    const tarih = req.nextUrl.searchParams.get("tarih");
    const turId = req.nextUrl.searchParams.get("tur_id");
    const { error } = await supabase
      .from("yoklama")
      .delete()
      .eq("ogrenci_id", ogrenciId)
      .eq("tarih", tarih)
      .eq("tur_id", turId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Toplu silme (günün tüm işaretlerini silme) — sadece admin.
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session?.admin) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }

  // Gövdede tarih/tur_id/ogrenci_ids bekleniyor.
  const body = await req.json().catch(() => null);
  const tarih = body?.tarih;
  const turId = body?.tur_id;
  const ogrenciIds = Array.isArray(body?.ogrenci_ids) ? body.ogrenci_ids : null;
  if (!tarih || !turId || !ogrenciIds || !ogrenciIds.length) {
    return NextResponse.json({ error: "tarih, tur_id ve ogrenci_ids gerekli" }, { status: 400 });
  }
  const { error } = await supabase
    .from("yoklama")
    .delete()
    .eq("tarih", tarih)
    .eq("tur_id", turId)
    .in("ogrenci_id", ogrenciIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
