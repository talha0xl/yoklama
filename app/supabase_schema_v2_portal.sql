-- ============================================================
-- Yavuztürk Süleymaniye PORTAL — v2 eklentisi
-- Bu dosyayı Supabase projenizde: SQL Editor > New query içine
-- yapıştırıp "Run" deyin. Mevcut supabase_schema.sql'i SİLMEZ,
-- üzerine EKLEME yapar (var olan yoklama/öğrenci verileriniz kalır).
-- ============================================================

-- ---------- Modül tanımları ----------
create table if not exists moduller (
  anahtar text primary key,       -- 'duz_yoklama' | 'namaz_yoklama' | 'kitap_takip' | 'gorev_listeleri'
  isim text not null,
  siralama int not null default 0
);
insert into moduller (anahtar, isim, siralama) values
  ('duz_yoklama', 'Yurt Yoklama', 1),
  ('namaz_yoklama', 'Namaz Yoklama', 2),
  ('kitap_takip', 'Kitap Takip', 3),
  ('gorev_listeleri', 'Görev Listeleri', 4)
on conflict (anahtar) do nothing;

-- ---------- Erişim kodlarını admin + modül izinlerine taşı ----------
alter table erisim_kodlari add column if not exists admin boolean not null default false;
update erisim_kodlari set admin = true where yetki = 'yonetici' and admin = false;

create table if not exists erisim_kodu_moduller (
  erisim_kodu_id uuid not null references erisim_kodlari(id) on delete cascade,
  modul_anahtari text not null references moduller(anahtar) on delete cascade,
  primary key (erisim_kodu_id, modul_anahtari)
);
alter table erisim_kodu_moduller enable row level security;

-- Var olan tüm kodlara (geçiş kolaylığı için) düz yoklama erişimini otomatik ver
insert into erisim_kodu_moduller (erisim_kodu_id, modul_anahtari)
select id, 'duz_yoklama' from erisim_kodlari
on conflict do nothing;

-- ---------- Namaz Yoklama ----------
-- Aynı öğrenci/grup listesini kullanır (ogrenciler tablosu ortak).
create table if not exists namaz_yoklama (
  id uuid primary key default gen_random_uuid(),
  ogrenci_id uuid not null references ogrenciler(id) on delete cascade,
  tarih date not null default current_date,
  vakit text not null check (vakit in ('sabah','ogle','ikindi','aksam','yatsi')),
  durum text not null check (durum in ('kildi','kilmadi')),
  not_metni text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ogrenci_id, tarih, vakit)
);
alter table namaz_yoklama enable row level security;

-- ---------- Görev Listeleri (Yemekçilik, Müezzinlik, Nöbetçi ...) ----------
-- Genel amaçlı nöbet/görev sistemi: istediğiniz kadar liste açabilirsiniz,
-- her listeye sıralı kişiler eklersiniz, her gün/tarih için yaptı-yapmadı + not girilir.
create table if not exists gorev_listeleri (
  id uuid primary key default gen_random_uuid(),
  isim text not null unique,        -- 'Yemekçilik', 'Müezzinlik', 'Nöbetçi'
  siralama int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists gorev_kisileri (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references gorev_listeleri(id) on delete cascade,
  ad_soyad text not null,
  sira int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists gorev_kayitlari (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references gorev_listeleri(id) on delete cascade,
  kisi_id uuid not null references gorev_kisileri(id) on delete cascade,
  tarih date not null default current_date,
  yapildi boolean not null default false,
  not_metni text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kisi_id, tarih)
);
alter table gorev_listeleri enable row level security;
alter table gorev_kisileri enable row level security;
alter table gorev_kayitlari enable row level security;

insert into gorev_listeleri (isim, siralama) values
  ('Yemekçilik', 1),
  ('Müezzinlik', 2),
  ('Nöbetçi', 3)
on conflict (isim) do nothing;

-- ---------- Row Level Security notu ----------
-- Diğer tablolarda olduğu gibi hiçbir public policy eklemiyoruz.
-- Uygulama tüm sorguları sunucu tarafında (service role) yapıyor,
-- tarayıcıdan (anon key ile) hiçbir şey okunamaz/yazılamaz.
