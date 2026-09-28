-- ============================================================
-- Yavuztürk Süleymaniye Portal — v12 eklentisi
-- Bu dosyanın TAMAMINI Supabase projenizde SQL Editor > New query
-- içine yapıştırıp Run deyin. (v10 ve v11'den SONRA çalıştırın —
-- Müezzinlik kısmı, v10'da eklenen gerçek öğrenci/grup verisine
-- ihtiyaç duyuyor.)
--
-- Ne yapıyor — Görev Listeleri'ne (Yemekçilik, Müezzinlik, Çaycı,
-- Nöbetçi) gerçek isimleri dolduruyor:
--
-- 1) Yemekçilik: gönderdiğiniz "Yemekçilik Listesi" resmindeki
--    8 grup + Yedekler, isim isim giriliyor. Yedekler'e ayrı bir
--    grup açılmadı — onlar listede duruyor ama günlük sıraya
--    (rotasyona) dahil değiller, ihtiyaç olunca elle yerine
--    bakılır. Sıra, resimdeki grup numarasına göre (1. Grup →
--    8. Grup) ilerliyor.
-- 2) Çaycı: Ömer Efe Yardımcı, Onur Eymen Karadağ, Musab Akıncı,
--    Mehmet Selim Karaoğlan, Ahmet İlhan Sarıdağ — bu sırayla,
--    gruplaşmadan (kişi kişi dönüşümlü).
-- 3) Nöbetçi: Ahmet İlhan Sarıdağ, Musab Akıncı — bu sırayla.
-- 4) Müezzinlik: "8'lerden başla, sonra 7'ler, sonra 6'lar, sonra
--    5'ler" dediğiniz sıralamayı, isimleri yeniden yazmanıza
--    gerek kalmadan, sistemde zaten kayıtlı GERÇEK öğrenci
--    listesinden (ogrenciler + gruplar tabloları, v10'da girilen)
--    otomatik olarak çekiyor. Sınıf içindeki sıralama: önce
--    şubeye göre (A sonra B), sonra isme göre alfabetik.
--
-- Bu dosyayı tekrar çalıştırmak güvenlidir (aynı kayıt ikinci kez
-- eklenmez).
-- ============================================================

-- ---------- 1) YEMEKÇİLİK: 8 grup + Yedekler ----------

insert into gorev_gruplari (liste_id, isim, siralama)
select gl.id, v.isim, v.sira
from gorev_listeleri gl
cross join (values
  ('1. Grup', 1), ('2. Grup', 2), ('3. Grup', 3), ('4. Grup', 4),
  ('5. Grup', 5), ('6. Grup', 6), ('7. Grup', 7), ('8. Grup', 8)
) as v(isim, sira)
where gl.isim = 'Yemekçilik'
on conflict (liste_id, isim) do nothing;

-- Grup üyeleri (resimdeki sırayla)
insert into gorev_kisileri (liste_id, grup_id, ad_soyad, sira)
select gl.id, gg.id, v.ad_soyad, v.sira
from gorev_listeleri gl
join gorev_gruplari gg on gg.liste_id = gl.id
cross join (values
  ('1. Grup', 'M. Emin Köküm', 1), ('1. Grup', 'Ahmet Hilmi Akyürek', 2), ('1. Grup', 'Yağız Selim Zülfikar', 3), ('1. Grup', 'Yusuf Bilal', 4),
  ('2. Grup', 'Cem Yiğit Arıkan', 1), ('2. Grup', 'Metehan Aygün', 2), ('2. Grup', 'Hüseyin Ağca', 3), ('2. Grup', 'Alihan Ulusoy', 4),
  ('3. Grup', 'Bünyamin Yıldız', 1), ('3. Grup', 'Hamza Varıcı', 2), ('3. Grup', 'Onur Yiğithan Köçer', 3), ('3. Grup', 'Umut Kayra Bozkuş', 4),
  ('4. Grup', 'Ahmet İlhan Sarıdağ', 1), ('4. Grup', 'Tunahan Çetin', 2), ('4. Grup', 'Ahmet Talha Çetin', 3), ('4. Grup', 'Arif İsmail Topal', 4),
  ('5. Grup', 'Miraç Tunahan Üner', 1), ('5. Grup', 'Miraç Ali Katırcıoğlu', 2), ('5. Grup', 'Musab Akıncı', 3), ('5. Grup', 'Salih Altaş', 4),
  ('6. Grup', 'Ali Osman Altaş', 1), ('6. Grup', 'Mehmet Arif Özcan', 2), ('6. Grup', 'Ahmet Ergören', 3), ('6. Grup', 'Onur Eymen Karadağ', 4),
  ('7. Grup', 'M. Ömer Akyürek', 1), ('7. Grup', 'Ömer Efe Yardımcı', 2), ('7. Grup', 'Mehmet Selim Karaoğlan', 3), ('7. Grup', 'Ahmet Emir Şengül', 4),
  ('8. Grup', 'Yavuz Selim Hasar', 1), ('8. Grup', 'M. Musa Köküm', 2), ('8. Grup', 'Muaz Selim Sevinç', 3), ('8. Grup', 'Ali Osman Edis', 4)
) as v(grup_isim, ad_soyad, sira)
where gl.isim = 'Yemekçilik' and gg.isim = v.grup_isim
  and not exists (
    select 1 from gorev_kisileri k where k.liste_id = gl.id and k.ad_soyad = v.ad_soyad
  );

-- Yedekler — gruba bağlı değil, günlük rotasyona dahil olmaz, sadece listede dursun diye
insert into gorev_kisileri (liste_id, grup_id, ad_soyad, sira)
select gl.id, null, v.ad_soyad, v.sira
from gorev_listeleri gl
cross join (values
  ('Ömer Akif Bozkurt', 101), ('Yiğitcan Çelikbaş', 102), ('Bilal Efe Güney', 103)
) as v(ad_soyad, sira)
where gl.isim = 'Yemekçilik'
  and not exists (
    select 1 from gorev_kisileri k where k.liste_id = gl.id and k.ad_soyad = v.ad_soyad
  );

-- ---------- 2) ÇAYCI: kişi kişi dönüşümlü, grup yok ----------

insert into gorev_kisileri (liste_id, grup_id, ad_soyad, sira)
select gl.id, null, v.ad_soyad, v.sira
from gorev_listeleri gl
cross join (values
  ('Ömer Efe Yardımcı', 1), ('Onur Eymen Karadağ', 2), ('Musab Akıncı', 3),
  ('Mehmet Selim Karaoğlan', 4), ('Ahmet İlhan Sarıdağ', 5)
) as v(ad_soyad, sira)
where gl.isim = 'Çaycı'
  and not exists (
    select 1 from gorev_kisileri k where k.liste_id = gl.id and k.ad_soyad = v.ad_soyad
  );

-- ---------- 3) NÖBETÇİ: kişi kişi dönüşümlü, grup yok ----------

insert into gorev_kisileri (liste_id, grup_id, ad_soyad, sira)
select gl.id, null, v.ad_soyad, v.sira
from gorev_listeleri gl
cross join (values
  ('Ahmet İlhan Sarıdağ', 1), ('Musab Akıncı', 2)
) as v(ad_soyad, sira)
where gl.isim = 'Nöbetçi'
  and not exists (
    select 1 from gorev_kisileri k where k.liste_id = gl.id and k.ad_soyad = v.ad_soyad
  );

-- ---------- 4) MÜEZZİNLİK: gerçek öğrenci listesinden, 8→7→6→5 sırayla ----------
-- Grup adlarının BAŞINDAKİ rakam (5-A, 6-B, 7. Sınıf, 8. Sınıf gibi) sınıf
-- seviyesini veriyor — o rakama göre büyükten küçüğe (8,7,6,5) sıralıyoruz,
-- sınıf içinde de şube adına ve isme göre.

insert into gorev_kisileri (liste_id, grup_id, ad_soyad, sira)
select ml.id, null, x.ad_soyad, x.sira
from gorev_listeleri ml
cross join lateral (
  select
    o.ad_soyad,
    row_number() over (
      order by
        cast(substring(g.isim from '^[0-9]') as int) desc,  -- 8 önce, sonra 7, 6, 5
        g.siralama,
        o.ad_soyad
    ) as sira
  from ogrenciler o
  join gruplar g on g.id = o.grup_id
  where o.aktif = true
    and substring(g.isim from '^[0-9]') is not null  -- sadece "5-A", "6. Sınıf" gibi sayıyla başlayan sınıf grupları
) as x
where ml.isim = 'Müezzinlik'
  and not exists (
    select 1 from gorev_kisileri k where k.liste_id = ml.id and k.ad_soyad = x.ad_soyad
  );
