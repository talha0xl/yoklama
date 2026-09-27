-- ============================================================
-- Yavuztürk Süleymaniye Portal — v15 eklentisi
-- Bu dosyanın TAMAMINI Supabase projenizde SQL Editor > New query
-- içine yapıştırıp Run deyin.
--
-- Ne yapıyor: "Site Tasarımı" adında yeni bir modül/rol için gereken
-- tabloyu kurar. Bu modüle sahip bir erişim koduyla giren kişi, ana
-- portalın VE Kitap Takip'in adını, logosunu ve ana rengini portal
-- üzerinden (tek tıkla, kod yazmadan) değiştirebilir — değişiklik
-- HERKESTE anında görünür, yeniden deploy gerekmez.
--
-- Bu dosyayı tekrar çalıştırmak güvenlidir.
-- ============================================================

create table if not exists site_ayarlari (
  site text primary key,          -- 'ana_portal' ya da 'kitap_takip'
  site_adi text,
  logo_url text,                  -- data: URI (base64) ya da tam bir URL
  ana_renk text,                  -- hex renk, örn. #28334a
  updated_at timestamptz default now()
);

insert into site_ayarlari (site, site_adi, ana_renk)
values ('ana_portal', 'Yavuztürk Süleymaniye', '#28334a')
on conflict (site) do nothing;

insert into site_ayarlari (site, site_adi, ana_renk)
values ('kitap_takip', 'Yavuztürk Süleymaniye — Kitap Takip', '#28334a')
on conflict (site) do nothing;

alter table site_ayarlari enable row level security;

-- Kitap Takip tarayıcıdan (anon key ile) doğrudan okuyabilmeli ki
-- herkes güncel logoyu/rengi görsün. Yazma yetkisi YOK — değişiklik
-- sadece ana portalın "Site Tasarımı" sayfası (service role) üzerinden
-- yapılabilir, bu yüzden sadece SELECT policy'si var, INSERT/UPDATE yok.
drop policy if exists "kitap takip herkese acik okuma" on site_ayarlari;
create policy "kitap takip herkese acik okuma"
  on site_ayarlari for select
  using (site = 'kitap_takip');
