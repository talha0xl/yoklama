# Yavuztürk Süleymaniye — Yurt Yoklama Sistemi

Basit girişli, çok kullanıcılı yoklama, istatistik ve WhatsApp veli bilgilendirme sistemi.
PC'den ve telefondan aynı şekilde çalışır.

## Ne yapıyor
- Tek "erişim kodu" ile giriş (kullanıcı adı/e-posta yok, sadece siz kimlere kod verdiyseniz onlar girer)
- İki yetki seviyesi: **Yönetici** (her yeri görür) ve **Yoklamacı** (sadece yoklama/istatistik/mesaj, Yönetim sayfasını göremez)
- 5-6-7-8. sınıf grupları (istediğiniz kadar yeni grup da ekleyebilirsiniz)
- Yoklama: "Geldi" butonuna basınca saat otomatik yazılır ve anında kaydolur; "Gelmedi" butonuna basınca İzinli/İzinsiz seçenekleri direkt açılır, seçince kayıt biter — ayrı "kaydet" yok
- İstatistik: tarih aralığına göre öğrenci/grup devam oranı
- Veli Bilgilendirme: her grup için ayrı açık/kapalı ayarı (örn. 6'lara gitsin, 8'lere gitmesin), her veli için hazır mesajlı WhatsApp bağlantısı üretir

## Kuruluma başlamadan önce bilmeniz gereken önemli nokta
WhatsApp mesajlarını **tamamen otomatik, tek tuşla 100 kişiye** göndermek için Meta'nın resmi
WhatsApp Business Cloud API'sine işletme hesabınızla başvurmanız ve onay almanız gerekiyor
(ücretli, birkaç gün sürebilir). Bu olmadan hiçbir sistem (bu dahil) gerçekten "arka planda"
otomatik WhatsApp mesajı gönderemez — WhatsApp buna izin vermiyor. Bu yüzden sistem, her veli için
mesajı hazırlayıp WhatsApp'ı açan bir bağlantı üretiyor; siz sadece "Gönder"e basıyorsunuz.
İleride Business API başvurunuz onaylanırsa, bu kısmı gerçek otomatik gönderime bağlayabiliriz.

---

## Kurulum (yaklaşık 15 dakika)

### 1. Supabase projesi oluşturun
1. [supabase.com](https://supabase.com) üzerinden ücretsiz hesap açın, **New Project** deyin.
2. Proje açılınca sol menüden **SQL Editor** > **New query** açın.
3. Bu projedeki `supabase_schema.sql` dosyasının tüm içeriğini yapıştırıp **Run** deyin.
   (Bu, tüm tabloları oluşturur, 5-6-7-8. sınıfları ve ilk giriş kodunu `YT2026` olarak ekler.)
4. Sol menüden **Project Settings > API** sayfasına gidin, şu ikisini not alın:
   - **Project URL**
   - **service_role key** (secret) — Bunu kimseyle paylaşmayın.

### 2. Kodu GitHub'a yükleyin
1. [github.com](https://github.com) üzerinde yeni, boş bir repo oluşturun.
2. Bu klasördeki tüm dosyaları o repoya yükleyin (GitHub Desktop veya `git push` ile).

### 3. Vercel'e bağlayın
1. [vercel.com](https://vercel.com) üzerinden GitHub hesabınızla giriş yapın.
2. **Add New > Project** deyip az önce yüklediğiniz repoyu seçin.
3. **Environment Variables** kısmına şu 3 değeri girin:
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → Supabase service_role key
   - `SESSION_SECRET` → kendiniz uydurun, uzun rastgele bir metin (örn. şifre üreticiden alın)
4. **Deploy** deyin. 1-2 dakikada siteniz `xxx.vercel.app` adresinde yayında olur.
5. İsterseniz Vercel > Settings > Domains kısmından kendi alan adınızı (`yoklama.yurdunuz.com` gibi) bağlayabilirsiniz.

### 4. İlk giriş
- Siteye girin, erişim kodu olarak `YT2026` yazın.
- Hemen **Yönetim > Erişim Kodları** kısmına gidip kendi kodunuzu/kodlarınızı oluşturun,
  sonra `YT2026` kodunu **Devre dışı bırak** veya **Sil**.
- **Yönetim > Öğrenciler** kısmından öğrencileri gruplarına ekleyin (veli adı ve WhatsApp
  numarasını `05XXXXXXXXX` formatında girin).

---

## Bilgisayarınızda deneme (opsiyonel, isteğe bağlı)
```bash
npm install
cp .env.local.example .env.local   # sonra .env.local içini kendi bilgilerinizle doldurun
npm run dev
```
Tarayıcıda `http://localhost:3000` açılır.

## Klasör yapısı
- `supabase_schema.sql` — veritabanı kurulum betiği (bir kere çalıştırılır)
- `app/` — sayfalar (yoklama, istatistik, mesaj, admin, login)
- `app/api/` — sunucu tarafı uç noktalar (Supabase'e sadece buradan erişilir)
- `components/Kabuk.js` — sol menü / sayfa çerçevesi
- `public/logo.png` — logonuz (PDF'ten otomatik çıkarıldı)
