import { randomUUID } from "crypto";

// Ana portaldaki (ogrenciler) talebe kayıtları ile Kitap Takip'in kendi
// tabloları (teachers/students) AYNI Supabase projesinde ama ayrı
// tablolarda tutuluyor. Kitap Takip'te bir öğrenci mutlaka bir "hoca"ya
// bağlı olmak zorunda; burada da supabase_schema_v13_kitap_takip_talebeler.sql
// ile aynı mantıkla, öğrencinin sınıf/grup adı hoca adı olarak kullanılıyor
// (aynı isimde bir hoca zaten varsa yeni hoca açılmaz, ona eklenir).

async function hocaBulYaOlustur(supabase, grupIsim) {
  if (!grupIsim) return null;
  const { data: mevcut } = await supabase.from("teachers").select("id").eq("name", grupIsim).maybeSingle();
  if (mevcut) return mevcut.id;
  const yeniId = randomUUID();
  const { error } = await supabase.from("teachers").insert({ id: yeniId, name: grupIsim });
  if (error) return null;
  return yeniId;
}

// Ana portalda yeni bir öğrenci eklendiğinde Kitap Takip'e de otomatik
// eklenir. Herhangi bir hata olursa (ör. Kitap Takip tabloları henüz
// kurulmamışsa) sessizce geçilir — bu senkron, ana portaldaki öğrenci
// ekleme işlemini asla bozmamalı/geciktirmemeli.
export async function kitapTakipOgrenciEkle(supabase, { grupIsim, adSoyad }) {
  try {
    if (!adSoyad) return;
    const hocaId = await hocaBulYaOlustur(supabase, grupIsim);
    if (!hocaId) return;
    const { data: mevcutOgrenci } = await supabase
      .from("students")
      .select("id")
      .eq("teacher_id", hocaId)
      .eq("name", adSoyad)
      .maybeSingle();
    if (mevcutOgrenci) return;
    await supabase.from("students").insert({ id: randomUUID(), teacher_id: hocaId, name: adSoyad });
  } catch {
    // Kitap Takip senkronu ana portal işlemini bloklamasın
  }
}

// Ana portalda bir öğrenci kaldırıldığında (pasif yapıldığında) Kitap
// Takip'teki eşi de silinir. Kitap Takip'in kendi ekranında bir öğrenci
// silindiğinde de kitapları/okuma kayıtları birlikte siliniyor (ON DELETE
// CASCADE) — burada da aynı, zaten var olan davranış uygulanıyor.
export async function kitapTakipOgrenciSil(supabase, { grupIsim, adSoyad }) {
  try {
    if (!grupIsim || !adSoyad) return;
    const { data: hoca } = await supabase.from("teachers").select("id").eq("name", grupIsim).maybeSingle();
    if (!hoca) return;
    await supabase.from("students").delete().eq("teacher_id", hoca.id).eq("name", adSoyad);
  } catch {
    // sessiz geç
  }
}

// Ana portalda bir öğrencinin adı ve/veya grubu (sınıfı) değiştirildiğinde
// Kitap Takip'teki karşılığını da günceller: önce ESKİ isim/grup ile o
// kaydı bulur, sonra adını ve (grup değiştiyse) bağlı olduğu hocayı
// günceller. Eşleşen eski kayıt bulunamazsa (ör. bu öğrenci daha önce hiç
// senkronlanmamışsa) yeni bilgilerle Kitap Takip'e ekler/eşleştirir —
// böylece bir sonraki güncellemede artık senkron kalır.
export async function kitapTakipOgrenciGuncelle(supabase, { eskiGrupIsim, eskiAdSoyad, yeniGrupIsim, yeniAdSoyad }) {
  try {
    if (!yeniAdSoyad) return;

    let eskiOgrenci = null;
    if (eskiGrupIsim && eskiAdSoyad) {
      const { data: eskiHoca } = await supabase.from("teachers").select("id").eq("name", eskiGrupIsim).maybeSingle();
      if (eskiHoca) {
        const { data } = await supabase
          .from("students")
          .select("id")
          .eq("teacher_id", eskiHoca.id)
          .eq("name", eskiAdSoyad)
          .maybeSingle();
        eskiOgrenci = data;
      }
    }

    const yeniHocaId = await hocaBulYaOlustur(supabase, yeniGrupIsim);
    if (!yeniHocaId) return;

    if (eskiOgrenci) {
      await supabase.from("students").update({ teacher_id: yeniHocaId, name: yeniAdSoyad }).eq("id", eskiOgrenci.id);
      return;
    }

    // Eski kayıt bulunamadı — daha önce senkronlanmamış olabilir, yeni
    // bilgilerle ekle (aynı isimde zaten varsa tekrar eklenmez).
    const { data: mevcut } = await supabase
      .from("students")
      .select("id")
      .eq("teacher_id", yeniHocaId)
      .eq("name", yeniAdSoyad)
      .maybeSingle();
    if (mevcut) return;
    await supabase.from("students").insert({ id: randomUUID(), teacher_id: yeniHocaId, name: yeniAdSoyad });
  } catch {
    // sessiz geç
  }
}
