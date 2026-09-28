"use client";
import { useSiteAyarlari } from "../../components/SiteAyarlariProvider";

// Sayfa yenilenirken veya bir sayfadan diğerine geçilirken (veri sunucudan
// gelene kadar) Next.js bu ekranı gösterir. Kitap Takip'e girerkenki gibi
// tüm ekranı kaplayan büyük logo — kenar menüde ufak bir dönen ikon değil.
export default function Yukleniyor() {
  const { siteAdi, logoUrl } = useSiteAyarlari();
  return (
    <div className="yukleniyor-tam-ekran">
      <img src={logoUrl || "/logo.png"} alt={siteAdi} className="yukleniyor-tam-logo" />
      <div className="serit yukleniyor-serit" />
    </div>
  );
}
