-- ============================================================
-- Yavuztürk Süleymaniye Portal — v5 eklentisi
-- Bu dosyayı Supabase projenizde SQL Editor > New query içine
-- yapıştırıp Run deyin. Mevcut verilerinize dokunmaz, sadece
-- ekleme yapar. (v4'ten sonra çalıştırın.)
--
-- Ne ekliyor:
--  1) Görev listelerinde artık sabit "5 vakit" yerine HER LİSTE
--     kendi alt kategorilerini tanımlayabiliyor (örn. Yemekçilik
--     için Kahvaltı/Öğle/Akşam, istediğiniz kadar ekleyebilirsiniz).
--  2) Otomatik nöbet sırası (rotasyon): bir listeyi "rotasyonlu"
--     yaptığınızda, sıradaki kişi tarihe göre otomatik hesaplanır,
--     siz sadece kişileri sıraya bir kere dizersiniz.
--  3) Nöbetçi, Çaycı, Müezzinlik için varsayılan rotasyon ayarları.
-- ============================================================

-- ---------- 1) Görev kategorileri (serbest, listeye özel alt başlıklar) ----------
create table if not exists gorev_kategorileri (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references gorev_listeleri(id) on delete cascade,
  isim text not null,
  siralama int not null default 0,
  created_at timestamptz not null default now(),
  unique (liste_id, isim)
);
alter table gorev_kategorileri enable row level security;
create index if not exists idx_gorev_kategorileri_liste_id on gorev_kategorileri(liste_id);

-- vakit artık sabit 5 vakitle sınırlı değil, listeye özel herhangi bir kategori adı olabilir
alter table gorev_kayitlari drop constraint if exists gorev_kayitlari_vakit_check;

-- Müezzinlik'in kategorileri: 5 vakit
insert into gorev_kategorileri (liste_id, isim, siralama)
select gl.id, v.isim, v.sira
from gorev_listeleri gl
cross join (values ('Sabah',1),('Öğle',2),('İkindi',3),('Akşam',4),('Yatsı',5)) as v(isim, sira)
where gl.isim = 'Müezzinlik'
on conflict (liste_id, isim) do nothing;

-- Yemekçilik'i de kategori bazlı yapıp öğün kategorilerini ekleyelim
update gorev_listeleri set vakit_bazli = true where isim = 'Yemekçilik';
insert into gorev_kategorileri (liste_id, isim, siralama)
select gl.id, v.isim, v.sira
from gorev_listeleri gl
cross join (values ('Kahvaltı',1),('Öğle',2),('Akşam',3)) as v(isim, sira)
where gl.isim = 'Yemekçilik'
on conflict (liste_id, isim) do nothing;

-- ---------- 2) Otomatik nöbet sırası (rotasyon) ----------
alter table gorev_listeleri add column if not exists rotasyonlu boolean not null default false;
alter table gorev_listeleri add column if not exists rotasyon_baslangic date not null default current_date;

-- Nöbetçi ve Çaycı: tek kişi, günde bir kişiye otomatik geçsin
update gorev_listeleri set rotasyonlu = true where isim in ('Nöbetçi', 'Çaycı');
-- Çaycı listesi yoksa açalım
insert into gorev_listeleri (isim, siralama, vakit_bazli, rotasyonlu) values ('Çaycı', 4, false, true)
on conflict (isim) do nothing;

-- Müezzinlik: hem vakit bazlı hem rotasyonlu (o gün sırada olan kişi 5 vakti de o gün yapar)
update gorev_listeleri set rotasyonlu = true where isim = 'Müezzinlik';
