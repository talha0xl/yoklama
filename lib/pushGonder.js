import webpush from "web-push";
import { supabaseServer } from "./supabaseServer";

// Bildirim anahtarları (VAPID) ilk ihtiyaçta sunucu tarafından üretilip
// push_ayar tablosuna kaydedilir — ortam değişkeni ayarlamak gerekmez.
// Özel anahtar sadece sunucuda kalır, tarayıcıya sadece public anahtar gider.
const VAPID_KONU = "https://ysyoklama.vercel.app";
let onbellek = null;

export async function vapidAl() {
  if (onbellek) return onbellek;
  const supabase = supabaseServer();
  const oku = () => supabase.from("push_ayar").select("public_key, private_key").eq("id", 1).maybeSingle();

  let { data, error } = await oku();
  if (error) throw new Error(error.message);
  if (!data) {
    const k = webpush.generateVAPIDKeys();
    await supabase
      .from("push_ayar")
      .upsert({ id: 1, public_key: k.publicKey, private_key: k.privateKey }, { onConflict: "id", ignoreDuplicates: true });
    const sonuc = await oku();
    data = sonuc.data;
  }
  if (!data) throw new Error("Bildirim anahtarı oluşturulamadı");
  onbellek = { publicKey: data.public_key, privateKey: data.private_key };
  return onbellek;
}

// abonelikler: push_abonelikleri satırları. yuk: { baslik, metin, url }
export async function pushGonder(abonelikler, yuk) {
  if (!abonelikler.length) return { basarili: 0, basarisiz: 0 };
  const { publicKey, privateKey } = await vapidAl();
  webpush.setVapidDetails(VAPID_KONU, publicKey, privateKey);
  const govde = JSON.stringify(yuk);

  let basarili = 0;
  const olu = [];
  await Promise.all(
    abonelikler.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          govde,
          { TTL: 60 * 60 * 24 }
        );
        basarili++;
      } catch (e) {
        // Cihaz bildirimi kapatmış / uygulamayı silmiş: abonelik artık geçersiz.
        if (e && (e.statusCode === 404 || e.statusCode === 410)) olu.push(a.id);
      }
    })
  );
  if (olu.length) {
    await supabaseServer().from("push_abonelikleri").delete().in("id", olu);
  }
  return { basarili, basarisiz: abonelikler.length - basarili };
}
