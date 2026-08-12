import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

// GET /api/istatistik?grup_id=...&baslangic=2026-08-01&bitis=2026-08-12
export async function GET(req) {
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const baslangic = req.nextUrl.searchParams.get("baslangic");
  const bitis = req.nextUrl.searchParams.get("bitis");
  const supabase = supabaseServer();

  let ogrenciQ = supabase.from("ogrenciler").select("*").eq("aktif", true).order("ad_soyad");
  if (grupId) ogrenciQ = ogrenciQ.eq("grup_id", grupId);
  const { data: ogrenciler, error: e1 } = await ogrenciQ;
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const ids = ogrenciler.map((o) => o.id);
  let kayitlar = [];
  if (ids.length) {
    let q = supabase.from("yoklama").select("*").in("ogrenci_id", ids);
    if (baslangic) q = q.gte("tarih", baslangic);
    if (bitis) q = q.lte("tarih", bitis);
    const { data, error: e2 } = await q;
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    kayitlar = data;
  }

  const sonuc = ogrenciler.map((o) => {
    const kOgr = kayitlar.filter((k) => k.ogrenci_id === o.id);
    const geldi = kOgr.filter((k) => k.durum === "geldi").length;
    const izinli = kOgr.filter((k) => k.durum === "izinli").length;
    const izinsiz = kOgr.filter((k) => k.durum === "izinsiz").length;
    const toplam = kOgr.length;
    return {
      ogrenci: o,
      geldi,
      izinli,
      izinsiz,
      toplam,
      oran: toplam ? Math.round((geldi / toplam) * 100) : null,
    };
  });

  return NextResponse.json({ sonuc });
}
