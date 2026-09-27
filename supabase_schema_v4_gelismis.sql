-- ============================================================
-- Yavuztürk Süleymaniye Portal — v4 eklentisi
-- Bu dosyayı Supabase projenizde SQL Editor > New query içine
-- yapıştırıp Run deyin. Mevcut verilerinize dokunmaz, sadece
-- ekleme yapar.
--
-- Ne ekliyor:
--  1) Namaz Yoklama'ya "Geç Kıldı" seçeneği (artık 3 durum var).
--  2) Görev Listeleri'ne alt GRUP desteği (Yemekçilik gibi
--     listelerde kişileri gruplara ayırıp grup bazında takip).
--  3) Müezzinlik gibi listeler için "vakit bazlı" takip (5 vakit
--     ayrı ayrı işaretlenebilir, Namaz Yoklama'daki gibi).
--  4) Sık kullanılan sorgular için birkaç performans indeksi.
-- ============================================================

-- ---------- 1) Namaz Yoklama: Geç Kıldı ----------
alter table namaz_yoklama drop constraint if exists namaz_yoklama_durum_check;
alter table namaz_yoklama add constraint namaz_yoklama_durum_check
  check (durum in ('kildi', 'gec_kildi', 'kilmadi'));

-- ---------- 2) Görev Listeleri: alt gruplar ----------
create table if not exists gorev_gruplari (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references gorev_listeleri(id) on delete cascade,
  isim text not null,
  siralama int not null default 0,
  created_at timestamptz not null default now(),
  unique (liste_id, isim)
);
alter table gorev_gruplari enable row level security;

alter table gorev_kisileri add column if not exists grup_id uuid references gorev_gruplari(id) on delete set null;

-- ---------- 3) Görev Listeleri: vakit bazlı takip (Müezzinlik) ----------
alter table gorev_listeleri add column if not exists vakit_bazli boolean not null default false;
update gorev_listeleri set vakit_bazli = true where isim = 'Müezzinlik';

alter table gorev_kayitlari add column if not exists vakit text not null default 'gun'
  check (vakit in ('gun','sabah','ogle','ikindi','aksam','yatsi'));

alter table gorev_kayitlari drop constraint if exists gorev_kayitlari_kisi_id_tarih_key;
alter table gorev_kayitlari drop constraint if exists gorev_kayitlari_kisi_tarih_vakit_key;
alter table gorev_kayitlari add constraint gorev_kayitlari_kisi_tarih_vakit_key unique (kisi_id, tarih, vakit);

-- ---------- 4) Performans indeksleri ----------
create index if not exists idx_ogrenciler_grup_id on ogrenciler(grup_id);
create index if not exists idx_yoklama_tarih on yoklama(tarih);
create index if not exists idx_yoklama_tur_id on yoklama(tur_id);
create index if not exists idx_namaz_yoklama_tarih on namaz_yoklama(tarih);
create index if not exists idx_namaz_yoklama_ogrenci_id on namaz_yoklama(ogrenci_id);
create index if not exists idx_gorev_kisileri_liste_id on gorev_kisileri(liste_id);
create index if not exists idx_gorev_kisileri_grup_id on gorev_kisileri(grup_id);
create index if not exists idx_gorev_kayitlari_liste_id on gorev_kayitlari(liste_id);
create index if not exists idx_gorev_kayitlari_tarih on gorev_kayitlari(tarih);
create index if not exists idx_gorev_gruplari_liste_id on gorev_gruplari(liste_id);
create index if not exists idx_erisim_kodu_moduller_kod_id on erisim_kodu_moduller(erisim_kodu_id);

-- Row Level Security notu: diğer tablolarda olduğu gibi hiçbir
-- public policy eklemiyoruz, sadece sunucu (service role) erişir.
