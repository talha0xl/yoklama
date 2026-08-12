import { cookies } from "next/headers";
import { verifySession } from "../lib/session";
import CikisButonu from "./CikisButonu";

const MENU = [
  { href: "/yoklama", etiket: "Yoklama", yalnizYonetici: false },
  { href: "/istatistik", etiket: "İstatistik", yalnizYonetici: false },
  { href: "/mesaj", etiket: "Veli Bilgilendirme", yalnizYonetici: false },
  { href: "/admin", etiket: "Yönetim", yalnizYonetici: true },
];

export default async function Kabuk({ aktif, children }) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  return (
    <div className="kabuk">
      <aside className="yan-menu">
        <div className="logo-alan">
          <img src="/logo.png" alt="Yavuztürk Süleymaniye" />
        </div>
        <nav>
          {MENU.filter((m) => !m.yalnizYonetici || session?.yetki === "yonetici").map((m) => (
            <a key={m.href} href={m.href} className={aktif === m.href ? "aktif" : ""}>
              {m.etiket}
            </a>
          ))}
        </nav>
        <CikisButonu />
        <div className="alt-bilgi">
          {session?.sahip_adi ? <>Giriş: {session.sahip_adi}</> : null}
        </div>
      </aside>
      <div className="icerik">
        <div className="sayfa">{children}</div>
      </div>
    </div>
  );
}
