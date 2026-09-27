import Kabuk from "../../components/Kabuk";

// Kenar menü (Kabuk) burada, tüm portal sayfalarının ORTAK üst katmanında
// bir kere render ediliyor. Sayfadan sayfaya geçerken bu katman yeniden
// yüklenmiyor — sadece loading.js sayesinde içerik alanı kısa bir yükleniyor
// animasyonu gösterip yeni içerikle değişiyor. Bu, geçişleri belirgin
// şekilde hızlı ve akıcı hissettiriyor.
export default function PortalLayout({ children }) {
  return <Kabuk>{children}</Kabuk>;
}
