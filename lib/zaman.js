// Sunucu tarafında (API route, server component) çalışan kod Vercel'de UTC
// saat dilimiyle çalışıyor. Tarayıcıda new Date() cihazın kendi saat dilimini
// kullandığı için (kullanıcı Türkiye'deyse) zaten doğru sonuç veriyor — bu
// dosya SADECE sunucu tarafında "şu an Türkiye'de saat kaç / hangi gün"
// sorusuna doğru cevap vermek için var, aksi halde kayıtlar 3 saat geride
// (ya da gece yarısından sonra bir gün geride) görünür.
//
// Önceki sürüm bunu elle milisaniye ekleyerek hesaplıyordu. Üretimde
// beklenenden farklı bir saat görülmesi üzerine, olası kaynağı (ör. sunucu
// saatinin sanılandan farklı davranması) ortadan kaldırmak için burada
// Intl.DateTimeFormat + "Europe/Istanbul" saat dilimi kullanılıyor — bu,
// Türkiye'nin güncel UTC ofsetini (sabit +3) saat dilimi veritabanından
// okuyan, standart ve denetlenebilir bir yöntem.
const TR_TZ = "Europe/Istanbul";

function parcalariAl(tarih, opts) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TR_TZ, ...opts }).formatToParts(tarih);
  const obj = {};
  for (const p of parts) obj[p.type] = p.value;
  return obj;
}

// 'YYYY-MM-DD' — sunucuda çalışsa bile Türkiye'nin o anki takvim günü.
export function sunucuTarihiISO(tarih = new Date()) {
  const p = parcalariAl(tarih, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

// 'HH:mm:ss' — sunucuda çalışsa bile Türkiye saatiyle.
export function sunucuSaatiISO(tarih = new Date()) {
  const p = parcalariAl(tarih, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  return `${p.hour}:${p.minute}:${p.second}`;
}

// 'DD.MM.YYYY' — PDF başlıkları gibi okunur tarih gösterimleri için.
export function sunucuTarihiUzun(tarih = new Date()) {
  const p = parcalariAl(tarih, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.day}.${p.month}.${p.year}`;
}
