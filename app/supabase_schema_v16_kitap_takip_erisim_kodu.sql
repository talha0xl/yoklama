-- ============================================================
-- Yavuztürk Süleymaniye Portal — v16 eklentisi (GÜVENLİK)
-- Bu dosyanın TAMAMINI Supabase projenizde SQL Editor > New query
-- içine yapıştırıp Run deyin.
--
-- ÖNEMLİ: Daha önce "v16_kitap_takip_erisim_kodu.sql" adıyla ayrı,
-- TEK bir sabit koda dayanan bir sürüm paylaşılmıştı. Onu HİÇ
-- çalıştırmadıysanız sorun yok, doğrudan bunu çalıştırın. Eğer
-- çalıştırdıysanız da sorun değil — bu dosya onun politikalarını
-- silip yerine doğru olanı kurar, tekrar tekrar çalıştırmak güvenlidir.
--
-- NEDEN: Kitap Takip (public/kitap-takip.html) tarayıcıdan doğrudan
-- Supabase'e bağlanıyor ve bunun için sayfanın kaynak kodunda açıkça
-- yazılı olan bir "anon key" kullanıyor. Bu anahtarı ele geçiren biri,
-- teachers/students/books/logs/book_library/publishers tablolarının
-- kuralı "herkese açık" olduğu sürece, portala hiç girmeden tüm
-- hoca/talebe/kitap verisini okuyup değiştirebilir ya da silebilirdi.
--
-- NE YAPIYOR: Bu 6 tablonun kuralını "herkese açık"tan, ANA PORTALDA
-- ZATEN KULLANILAN erişim kodlarından (erisim_kodlari tablosu) birine
-- sahip olmaya bağlıyor — yani ayrı, ikinci bir kod YOK; herkes hocaya/
-- yöneticiye verdiğiniz normal giriş koduyla Kitap Takip'e de girebilir.
-- Ayrıca, kişi ana portala zaten giriş yapmışsa (oturumu açıksa)
-- kitap-takip.html bu kodu kendisi otomatik alır, tekrar sormaz —
-- bunun için app/api/kitap-takip-anahtar/route.js eklendi, o kısım bu
-- SQL'den değil, aynı zip'teki kod güncellemesinden geliyor.
--
-- Erişim kodu, tarayıcıdan bir "x-kt-anahtar" başlığı (header) olarak
-- gönderiliyor; aşağıdaki fonksiyon bu değerin erisim_kodlari
-- tablosunda aktif bir kod olup olmadığını (ve admin değilse Kitap
-- Takip modülüne izni olup olmadığını) kontrol ediyor. "security
-- definer" olduğu için anon/authenticated rolüne erisim_kodlari
-- tablosunu DOĞRUDAN okuma izni vermeden bu kontrolü yapabiliyor —
-- yani kodların kendisi (ya da kimin admin olduğu gibi bilgiler)
-- tarayıcıya hiç sızmıyor, sadece "doğru mu, yanlış mı" cevabı dönüyor.
-- ============================================================

create or replace function kt_kod_gecerli_mi(p_kod text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from erisim_kodlari ek
    where ek.kod = p_kod
      and ek.aktif = true
      and (
        ek.admin = true
        or exists (
          select 1 from erisim_kodu_moduller ekm
          where ekm.erisim_kodu_id = ek.id
            and ekm.modul_anahtari = 'kitap_takip'
        )
      )
  );
$$;

revoke all on function kt_kod_gecerli_mi(text) from public;
grant execute on function kt_kod_gecerli_mi(text) to anon, authenticated;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['teachers','students','books','logs','book_library','publishers']
  loop
    execute format('drop policy if exists "herkese acik" on %I', tbl);
    execute format('drop policy if exists "anahtarli_erisim" on %I', tbl);
    execute format('drop policy if exists "kod_ile_erisim" on %I', tbl);
    execute format(
      'create policy "kod_ile_erisim" on %I for all using (kt_kod_gecerli_mi(current_setting(''request.headers'', true)::json->>''x-kt-anahtar'')) with check (kt_kod_gecerli_mi(current_setting(''request.headers'', true)::json->>''x-kt-anahtar''))',
      tbl
    );
  end loop;
end $$;

-- Not: site_ayarlari tablosuna dokunulmadı — o zaten sadece OKUMA
-- için herkese açık (logo/renk gibi hassas olmayan veri), bilerek öyle
-- bırakıldı.
