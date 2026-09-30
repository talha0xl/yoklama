-- ============================================================
-- Yavuztürk Süleymaniye Portal — v11 eklentisi
-- Bu dosyanın TAMAMINI Supabase projenizde SQL Editor > New query
-- içine yapıştırıp Run deyin. (v10'dan sonra çalıştırın.)
--
-- Ne yapıyor: "Denetim Kaydı" özelliği için gereken tabloyu oluşturuyor —
-- Yönetim panelinde kim, ne zaman, hangi öğrenciyi/grubu/kodu ekledi,
-- değiştirdi veya sildi, bunun kaydını tutuyor. Bu dosyayı tekrar
-- çalıştırmak güvenlidir.
-- ============================================================

create table if not exists denetim_kayitlari (
  id uuid primary key default gen_random_uuid(),
  tarih timestamptz not null default now(),
  kullanici text,
  islem text not null,       -- 'ekleme' | 'guncelleme' | 'silme'
  hedef_tablo text not null, -- 'ogrenciler' | 'gruplar' | 'erisim_kodlari' | 'ogrenci_yakinlari' | 'mesaj_sablonlari' | 'yedek'
  hedef_id text,
  aciklama text not null
);

create index if not exists denetim_kayitlari_tarih_idx on denetim_kayitlari (tarih desc);
