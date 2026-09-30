import { cookies } from "next/headers";
import { verifySession } from "../lib/session";
import { MODULLER, modulErisimVarMi, istatistikErisimVarMi, mesajErisimVarMi } from "../lib/moduller";
import KabukNav from "./KabukNav";

// Kabuk artık kök layout'ta BİR KEZ render ediliyor (sayfa geçişlerinde yeniden
// yüklenmiyor, kaybolup gelmiyor). Aktif menü öğesi KabukNav içinde (client,
// usePathname ile) belirleniyor, böylece sayfa değişince sadece içerik alanı
// değişiyor, kenar menü sabit kalıyor — geçişler çok daha hızlı hissettiriyor.
export default async function Kabuk({ children }) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  const modulLinkleri = MODULLER.filter(
    (m) => (m.hazir || session?.admin) && modulErisimVarMi(session, m.anahtar)
  ).map((m) => ({ href: m.yol, etiket: m.isim, altYazi: m.hazir ? null : "yapım aşamasında" }));

  return (
    <div className="kabuk">
      <KabukNav
        modulLinkleri={modulLinkleri}
        istatistikVarMi={istatistikErisimVarMi(session)}
        mesajVarMi={mesajErisimVarMi(session)}
        isAdmin={!!session?.admin}
        sahipAdi={session?.sahip_adi || null}
      />
      <div className="icerik">
        <div className="sayfa">{children}</div>
      </div>
    </div>
  );
}
