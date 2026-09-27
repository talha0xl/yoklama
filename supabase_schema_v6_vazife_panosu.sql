-- ============================================================
-- Yavuztürk Süleymaniye Portal — v6 eklentisi
-- Bu dosyayı Supabase projenizde SQL Editor > New query içine
-- yapıştırıp Run deyin. (v5'ten sonra çalıştırın.)
--
-- Ne değişti: Görev Listeleri artık günlük "yaptı/yapmadı" işaretleme
-- ekranı değil, "bugün kim vazifeli" panosu. Bu değişiklik kod
-- tarafında yapıldı, burada sadece Yemekçilik'i de otomatik sıraya
-- (rotasyon) dahil ediyoruz — gruplarınız varsa gruplar arasında,
-- yoksa kişiler arasında sırayla döner.
-- ============================================================

update gorev_listeleri set rotasyonlu = true where isim = 'Yemekçilik';
