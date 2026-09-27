// Merkezi modül kayıt defteri. Ana sayfa, yan menü ve yetki kontrolü
// (middleware) hepsi buradan okur — yeni bir modül eklerken sadece
// buraya bir satır eklemeniz yeterli.
export const MODULLER = [
  {
    anahtar: "duz_yoklama",
    isim: "Yoklama",
    yol: "/duz-yoklama",
    aciklama: "Günlük yurt yoklaması, istatistik ve veli bilgilendirme.",
    korunan_yollar: ["/duz-yoklama"],
    hazir: true,
  },
  {
    anahtar: "namaz_yoklama",
    isim: "Namaz Yoklama",
    yol: "/namaz-yoklama",
    aciklama: "Beş vakit namaz takibi, grup bazlı.",
    korunan_yollar: ["/namaz-yoklama"],
    hazir: true,
  },
  {
    anahtar: "gorev_listeleri",
    isim: "Görev Listeleri",
    yol: "/gorev-listeleri",
    aciklama: "Yemekçilik, müezzinlik, nöbetçi — sıralı görev takibi.",
    korunan_yollar: ["/gorev-listeleri"],
    hazir: true,
  },
  {
    anahtar: "kitap_takip",
    isim: "Kitap Takip",
    yol: "/kitap-takip.html",
    aciklama: "Talebe kitap okuma takibi, kütüphane ve veli WhatsApp bilgilendirmesi.",
    korunan_yollar: ["/kitap-takip", "/kitap-takip.html"],
    hazir: true,
  },
  {
    anahtar: "site_tasarim",
    isim: "Site Tasarımı",
    yol: "/site-tasarim",
    aciklama: "Ana portalın ve Kitap Takip'in adını, logosunu ve ana rengini değiştirir — herkeste anında görünür.",
    korunan_yollar: ["/site-tasarim"],
    hazir: true,
  },
];

export function modulErisimVarMi(session, anahtar) {
  if (!session) return false;
  if (session.admin) return true;
  return Array.isArray(session.moduller) && session.moduller.includes(anahtar);
}

// İstatistik sayfası hem Yoklama hem Namaz Yoklama hem de Görev
// Listeleri verilerini gösteriyor — bu yüzden bu üç modülden herhangi
// birine erişimi olan bir hoca da İstatistik'i görebilmeli, sadece
// Yoklama modülü olanlar değil.
export function istatistikErisimVarMi(session) {
  return (
    modulErisimVarMi(session, "duz_yoklama") ||
    modulErisimVarMi(session, "namaz_yoklama") ||
    modulErisimVarMi(session, "gorev_listeleri")
  );
}

// Veli Bilgilendirme sayfası hem Yoklama hem Namaz Yoklama verisiyle
// mesaj üretiyor — sadece Namaz Yoklama'sı olan bir hoca da bu sayfayı
// görebilmeli.
export function mesajErisimVarMi(session) {
  return modulErisimVarMi(session, "duz_yoklama") || modulErisimVarMi(session, "namaz_yoklama");
}

export function yolIcinModul(pathname) {
  return MODULLER.find((m) => m.korunan_yollar.some((y) => pathname === y || pathname.startsWith(y + "/")));
}
