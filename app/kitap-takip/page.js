import { redirect } from "next/navigation";

// Kitap Takip, kendi bağımsız tek-dosya uygulaması olarak
// public/kitap-takip.html içinde yaşıyor (mevcut Takip Defteri sitesiyle
// birebir aynı, kendi Supabase projesine bağlanıyor). Bu rota sadece
// eski/olası bağlantıları oraya yönlendirir; asıl erişim kontrolü
// middleware'de /kitap-takip.html için de uygulanıyor.
export default function KitapTakipYonlendirme() {
  redirect("/kitap-takip.html");
}
