// Otomatik nöbet/vazife sırası hesaplama. Hem sunucu (page.js, API route)
// hem tarayıcı (client component) tarafında kullanılabilecek şekilde saf
// (side-effect'siz) fonksiyonlar. Basit round-robin: başlangıç tarihinden bu
// yana geçen gün sayısı, listedeki eleman sayısına bölünüp kalanı alınır.

export function gunFarki(baslangic, tarih) {
  const bas = new Date(baslangic + "T00:00:00");
  const su = new Date(tarih + "T00:00:00");
  return Math.round((su - bas) / 86400000);
}

// dizi: kişi ya da grup listesi (aktif/sıralı). rotasyonBaslangic: 'YYYY-MM-DD'.
// tarih: 'YYYY-MM-DD'. Döner: dizi[index] ya da null.
export function sirdakiOge(dizi, rotasyonBaslangic, tarih) {
  if (!dizi || !dizi.length || !rotasyonBaslangic) return null;
  const n = dizi.length;
  const fark = gunFarki(rotasyonBaslangic, tarih);
  const index = ((fark % n) + n) % n;
  return dizi[index];
}

export function bugunISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function tarihEkle(tarih, gun) {
  const d = new Date(tarih + "T00:00:00");
  d.setDate(d.getDate() + gun);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
