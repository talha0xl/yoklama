import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "../../lib/session";
import { sunumVerisiGetir } from "../../lib/sunumVerisi";
import SunumIstemci from "./SunumIstemci";

// Bu sayfa BİLEREK (portal) grubunun dışında — yan menü (Kabuk) burada
// GÖRÜNMÜYOR, tüm ekran sunum içeriğine ayrılıyor (projeksiyon/sunum günü
// için). Middleware yine de oturum + İstatistik erişimini kontrol ediyor.
export default async function SunumSayfasi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session) redirect("/login");

  const ilkVeri = await sunumVerisiGetir(session);
  return <SunumIstemci ilkVeri={ilkVeri} />;
}
