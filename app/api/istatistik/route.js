import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { sirdakiOge, tarihEkle } from "../../../lib/rotasyon";
import { yoklamaNamazHesapla } from "../../../lib/istatistikHesapla";

// GET /api/istatistik?kaynak=yoklama&grup_id=...&tur_id=...&baslangic=...&bitis=...
// GET /api/istatistik?kaynak=namaz&grup_id=...&baslangic=...&bitis=...
// GET /api/istatistik?kaynak=gorev&liste_id=...&baslangic=...&bitis=...
export async function GET(req) {
  const kaynak = req.nextUrl.searchParams.get("kaynak") || "yoklama";
  const grupId = req.nextUrl.searchParams.get("grup_id");
  const baslangic = req.nextUrl.searchParams.get("baslangic");
  const bitis = req.nextUrl.searchParams.get("bitis");
  const supabase = supabaseServer();

  if (kaynak === "gorev") {
    // Görev Listeleri artık günlük işaretleme değil, otomatik sıra (rotasyon)
    // ile çalışıyor. Burada "kim kaç gün vazifeliydi" sorusunu, geçmişe dönük
    // olarak, aynı sıralama formülünü tarih tarih tekrar hesaplayarak
    // cevaplıyoruz — ayrıca kayıt tutmaya gerek yok.
    const listeId = req.nextUrl.searchParams.get("liste_id");
    const { data: liste, error: elis } = await supabase.from("gorev_listeleri").select("*").eq("id", listeId).maybeSingle();
    if (elis) return NextResponse.json({ error: elis.message }, { status: 500 });

    const [{ data: kisiler, error: ek1 }, { data: gruplar, error: eg1 }] = await Promise.all([
      supabase.from("gorev_kisileri").select("*").eq("aktif", true).eq("liste_id", listeId).order("sira"),
      supabase.from("gorev_gruplari").select("*").eq("liste_id", listeId).order("siralama"),
    ]);
    if (ek1) return NextResponse.json({ error: ek1.message }, { status: 500 });
    if (eg1) return NextResponse.json({ error: eg1.message }, { status: 500 });

    const kisiSayaclari = {};
    (kisiler || []).forEach((k) => (kisiSayaclari[k.id] = 0));
    let toplamGun = 0;

    if (liste?.rotasyonlu && (kisiler || []).length && baslangic && bitis) {
      const birimler =
        gruplar && gruplar.length
          ? gruplar.map((g) => ({ id: g.id, uyeler: (kisiler || []).filter((k) => k.grup_id === g.id) }))
          : (kisiler || []).map((k) => ({ id: k.id, uyeler: [k] }));

      let gun = baslangic;
      let donguSayaci = 0;
      while (gun <= bitis && donguSayaci < 400) {
        const birim = sirdakiOge(birimler, liste.rotasyon_baslangic, gun);
        if (birim) birim.uyeler.forEach((k) => (kisiSayaclari[k.id] = (kisiSayaclari[k.id] || 0) + 1));
        toplamGun++;
        gun = tarihEkle(gun, 1);
        donguSayaci++;
      }
    }

    const sonuc = (kisiler || []).map((k) => {
      const gunSayisi = kisiSayaclari[k.id] || 0;
      return {
        ogrenci: k, // ortak arayüz için aynı alan adı kullanılıyor
        geldi: gunSayisi,
        izinli: 0,
        izinsiz: 0,
        toplam: toplamGun,
        basari: gunSayisi,
        payda: toplamGun,
        oran: toplamGun ? Math.round((gunSayisi / toplamGun) * 100) : null,
        izinKayitlari: [],
      };
    });
    return NextResponse.json({ sonuc });
  }

  const turId = req.nextUrl.searchParams.get("tur_id");
  const { sonuc, error } = await yoklamaNamazHesapla(supabase, { kaynak, grupId, turId, baslangic, bitis });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ sonuc });
}
