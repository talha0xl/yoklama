-- ============================================================
-- v17: Otomatik yedekleme (haftalık/aylık, admin panelinden seçilebilir)
--
-- Nasıl çalışır: Vercel her gün bir kere /api/yedek/oto adresini
-- otomatik çağırır (vercel.json > crons). O uç nokta, burada
-- seçtiğiniz sıklığa (haftalık = 7 gün, aylık = 30 gün) göre süre
-- dolmuşsa yeni bir yedek alıp "yedekler" tablosuna kaydeder, süre
-- dolmadıysa hiçbir şey yapmaz. En eski yedekler otomatik silinir,
-- en fazla son 12 tanesi tutulur. Yönetim > Yedekle sekmesinden
-- geçmiş otomatik yedekleri görüp indirebilirsiniz.
-- ============================================================

create table if not exists yedek_ayarlari (
  id int primary key default 1,
  siklik text not null default 'haftalik' check (siklik in ('haftalik', 'aylik')),
  son_yedek_tarihi timestamptz,
  constraint yedek_ayarlari_tek_satir check (id = 1)
);
insert into yedek_ayarlari (id, siklik) values (1, 'haftalik') on conflict (id) do nothing;

create table if not exists yedekler (
  id uuid primary key default gen_random_uuid(),
  olusturma_tarihi timestamptz not null default now(),
  icerik jsonb not null
);
create index if not exists idx_yedekler_olusturma_tarihi on yedekler(olusturma_tarihi desc);

alter table yedek_ayarlari enable row level security;
alter table yedekler enable row level security;
-- Bu 2 tabloya da public policy yok: sadece sunucu (service role) erişir.
