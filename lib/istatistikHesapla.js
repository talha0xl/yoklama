// İstatistik hesaplama — /api/istatistik (ekrandaki tablo) ve
// /api/istatistik/pdf (veli mektubu) aynı mantığı kullanıyor, o yüzden
// burada tek yerde tutuluyor. Sadece "yoklama" ve "namaz" kaynakları için
// (Görev Listeleri rotasyon mantığı farklı ve mektup kapsamı dışında).
export async function yoklamaNamazHesapla(supabase, { kaynak, grupId, turId, baslangic, bitis }) {
  let ogrenciQ = supabase.from("ogrenciler").select("*").eq("aktif", true);
  if (grupId) ogrenciQ = ogrenciQ.eq("grup_id", grupId);
  const [{ data: ogrenciler, error: e1 }, { data: gruplarListesi, error: eg }] = await Promise.all([
    ogrenciQ,
    supabase.from("gruplar").select("id, siralama"),
  ]);
  if (e1) return { error: e1.message };
  if (eg) return { error: eg.message };

  // "Tümü" (grup seçilmeden tüm öğrenciler) görünümünde liste, sadece isme
  // göre değil, önce grubun sıralamasına göre — grup grup aşağı doğru —
  // sonra da her grubun içinde isme göre sıralanır.
  const siralamaMap = {};
  (gruplarListesi || []).forEach((g) => (siralamaMap[g.id] = g.siralama ?? 0));
  ogrenciler.sort((a, b) => {
    const sa = siralamaMap[a.grup_id] ?? 0;
    const sb = siralamaMap[b.grup_id] ?? 0;
    if (sa !== sb) return sa - sb;
    return a.ad_soyad.localeCompare(b.ad_soyad, "tr");
  });

  const ids = ogrenciler.map((o) => o.id);

  if (kaynak === "namaz") {
    let kayitlar = [];
    if (ids.length) {
      let q = supabase.from("namaz_yoklama").select("*").in("ogrenci_id", ids);
      if (baslangic) q = q.gte("tarih", baslangic);
      if (bitis) q = q.lte("tarih", bitis);
      const { data, error: e2 } = await q;
      if (e2) return { error: e2.message };
      kayitlar = data;
    }
    const sonuc = ogrenciler.map((o) => {
      const kOgr = kayitlar.filter((k) => k.ogrenci_id === o.id);
      const kildi = kOgr.filter((k) => k.durum === "kildi").length;
      const gecKildi = kOgr.filter((k) => k.durum === "gec_kildi").length;
      const izinli = kOgr.filter((k) => k.durum === "izinli").length;
      const kilmadi = kOgr.filter((k) => k.durum === "kilmadi").length;
      const paydaGun = kOgr.length - izinli;
      return {
        ogrenci: o,
        geldi: kildi,
        gecKildi,
        izinli,
        izinsiz: kilmadi,
        toplam: kOgr.length,
        basari: kildi + gecKildi,
        payda: paydaGun,
        oran: paydaGun > 0 ? Math.round(((kildi + gecKildi) / paydaGun) * 100) : null,
        izinKayitlari: kOgr
          .filter((k) => k.durum === "izinli")
          .map((k) => ({ tarih: k.tarih, vakit: k.vakit, sebep: k.not_metni }))
          .sort((a, b) => (a.tarih < b.tarih ? 1 : -1)),
      };
    });
    return { sonuc };
  }

  // kaynak === "yoklama"
  let kayitlar = [];
  if (ids.length && turId) {
    let q = supabase.from("yoklama").select("*").in("ogrenci_id", ids).eq("tur_id", turId);
    if (baslangic) q = q.gte("tarih", baslangic);
    if (bitis) q = q.lte("tarih", bitis);
    const { data, error: e2 } = await q;
    if (e2) return { error: e2.message };
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
      basari: geldi,
      payda: toplam,
      oran: toplam ? Math.round((geldi / toplam) * 100) : null,
      izinKayitlari: kOgr
        .filter((k) => k.durum === "izinli")
        .map((k) => ({ tarih: k.tarih, sebep: k.not_metni }))
        .sort((a, b) => (a.tarih < b.tarih ? 1 : -1)),
    };
  });

  return { sonuc };
}
