import { cookies } from "next/headers";
import { verifySession } from "./session";

// Denetim kaydı: "kim ne zaman neyi değiştirdi" — Yönetim panelindeki
// önemli işlemler (öğrenci/veli/grup/erişim kodu ekleme-değiştirme-silme,
// yedekten geri yükleme) için bir iz bırakır. Best-effort: kayıt
// başarısız olursa asıl işlemi (öğrenci ekleme vb.) ASLA engellemez,
// sadece konsola loglar.
//
// Kullanım: await denetimKaydet(supabase, { islem: "ekleme", hedefTablo: "ogrenciler", hedefId: data.id, aciklama: `${data.ad_soyad} eklendi` });
export async function denetimKaydet(supabase, { islem, hedefTablo, hedefId, aciklama }) {
  try {
    const token = cookies().get("yt_session")?.value;
    const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
    const kullanici = session?.sahip_adi || (session?.admin ? "Yönetici" : null) || "Bilinmeyen";
    await supabase.from("denetim_kayitlari").insert({
      kullanici,
      islem,
      hedef_tablo: hedefTablo,
      hedef_id: hedefId ? String(hedefId) : null,
      aciklama,
    });
  } catch (e) {
    // denetim_kayitlari tablosu henüz oluşturulmamışsa (v11 SQL'i
    // çalıştırılmadıysa) sessizce geç — asıl işlem zaten tamamlandı.
    console.error("Denetim kaydı yazılamadı:", e?.message || e);
  }
}
