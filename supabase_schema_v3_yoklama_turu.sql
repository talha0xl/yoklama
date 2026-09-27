-- ============================================================
-- Yavuztürk Süleymaniye Portal — v3 eklentisi
-- Bu dosyayı Supabase projenizde SQL Editor > New query içine
-- yapıştırıp Run deyin. Mevcut yoklama verilerinize dokunmaz,
-- hepsini otomatik olarak "Günlük Yoklama" türüne bağlar.
--
-- Ne ekliyor: Yurt Yoklama'ya "tür" kavramı. Artık aynı gün için
-- birden fazla amaçla yoklama alınabilir (örn. "Günlük Yoklama" ve
-- ayrıca "Pazar İzin Dönüşü") — her biri ayrı ayrı kayıt tutar.
-- ============================================================

create table if not exists yoklama_turleri (
  id uuid primary key default gen_random_uuid(),
  isim text not null unique,
  siralama int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

insert into yoklama_turleri (isim, siralama) values ('Günlük Yoklama', 1)
on conflict (isim) do nothing;

alter table yoklama add column if not exists tur_id uuid references yoklama_turleri(id);

update yoklama set tur_id = (select id from yoklama_turleri where isim = 'Günlük Yoklama')
where tur_id is null;

alter table yoklama alter column tur_id set not null;

alter table yoklama drop constraint if exists yoklama_ogrenci_id_tarih_key;
alter table yoklama drop constraint if exists yoklama_ogrenci_tarih_tur_key;
alter table yoklama add constraint yoklama_ogrenci_tarih_tur_key unique (ogrenci_id, tarih, tur_id);

alter table yoklama_turleri enable row level security;
-- Public policy yok: sadece sunucu (service role) erişir, diğer tablolarla aynı kural.
