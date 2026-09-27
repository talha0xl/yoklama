import "./globals.css";
import AcilisEkrani from "../components/AcilisEkrani";
import { SiteAyarlariProvider } from "../components/SiteAyarlariProvider";
import { siteAyarlariGetir, koyulastir } from "../lib/siteAyarlari";

// Site adı/logo/renk Supabase'den her istekte taze okunsun (Next.js'in
// build-zamanı statik/cache'leme davranışına takılıp bir değişikliğin
// yeniden deploy edilene kadar görünmemesi ihtimalini ortadan kaldırır).
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const ayar = await siteAyarlariGetir("ana_portal");
  return {
    title: `${ayar.siteAdi} | Portal`,
    description: "Yurt yoklama, namaz yoklama, kitap takip ve görev listeleri — tek portal.",
  };
}

export default async function RootLayout({ children }) {
  // Site Tasarımı sayfasından değiştirilen ad/logo/renk buradan (sunucuda,
  // her istekte) okunuyor ve tüm siteye (giriş, kenar menü, sunum modu,
  // açılış ekranı) yayılıyor — böylece bir değişiklik yeniden deploy
  // gerektirmeden HERKESTE anında görünür.
  const ayar = await siteAyarlariGetir("ana_portal");
  const koyuRenk = koyulastir(ayar.anaRenk);

  return (
    <html
      lang="tr"
      suppressHydrationWarning
      style={{ "--lacivert": ayar.anaRenk, "--lacivert-koyu": koyuRenk }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Koyu/açık tema tercihi sayfa boyanmadan ÖNCE uygulanır, böylece
            geçişte kısa bir "yanlış renkte açılıp sonra değişme" (flaş)
            olmaz. Kayıtlı tercih yoksa cihazın sistem tercihine bakılır. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              var t = localStorage.getItem('yt-tema');
              if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'koyu' : 'acik';
              document.documentElement.setAttribute('data-tema', t);
            } catch (e) {}`,
          }}
        />
      </head>
      <body>
        <SiteAyarlariProvider value={{ siteAdi: ayar.siteAdi, logoUrl: ayar.logoUrl }}>
          <AcilisEkrani>{children}</AcilisEkrani>
        </SiteAyarlariProvider>
      </body>
    </html>
  );
}
