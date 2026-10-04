// Hem elle indirilen yedekte (/api/yedek) hem otomatik yedekte
// (/api/yedek/oto) aynı dökümü üretmek için ortak yardımcı.
const TABLOLAR = [
  "gruplar",
  "ogrenciler",
  "ogrenci_yakinlari",
  "yoklama_turleri",
  "yoklama",
  "namaz_yoklama",
  "gorev_listeleri",
  "gorev_gruplari",
  "gorev_kategorileri",
  "gorev_kisileri",
  "gorev_kayitlari",
  "mesaj_sablonlari",
  "erisim_kodlari",
  "erisim_kodu_moduller",
];

export async function tumVeriyiTopla(supabase) {
  const dokum = { alinma_tarihi: new Date().toISOString() };
  for (const tablo of TABLOLAR) {
    const { data, error } = await supabase.from(tablo).select("*");
    if (error) {
      // Bir tablo bulunamazsa (örn. ilgili SQL'i henüz çalıştırılmadıysa)
      // tüm yedeği durdurmak yerine o tabloyu boş bırak, devam et.
      dokum[tablo] = { hata: error.message };
      continue;
    }
    dokum[tablo] = data;
  }
  return dokum;
}