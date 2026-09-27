-- ============================================================
-- Yavuztürk Süleymaniye Portal — v14 eklentisi
-- Bu dosyanın TAMAMINI Supabase projenizde SQL Editor > New query
-- içine yapıştırıp Run deyin.
--
-- Ne yapıyor: Sayı 62'ye düşmüş görünüyordu — muhtemelen bazı
-- öğrenciler ana portalda "pasif" (silinmiş) duruma düşmüş, bu da
-- Kitap Takip'teki karşılıklarının da otomatik kalkmasına yol açmış
-- olabilir. Bu dosya:
--
--   1) Ana portalda pasif (aktif=false) durumda kalmış TÜM öğrencileri
--      tekrar aktif yapar (yani "silinmiş" görünenleri geri getirir).
--   2) Her sınıf/grup için Kitap Takip'te bir hoca kaydı olduğundan
--      emin olur (aynı isimde zaten varsa yeni açmaz).
--   3) Aktif olan ama Kitap Takip'te karşılığı bulunmayan HER öğrenciyi
--      Kitap Takip'e de geri ekler (v13'teki mantığın aynısı, ama artık
--      belli sınıf isimleriyle sınırlı değil, TÜM gruplar için).
--
-- ÖNEMLİ NOT: Bu dosya bir öğrencinin ana portaldaki kaydını (adı,
-- grubu) geri getirebilir çünkü o kayıt veritabanında zaten duruyordu,
-- sadece pasif işaretliydi. AMA eğer bir öğrencinin Kitap Takip'teki
-- kitap/okuma geçmişi (books/logs) daha önce gerçekten silinmişse, bu
-- dosya sadece öğrenciyi BOŞ bir kayıtla yeniden ekler — silinmiş
-- kitap/okuma kayıtlarını geri getiremez, onlar kalıcı olarak gitmiş
-- demektir.
--
-- Eğer aslında bazı öğrencilerin BİLEREK (gerçekten ayrıldıkları için)
-- pasif bırakılmasını istiyorsanız, bu dosyayı çalıştırdıktan sonra
-- onları ana portaldaki Öğrenciler ekranından tekrar "Kaldır"a
-- basarak pasif yapabilirsiniz.
--
-- Bu dosyayı tekrar çalıştırmak güvenlidir (aynı kayıt ikinci kez
-- eklenmez, zaten aktif olan tekrar aktif yapılmaya çalışılmaz).
-- ============================================================

-- 1) Ana portalda pasif düşmüş öğrencileri tekrar aktif yap
update ogrenciler set aktif = true where aktif = false;

-- 2) Her grup/sınıf için Kitap Takip'te bir hoca olduğundan emin ol
insert into teachers (id, name)
select gen_random_uuid()::text, g.isim
from gruplar g
where not exists (select 1 from teachers t where t.name = g.isim);

-- 3) Aktif olan ama Kitap Takip'te karşılığı olmayan öğrencileri ekle
insert into students (id, teacher_id, name)
select gen_random_uuid()::text, t.id, o.ad_soyad
from ogrenciler o
join gruplar g on g.id = o.grup_id
join teachers t on t.name = g.isim
where o.aktif = true
  and not exists (
    select 1 from students s where s.teacher_id = t.id and s.name = o.ad_soyad
  );

-- 4) Kontrol için: şu an ana portalda kaç aktif öğrenci, Kitap Takip'te kaç öğrenci var
select
  (select count(*) from ogrenciler where aktif = true) as ana_portal_aktif_sayisi,
  (select count(*) from students) as kitap_takip_sayisi;
