"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CikisButonu from "./CikisButonu";
import TemaDugmesi from "./TemaDugmesi";
import { useSiteAyarlari } from "./SiteAyarlariProvider";

export default function KabukNav({ modulLinkleri, istatistikVarMi, mesajVarMi, isAdmin, sahipAdi }) {
  const yol = usePathname();
  const { siteAdi, logoUrl } = useSiteAyarlari();

  return (
    <aside className="yan-menu">
      <div className="logo-alan">
        <Link href="/">
          <img src={logoUrl || "/logo.png"} alt={siteAdi} />
        </Link>
      </div>
      <nav>
        <Link href="/" className={yol === "/" ? "aktif" : ""}>
          Ana Sayfa
        </Link>
        {modulLinkleri.map((m) => (
          <Link key={m.href} href={m.href} className={yol === m.href || yol.startsWith(m.href + "/") ? "aktif" : ""}>
            {m.etiket}
            {m.altYazi ? <span className="menu-rozet">{m.altYazi}</span> : null}
          </Link>
        ))}
        {istatistikVarMi && (
          <Link href="/istatistik" className={yol === "/istatistik" ? "aktif" : ""}>
            İstatistik
          </Link>
        )}
        {istatistikVarMi && (
          <Link href="/sunum" className={yol === "/sunum" ? "aktif" : ""}>
            🖥️ Sunum Modu
          </Link>
        )}
        {mesajVarMi && (
          <Link href="/mesaj" className={yol === "/mesaj" ? "aktif" : ""}>
            Veli Bilgilendirme
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin" className={yol === "/admin" ? "aktif" : ""}>
            Yönetim
          </Link>
        )}
      </nav>
      <TemaDugmesi />
      <CikisButonu />
      <div className="alt-bilgi">{sahipAdi ? <>Giriş: {sahipAdi}</> : null}</div>
    </aside>
  );
}
