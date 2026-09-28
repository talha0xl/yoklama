-- ============================================================
-- Yavuztürk Süleymaniye Portal — v8 eklentisi
-- Bu dosyayı Supabase projenizde SQL Editor > New query içine
-- yapıştırıp Run deyin. (v7'den sonra çalıştırın.)
--
-- Ne değişti: Öğrenci kaydına anne/baba/diğer bir yakın için ayrı ayrı
-- ad, telefon ve (anne/baba için) meslek alanları eklendi. Eski
-- "veli_adi" / "veli_telefon" alanları da olduğu gibi duruyor (eski
-- kayıtlar bozulmasın diye) — yeni öğrenci eklerken artık yeni alanlar
-- kullanılacak.
-- ============================================================

alter table ogrenciler add column if not exists anne_adi text;
alter table ogrenciler add column if not exists anne_telefon text;
alter table ogrenciler add column if not exists anne_meslek text;
alter table ogrenciler add column if not exists baba_adi text;
alter table ogrenciler add column if not exists baba_telefon text;
alter table ogrenciler add column if not exists baba_meslek text;
alter table ogrenciler add column if not exists diger_yakin_yakinlik text;
alter table ogrenciler add column if not exists diger_yakin_adi text;
alter table ogrenciler add column if not exists diger_yakin_telefon text;
