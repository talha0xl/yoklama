# Yavuztürk Süleymaniye — Portal

Tek çatı altında birden fazla modülü barındıran, basit "erişim kodu" ile girilen,
çok kullanıcılı yönetim portalı. PC'den ve telefondan aynı şekilde çalışır.

## Modüller
- **Yurt Yoklama** — günlük yoklama, birden fazla "yoklama türü" (Günlük Yoklama, Pazar İzin Dönüşü vb.), istatistik,
  WhatsApp veli bilgilendirme, yanlış işareti geri almak için "Sıfırla"
- **Namaz Yoklama** — grup bazlı, 5 vakit namaz takibi; bir vakte tıkladıkça sırayla **Kıldı → Geç Kıldı → Kılmadı → boş** döner
- **Görev Listeleri** — Yemekçilik, Müezzinlik, Nöbetçi, Çaycı gibi sıralı görev/nöbet listeleri; her gün için yaptı/yapmadı + not.
  Bir liste içinde **alt gruplar** açılabilir (örn. Yemekçilik → 1. Grup / 2. Grup), kimin hangi grupta olduğu Yönetim'den ayarlanır.
  Müezzinlik gibi listeler "vakit bazlı" işaretlenebilir (5 vakit ayrı ayrı, Namaz Yoklama'daki gibi).
- **Kitap Takip** — mevcut Takip Defteri sitenizin birebir aynısı (`public/kitap-takip.html`), aynı Supabase projesinde
  kendi tablolarını kullanır, portalın geri kalanıyla aynı giriş/erişim kontrolünden geçer.
- **Veli Bilgilendirme** — önce hangi konuda mesaj gideceğini seçersiniz: Yurt Yoklama (türe göre, örn. sadece Pazar
  İzin Dönüşü) veya Namaz Yoklama; sonra kime gideceğini filtreleyip WhatsApp bağlantısını üretirsiniz.

## Giriş ve yetkilendirme
- Kullanıcı adı/e-posta yok — sadece "erişim kodu". Kime hangi kodu verdiyseniz o girer.
- İki seviye: **Admin** (her modülü + Yönetim sayfasını görür, yeni kod/kullanıcı oluşturur) ve **sınırlı erişim**
  (sadece admin'in o koda izin verdiği modülleri görür — örn. yemekhaneden sorumlu biri sadece Görev Listeleri'ni görür,
  kitap takiple ilgisi olmayan biri o modülü hiç görmez).
- Yönetim > Erişim Kodları'ndan yeni kod oluştururken hangi modüllerin görünür olacağını işaretlersiniz;
  sonradan "Modülleri düzenle" ile değiştirebilirsiniz.
- Marka: Yavuztürk Süleymaniye logosu ve lacivert (#28334A) marka rengiyle; girişte kısa bir logo animasyonu (splash ekranı) gösterilir.

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
3. Şu dosyaların tüm içeriğini SIRAYLA (birini bitirmeden diğerine geçmeyin) yapıştırıp **Run** deyin:
   `supabase_schema.sql` → `supabase_schema_v2_portal.sql` → `supabase_schema_v3_yoklama_turu.sql` →
   `supabase_schema_v4_gelismis.sql`. (Yepyeni/boş bir Supabase projesi açtıysanız bunun yerine tek başına
   `supabase_schema_TEK_SEFERDE_KURULUM.sql` dosyasını çalıştırmanız yeterli — hepsini içinde barındırıyor.)
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
- Siteye girin, erişim kodu olarak `YT2026` yazın (bu kod v2 migration'dan sonra otomatik admin olur).
- Hemen **Yönetim > Erişim Kodları** kısmına gidip kendi admin kodunuzu oluşturun,
  sonra `YT2026` kodunu **Devre dışı bırak** veya **Sil**.
- **Yönetim > Öğrenciler** kısmından öğrencileri gruplarına ekleyin (veli adı ve WhatsApp
  numarasını `05XXXXXXXXX` formatında girin) — bu liste hem Yurt Yoklama hem Namaz Yoklama'da kullanılır.
- **Görev Listeleri** modülünde "Liste / kişi yönetimi"nden Yemekçilik/Müezzinlik/Nöbetçi listelerine kişi ekleyin.
- Personelinize kod verirken hangi modülleri göreceklerini işaretlemeyi unutmayın.

---

## Bilgisayarınızda deneme (opsiyonel, isteğe bağlı)
```bash
npm install
cp .env.local.example .env.local   # sonra .env.local içini kendi bilgilerinizle doldurun
npm run dev
```
Tarayıcıda `http://localhost:3000` açılır.

## Klasör yapısı
- `supabase_schema.sql` + `supabase_schema_v2_portal.sql` — veritabanı kurulum betikleri (sırayla, bir kere çalıştırılır)
- `lib/moduller.js` — tüm modüllerin merkezi kaydı (yeni modül eklerken buraya bir satır eklenir)
- `app/` — sayfalar: `/` (ana sayfa/modül seçimi), `duz-yoklama`, `namaz-yoklama`, `gorev-listeleri`,
  `kitap-takip`, `istatistik`, `mesaj`, `admin`, `login`
- `app/api/` — sunucu tarafı uç noktalar (Supabase'e sadece buradan erişilir)
- `components/Kabuk.js` — sol menü / sayfa çerçevesi (modül izinlerine göre otomatik filtrelenir)
- `components/AcilisEkrani.js` — girişteki logo animasyonu (splash ekranı)
- `public/logo.png`, `app/icon.png` — logonuz (PDF'ten çıkarıldı; icon.png favicon/uygulama ikonu için kare hale getirildi)
