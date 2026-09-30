-- ============================================================
-- Yavuztürk Süleymaniye Yurdu - Yoklama Sistemi
-- Bu dosyayı Supabase projenizde: SQL Editor > New query içine
-- yapıştırıp "Run" butonuna basarak bir kere çalıştırın.
-- ============================================================

-- Gruplar (5. sınıf, 6. sınıf, 7. sınıf, 8. sınıf)
create table if not exists gruplar (
  id uuid primary key default gen_random_uuid(),
  isim text not null unique,          -- '5. Sınıf', '6. Sınıf' ...
  siralama int not null default 0,
  veli_bilgilendirme_aktif boolean not null default true,  -- WhatsApp mesajı bu gruba gidebilir mi
  created_at timestamptz not null default now()
);

-- Öğrenciler
create table if not exists ogrenciler (
  id uuid primary key default gen_random_uuid(),
  ad_soyad text not null,
  grup_id uuid not null references gruplar(id) on delete cascade,
  veli_adi text,
  veli_telefon text,              -- 05XXXXXXXXX formatında
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Yoklama kayıtları (öğrenci + tarih başına tek kayıt)
create table if not exists yoklama (
  id uuid primary key default gen_random_uuid(),
  ogrenci_id uuid not null references ogrenciler(id) on delete cascade,
  tarih date not null default current_date,
  durum text not null check (durum in ('geldi', 'izinli', 'izinsiz')),
  saat time not null default current_time,
  not_metni text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ogrenci_id, tarih)
);

-- Giriş erişim kodları (kullanıcı adı yerine tek şifre/kod dağıtıyorsunuz)
create table if not exists erisim_kodlari (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  sahip_adi text not null,        -- bu kodu kime verdiniz (Müdür, Rehber Abi vs.)
  yetki text not null default 'yonetici' check (yetki in ('yonetici','yoklamaci')),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  son_giris timestamptz
);

-- Varsayılan gruplar
insert into gruplar (isim, siralama) values
  ('5. Sınıf', 1),
  ('6. Sınıf', 2),
  ('7. Sınıf', 3),
  ('8. Sınıf', 4)
on conflict (isim) do nothing;

-- İlk yönetici kodu (giriş yaptıktan hemen sonra Admin panelden değiştirin/silin)
insert into erisim_kodlari (kod, sahip_adi, yetki) values
  ('YT2026', 'İlk Kurulum', 'yonetici')
on conflict (kod) do nothing;

-- Row Level Security: bu tablolara sadece sunucu tarafı (service role) erişecek,
-- tarayıcıdan doğrudan erişim kapalı. Uygulama zaten tüm sorguları kendi
-- API route'ları üzerinden (service role ile) yapıyor.
alter table gruplar enable row level security;
alter table ogrenciler enable row level security;
alter table yoklama enable row level security;
alter table erisim_kodlari enable row level security;
-- Hiçbir public policy eklemiyoruz -> anon key ile hiçbir şey okunamaz/yazılamaz.
