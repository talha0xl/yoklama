-- ============================================================
-- Yavuztürk Süleymaniye Portal — v10 eklentisi
-- Bu dosyanın TAMAMINI Supabase projenizde SQL Editor > New query
-- içine yapıştırıp Run deyin. (v9'dan sonra çalıştırın.)
--
-- Ne yapıyor: gönderdiğiniz gel.xlsm dosyasındaki 74 öğrenciyi
-- sınıf/şube gruplarına (5-A, 5-B, 6-A, 6-B, 7-A, 7-B, 8. Sınıf)
-- ayırarak sisteme ekliyor. Excel'de veli telefon/isim bilgisi
-- olmadığı için öğrenciler veli bilgisi olmadan ekleniyor —
-- Yönetim > Öğrenciler'den "Detay" açıp "+ Veli Ekle" ile
-- ekleyebilirsiniz. Bu dosyayı tekrar çalıştırmak güvenlidir,
-- aynı isim+grup zaten varsa tekrar eklemez.
-- ============================================================

insert into gruplar (isim, siralama) values
  ('5-A', 10), ('5-B', 11), ('6-A', 12), ('6-B', 13), ('7-A', 14), ('7-B', 15), ('5. Sınıf (Grupsuz)', 16)
on conflict (isim) do nothing;
-- '8. Sınıf' zaten ilk kurulumda oluşturulmuştu, o gruba ekleniyor.

-- ---------- 5-B (7 öğrenci) ----------
insert into ogrenciler (ad_soyad, grup_id)
select v.ad_soyad, g.id from (values
  ('Ahmet Eşram'),
  ('Ali Eşram'),
  ('Ahmet Hindavi'),
  ('Emre Erdem'),
  ('Muhammed Baka'),
  ('Muhammed İyşa'),
  ('Nadir Rehawe Zanrani')
) as v(ad_soyad) cross join (select id from gruplar where isim = '5-B') as g
where not exists (select 1 from ogrenciler o where o.ad_soyad = v.ad_soyad and o.grup_id = g.id);

-- ---------- 5-A (13 öğrenci) ----------
insert into ogrenciler (ad_soyad, grup_id)
select v.ad_soyad, g.id from (values
  ('Ahmet Kemal Kahraman'),
  ('Arif Tuna Öncel'),
  ('Eymen Asaf Aldemir'),
  ('Hasan Alp Varıcı'),
  ('Mehmet Akif Karakaya'),
  ('Muhammed Emir Özduygu'),
  ('Selman Seha Özdalkıran'),
  ('Oğuzhan Arif Akyürek'),
  ('Ömer Asaf Orhan'),
  ('Melih Çaputlu'),
  ('Ömer Ezel Kaya'),
  ('Yavuz Selim Keleş'),
  ('Miraç Bayıroğlu')
) as v(ad_soyad) cross join (select id from gruplar where isim = '5-A') as g
where not exists (select 1 from ogrenciler o where o.ad_soyad = v.ad_soyad and o.grup_id = g.id);

-- ---------- 6-A (19 öğrenci) ----------
insert into ogrenciler (ad_soyad, grup_id)
select v.ad_soyad, g.id from (values
  ('Mehmet Emin Dilek'),
  ('Abdulsamet Baran Çakar'),
  ('Bünyamin Yıldız'),
  ('Hasan Çağlar Bozkurt'),
  ('Muaz Selim Sevinç'),
  ('Selim Gebeş'),
  ('Ahmet İlhan Sarıdağ'),
  ('Arif İsmail Topal'),
  ('Cem Yiğit Arıkan'),
  ('Hüseyin Ağca'),
  ('Muhammed Emin Köküm'),
  ('Muhammed Ömer Akyürek'),
  ('Ömer Akif Bozkurt'),
  ('Ömer Faruk Şentürk'),
  ('Turgay Hasan Sarıdağ'),
  ('Yiğit Eymen Kavalcı'),
  ('Yavuz Selim Hasar'),
  ('Şaban Enes Alkurt'),
  ('Ahmet Özpınar')
) as v(ad_soyad) cross join (select id from gruplar where isim = '6-A') as g
where not exists (select 1 from ogrenciler o where o.ad_soyad = v.ad_soyad and o.grup_id = g.id);

-- ---------- 6-B (6 öğrenci) ----------
insert into ogrenciler (ad_soyad, grup_id)
select v.ad_soyad, g.id from (values
  ('Ahmet Ergören'),
  ('Miraç Tunahan Üner'),
  ('Yusuf Bilal'),
  ('Ali Osman Altaş'),
  ('Mehmet Selim Karaoğlan'),
  ('Ömer Asaf Akgül')
) as v(ad_soyad) cross join (select id from gruplar where isim = '6-B') as g
where not exists (select 1 from ogrenciler o where o.ad_soyad = v.ad_soyad and o.grup_id = g.id);

-- ---------- 7-A (11 öğrenci) ----------
insert into ogrenciler (ad_soyad, grup_id)
select v.ad_soyad, g.id from (values
  ('Ali Osman Edis'),
  ('Ahmet Fatih Şimşek'),
  ('Alisamed Çakır'),
  ('Bilal Efe Güney'),
  ('Ömer Efe Yardımcı'),
  ('Onur Eymen Karadağ'),
  ('Onur Yiğithan Köçer'),
  ('Salih Eymen Çoban'),
  ('Siraç Kemer'),
  ('Tunahan Çetin'),
  ('Musab Akıncı')
) as v(ad_soyad) cross join (select id from gruplar where isim = '7-A') as g
where not exists (select 1 from ogrenciler o where o.ad_soyad = v.ad_soyad and o.grup_id = g.id);

-- ---------- 7-B (9 öğrenci) ----------
insert into ogrenciler (ad_soyad, grup_id)
select v.ad_soyad, g.id from (values
  ('Ahmet Hilmi Akyürek'),
  ('Miraç Ali Katırcıoğlu'),
  ('Hamza Varıcı'),
  ('Mehmet Arif Özcan'),
  ('Metehan Yiğit Aygün'),
  ('Muhammed Musa Köküm'),
  ('Yiğit Can Çelikbaş'),
  ('Emir Berat Karakum'),
  ('Yağız Selim Zülfikar')
) as v(ad_soyad) cross join (select id from gruplar where isim = '7-B') as g
where not exists (select 1 from ogrenciler o where o.ad_soyad = v.ad_soyad and o.grup_id = g.id);

-- ---------- 8. Sınıf (5 öğrenci) ----------
insert into ogrenciler (ad_soyad, grup_id)
select v.ad_soyad, g.id from (values
  ('Ahmet Talha Çetin'),
  ('Eymen Baha Yurtsever'),
  ('Umut Kayra Bozkuş'),
  ('Salih Altaş'),
  ('Alihan Ulusoy')
) as v(ad_soyad) cross join (select id from gruplar where isim = '8. Sınıf') as g
where not exists (select 1 from ogrenciler o where o.ad_soyad = v.ad_soyad and o.grup_id = g.id);

-- ---------- 5. Sınıf (Grupsuz) (4 öğrenci) ----------
insert into ogrenciler (ad_soyad, grup_id)
select v.ad_soyad, g.id from (values
  ('Atakan'),
  ('Kuzey'),
  ('Ali Furkan Akdemir'),
  ('Mehmet Ali Geyik')
) as v(ad_soyad) cross join (select id from gruplar where isim = '5. Sınıf (Grupsuz)') as g
where not exists (select 1 from ogrenciler o where o.ad_soyad = v.ad_soyad and o.grup_id = g.id);
