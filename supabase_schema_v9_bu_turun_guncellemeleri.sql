-- ============================================================
-- Yavuztürk Süleymaniye Portal — v9 eklentisi
-- Bu dosyanın TAMAMINI Supabase projenizde SQL Editor > New query
-- içine yapıştırıp Run deyin. (v8'den sonra çalıştırın. Daha önce
-- v7 veya v8'i hiç çalıştırmadıysanız da sorun değil, bu dosya
-- onları da güvenle tekrar uygular.)
--
-- Ne değişti:
-- 1) Namaz Yoklama'da "İzinli" durumunun kabul edildiğinden emin
--    olunuyor (v7'yi hiç çalıştırmadıysanız İzinli'ye bastığınızda
--    kayıt sunucuda reddedilip otomatik eski haline dönüyordu —
--    bu satır tam olarak o sorunu çözer).
-- 2) Öğrenci yakınları artık sabit Anne/Baba alanları yerine esnek
--    bir tabloda: istediğiniz kadar yakın ekleyebilirsiniz (isim,
--    telefon, meslek, yaşadığı yer). Eski anne/baba/diğer/veli
--    verileriniz otomatik olarak yeni tabloya taşınıyor, hiçbir şey
--    kaybolmuyor.
-- 3) Veli Bilgilendirme mesaj şablonları artık veritabanında
--    saklanıyor, birden fazla şablon oluşturup düzenleyebilirsiniz.
-- ============================================================

-- ---------- 1) Namaz Yoklama İzinli düzeltmesi ----------
alter table namaz_yoklama drop constraint if exists namaz_yoklama_durum_check;
alter table namaz_yoklama add constraint namaz_yoklama_durum_check
  check (durum in ('kildi', 'gec_kildi', 'izinli', 'kilmadi'));

-- ---------- 2) Esnek öğrenci yakınları tablosu ----------
create table if not exists ogrenci_yakinlari (
  id uuid primary key default gen_random_uuid(),
  ogrenci_id uuid not null references ogrenciler(id) on delete cascade,
  yakinlik text not null,       -- "Anne", "Baba", "Amca" gibi serbest metin
  ad_soyad text,
  telefon text,
  meslek text,
  yasadigi_yer text,
  siralama int not null default 0,
  created_at timestamptz not null default now()
);
alter table ogrenci_yakinlari enable row level security;
create index if not exists idx_ogrenci_yakinlari_ogrenci_id on ogrenci_yakinlari(ogrenci_id);

-- Eski anne/baba/diğer/veli sütunlarındaki veriyi yeni tabloya taşı
-- (her öğrenci + yakınlık türü için sadece bir kere, tekrar çalıştırmak
-- güvenli — zaten taşınmışsa tekrar eklemez).
insert into ogrenci_yakinlari (ogrenci_id, yakinlik, ad_soyad, telefon, meslek, siralama)
select o.id, 'Anne', o.anne_adi, o.anne_telefon, o.anne_meslek, 1
from ogrenciler o
where (o.anne_adi is not null and o.anne_adi <> '') or (o.anne_telefon is not null and o.anne_telefon <> '')
and not exists (select 1 from ogrenci_yakinlari y where y.ogrenci_id = o.id and y.yakinlik = 'Anne');

insert into ogrenci_yakinlari (ogrenci_id, yakinlik, ad_soyad, telefon, meslek, siralama)
select o.id, 'Baba', o.baba_adi, o.baba_telefon, o.baba_meslek, 2
from ogrenciler o
where (o.baba_adi is not null and o.baba_adi <> '') or (o.baba_telefon is not null and o.baba_telefon <> '')
and not exists (select 1 from ogrenci_yakinlari y where y.ogrenci_id = o.id and y.yakinlik = 'Baba');

insert into ogrenci_yakinlari (ogrenci_id, yakinlik, ad_soyad, telefon, siralama)
select o.id, coalesce(nullif(o.diger_yakin_yakinlik, ''), 'Diğer'), o.diger_yakin_adi, o.diger_yakin_telefon, 3
from ogrenciler o
where (o.diger_yakin_adi is not null and o.diger_yakin_adi <> '') or (o.diger_yakin_telefon is not null and o.diger_yakin_telefon <> '')
and not exists (select 1 from ogrenci_yakinlari y where y.ogrenci_id = o.id and y.yakinlik = coalesce(nullif(o.diger_yakin_yakinlik, ''), 'Diğer'));

insert into ogrenci_yakinlari (ogrenci_id, yakinlik, ad_soyad, telefon, siralama)
select o.id, 'Veli', o.veli_adi, o.veli_telefon, 1
from ogrenciler o
where (o.veli_adi is not null and o.veli_adi <> '') or (o.veli_telefon is not null and o.veli_telefon <> '')
and not exists (select 1 from ogrenci_yakinlari y where y.ogrenci_id = o.id)
and not exists (select 1 from ogrenci_yakinlari y where y.ogrenci_id = o.id and y.yakinlik = 'Veli');

-- Yaşadığı yer sütunu öğrenci üstünde de tutulur (aile aynı yerde
-- yaşıyorsa tek bir adres, harita butonu için).
alter table ogrenciler add column if not exists yasadigi_yer text;

-- ---------- 3) Mesaj şablonları ----------
create table if not exists mesaj_sablonlari (
  id uuid primary key default gen_random_uuid(),
  ad text not null unique,
  kaynak text not null default 'genel' check (kaynak in ('yoklama', 'namaz', 'genel')),
  icerik text not null,
  siralama int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table mesaj_sablonlari enable row level security;

insert into mesaj_sablonlari (ad, kaynak, icerik, siralama) values
  ('Yoklama — Standart', 'yoklama', 'Sayın {veli}, {ogrenci} adlı öğrencimizin {tarih} tarihli {tur} durumu: {durum}. Bilginize sunarız. Yavuztürk Süleymaniye Yurdu', 1),
  ('Yoklama — Kısa', 'yoklama', '{ogrenci} — {tarih}: {durum}. Yavuztürk Süleymaniye Yurdu', 2),
  ('Yoklama — Resmi', 'yoklama', 'Sayın {veli}, öğrencimiz {ogrenci}''nin {tarih} tarihindeki {tur} kaydı "{durum}" olarak işlenmiştir. Bilgilerinize sunarız. Saygılarımızla, Yavuztürk Süleymaniye Yurdu Yönetimi', 3),
  ('Namaz Yoklama — Standart', 'namaz', 'Sayın {veli}, {ogrenci} adlı öğrencimizin {tarih} tarihli namaz durumu: {durum}. Bilginize sunarız. Yavuztürk Süleymaniye Yurdu', 1),
  ('Namaz Yoklama — Kısa', 'namaz', '{ogrenci} — {tarih} namaz: {durum}. Yavuztürk Süleymaniye Yurdu', 2),
  ('Namaz Yoklama — Resmi', 'namaz', 'Sayın {veli}, öğrencimiz {ogrenci}''nin {tarih} tarihli namaz vakitleri durumu: {durum}. Bilgilerinize sunarız. Saygılarımızla, Yavuztürk Süleymaniye Yurdu Yönetimi', 3)
on conflict (ad) do nothing;
