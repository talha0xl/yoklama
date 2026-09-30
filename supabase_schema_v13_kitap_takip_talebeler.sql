-- ============================================================
-- Yavuztürk Süleymaniye Portal — v13 eklentisi
-- Bu dosyanın TAMAMINI Supabase projenizde SQL Editor > New query
-- içine yapıştırıp Run deyin. (v10'dan SONRA çalıştırın — ana
-- portaldaki gerçek öğrenci/sınıf verisine ihtiyaç duyuyor.)
--
-- Ne yapıyor: Ana portaldaki (ogrenciler/gruplar) 74 gerçek talebeyi
-- Kitap Takip'e de ekliyor. Kitap Takip'te öğrenciler bir HOCA'ya
-- bağlı olmak zorunda, o yüzden her sınıf (5-A, 5-B, 6-A, 6-B, 7-A,
-- 7-B, 8. Sınıf, 5. Sınıf (Grupsuz)) için kendi adıyla bir hoca
-- kaydı açılıyor ve o sınıfın öğrencileri o hocaya ekleniyor.
--
-- Kitap Takip'i zaten kullanıyorsanız ve bu sınıf adlarıyla AYNI
-- İSİMDE bir hocanız varsa, yeni bir hoca AÇILMIYOR — o mevcut
-- hocanın altına ekleniyor (isimle eşleştiriyor). Farklı bir isimle
-- kayıtlı hocalarınız varsa (örn. kendi adınızla), bu dosya onlara
-- dokunmaz; öğrencileri elle o hocaya taşımanız/eklemeniz gerekir.
--
-- Veli telefonu BOŞ bırakıldı — ana portalda bu 74 öğrenci için de
-- henüz telefon girilmemiş (girilmişse bile iki ayrı sistem, elle
-- taşınması gerekir). Kitap Takip'in WhatsApp bilgilendirmesini
-- kullanacaksanız telefonları Kitap Takip ekranından öğrenci öğrenci
-- girmeniz gerekecek.
--
-- Bu dosyayı tekrar çalıştırmak güvenlidir (aynı kayıt ikinci kez
-- eklenmez).
-- ============================================================

-- 1) Sınıf başına hoca (aynı isimde zaten varsa dokunma)
insert into teachers (id, name)
select gen_random_uuid()::text, v.isim
from (values ('5-A'), ('5-B'), ('6-A'), ('6-B'), ('7-A'), ('7-B'), ('8. Sınıf'), ('5. Sınıf (Grupsuz)')) as v(isim)
where not exists (select 1 from teachers t where t.name = v.isim);

-- 2) O sınıfın aktif öğrencilerini kendi hocasına ekle (aynı isimde zaten
--    o hocanın altında bir öğrenci varsa tekrar eklenmez)
insert into students (id, teacher_id, name)
select gen_random_uuid()::text, t.id, o.ad_soyad
from ogrenciler o
join gruplar g on g.id = o.grup_id
join teachers t on t.name = g.isim
where o.aktif = true
  and g.isim in ('5-A', '5-B', '6-A', '6-B', '7-A', '7-B', '8. Sınıf', '5. Sınıf (Grupsuz)')
  and not exists (
    select 1 from students s where s.teacher_id = t.id and s.name = o.ad_soyad
  );
