import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";
import { pushGonder } from "../../../lib/pushGonder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function oturum() {
  const token = cookies().get("yt_session")?.value;
  return token ? await verifySession(token, process.env.SESSION_SECRET) : null;
}

// GET -> duyuru geçmişi (giriş yapan herkes görebilir)
export async function GET() {
  const session = await oturum();
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("duyurular")
    .select("id, baslik, metin, gonderen, gonderilen_sayi, basarisiz_sayi, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message, duyurular: [] }, { status: 500 });

  let aboneSayisi = null;
  if (session?.admin) {
    const { count } = await supabase.from("push_abonelikleri").select("id", { count: "exact", head: true });
    aboneSayisi = count ?? 0;
  }
  return NextResponse.json({ duyurular: data || [], aboneSayisi });
}

// POST { baslik, metin }              -> tüm abonelere duyuru gönder (sadece admin)
// POST { baslik, metin, test, endpoint } -> sadece o cihaza deneme bildirimi
export async function POST(req) {
  const session = await oturum();
  if (!session?.admin) {
    return NextResponse.json({ error: "Duyuru göndermek sadece yöneticiler içindir" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const baslik = String(body?.baslik || "").trim().slice(0, 80);
  const metin = String(body?.metin || "").trim().slice(0, 500);
  const supabase = supabaseServer();

  if (body?.test) {
    if (!body.endpoint) return NextResponse.json({ error: "Bu cihazda bildirim açık değil" }, { status: 400 });
    const { data: ab } = await supabase.from("push_abonelikleri").select("*").eq("endpoint", body.endpoint);
    if (!ab || !ab.length) return NextResponse.json({ error: "Bu cihaz kayıtlı değil, bildirimi kapatıp tekrar aç" }, { status: 400 });
    const sonuc = await pushGonder(ab, {
      baslik: baslik || "Deneme bildirimi",
      metin: metin || "Bildirimler bu cihazda çalışıyor.",
      url: "/duyurular",
    });
    return NextResponse.json({ ok: true, ...sonuc });
  }

  if (!baslik || !metin) {
    return NextResponse.json({ error: "Başlık ve duyuru metni gerekli" }, { status: 400 });
  }

  const { data: kayit, error: e1 } = await supabase
    .from("duyurular")
    .insert({ baslik, metin, gonderen: session.sahip_adi || "Yönetici" })
    .select()
    .single();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: abonelikler } = await supabase.from("push_abonelikleri").select("*");
  const sonuc = await pushGonder(abonelikler || [], { baslik, metin, url: "/duyurular", etiket: "duyuru" });

  await supabase
    .from("duyurular")
    .update({ gonderilen_sayi: sonuc.basarili, basarisiz_sayi: sonuc.basarisiz })
    .eq("id", kayit.id);

  return NextResponse.json({ ok: true, duyuru: kayit, ...sonuc });
}

// DELETE ?id=... -> geçmişten bir duyuruyu sil (sadece admin)
export async function DELETE(req) {
  const session = await oturum();
  if (!session?.admin) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  const supabase = supabaseServer();
  const { error } = await supabase.from("duyurular").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
