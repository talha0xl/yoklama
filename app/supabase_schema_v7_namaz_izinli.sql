-- ============================================================
-- Yavuztürk Süleymaniye Portal — v7 eklentisi
-- Bu dosyayı Supabase projenizde SQL Editor > New query içine
-- yapıştırıp Run deyin. (v6'dan sonra çalıştırın.)
--
-- Ne değişti: Namaz Yoklama'ya "İzinli" durumu eklendi (Kıldı / Geç
-- Kıldı / İzinli / Kılmadı). Bu satır, veritabanının "izinli" değerini
-- de kabul etmesi için gereken tek değişiklik — arayüz tarafı zaten
-- kod içinde güncellendi.
-- ============================================================

alter table namaz_yoklama drop constraint if exists namaz_yoklama_durum_check;
alter table namaz_yoklama add constraint namaz_yoklama_durum_check
  check (durum in ('kildi', 'gec_kildi', 'izinli', 'kilmadi'));
