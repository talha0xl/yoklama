// Sunucu tarafında (API route, server component) çalışan kod Vercel'de UTC
// saat dilimiyle çalışıyor. Tarayıcıda new Date() cihazın kendi saat dilimini
// kullandığı için (kullanıcı Türkiye'deyse) zaten doğru sonuç veriyor — bu
// dosya SADECE sunucu tarafında "şu an Türkiye'de saat kaç / hangi gün"
// sorusuna doğru cevap vermek için var, aksi halde kayıtlar 3 saat geride
// (ya da gece yarısından sonra bir gün geride) görünür.
//
// Türkiye 2016'dan beri yaz saati uygulamıyor, sabit UTC+3 kullanıyor — bu
// yüzden ICU/Intl saat dilimi veritabanına bağımlı kalmadan basit bir
// milisaniye ekleme ile güvenilir şekilde hesaplayabiliyoruz.
const TURKIYE_OFSET_MS = 3 * 60 * 60 * 1000;

function turkiyeZamani(tarih = new Date()) {
  return new Date(tarih.getTime() + TURKIYE_OFSET_MS);
}

// 'YYYY-MM-DD' — sunucuda çalışsa bile Türkiye'nin o anki takvim günü.
export function sunucuTarihiISO(tarih = new Date()) {
  const t = turkiyeZamani(tarih);
  return t.getUTCFullYear() + "-" + String(t.getUTCMonth() + 1).padStart(2, "0") + "-" + String(t.getUTCDate()).padStart(2, "0");
}

// 'HH:mm:ss' — sunucuda çalışsa bile Türkiye saatiyle.
export function sunucuSaatiISO(tarih = new Date()) {
  const t = turkiyeZamani(tarih);
  return (
    String(t.getUTCHours()).padStart(2, "0") + ":" + String(t.getUTCMinutes()).padStart(2, "0") + ":" + String(t.getUTCSeconds()).padStart(2, "0")
  );
}

// 'DD.MM.YYYY' — PDF başlıkları gibi okunur tarih gösterimleri için.
export function sunucuTarihiUzun(tarih = new Date()) {
  const t = turkiyeZamani(tarih);
  return String(t.getUTCDate()).padStart(2, "0") + "." + String(t.getUTCMonth() + 1).padStart(2, "0") + "." + t.getUTCFullYear();
}
