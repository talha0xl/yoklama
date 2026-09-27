/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Veli Mektubu (PDF) rotası, pdfkit ile gömülü Türkçe fontları (lib/fonts)
  // ve okul logosunu (public/logo.png) dosya sisteminden okuyor. Vercel'in
  // otomatik dosya izleyicisi (file tracing) bu dosyaları sadece import/require
  // ile bulur — burada olduğu gibi çalışma zamanında bir yol (path) string'i
  // olarak okunduklarında göremeyebilir ve sunucu paketine dahil etmeyebilir.
  // Bu da yayında "Mektup oluşturulamadı" hatasına yol açar (yerelde ise
  // sorun görünmez, çünkü yerelde tüm proje klasörü zaten diskte durur).
  // Bu ayar, o dosyaların pakete kesin olarak dahil edilmesini sağlıyor.
  experimental: {
    outputFileTracingIncludes: {
      "/api/istatistik/pdf": ["./lib/fonts/**", "./public/logo.png"],
    },
  },
};

module.exports = nextConfig;
