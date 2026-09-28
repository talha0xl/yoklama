import { supabaseServer } from "./supabaseServer";
import { sirdakiOge } from "./rotasyon";
import { sunucuTarihiISO } from "./zaman";
import { modulErisimVarMi } from "./moduller";

// Sunum Modu ve normal ana sayfa "bugünün vazifeleri" kısmının ortak
// mantığı: bugün hangi kişi/grup görevli, rotasyon sırasına göre hesaplar.
async function tekVazifeGetir(supabase, liste, tarih) {
  const [{ data: kisiler }, { data: gruplar }] = await Promise.all([
    supabase.from("gorev_kisileri").select("*").eq("aktif", true).eq("liste_id", liste.id).order("sira"),
    supabase.from("gorev_gruplari").select("*").eq("liste_id", liste.id).order("siralama"),
  ]);
  const birimler =
    gruplar && gruplar.length
      ? gruplar.map((g) => ({ isim: g.isim }))
      : (kisiler || []).map((k) => ({ isim: k.ad_soyad }));
  if (!birimler.length) return null;
  const bugunVazifeli = sirdakiOge(birimler, liste.rotasyon_baslangic, tarih);
  return bugunVazifeli ? { liste: liste.isim, kisi: bugunVazifeli.isim } : null;
}

async function vazifelerGetir(supabase, tarih) {
  const { data: listeler } = await supabase.from("gorev_listeleri").select("*").eq("rotasyonlu", true).order("siralama");
  const sonuclar = await Promise.all((listeler || []).map((liste) => tekVazifeGetir(supabase, liste, tarih)));
  return sonuclar.filter(Boolean);
}

// Sunum Modu için: bugünün toplam öğrenci/yoklama/vazife özeti.
// grupId verilirse sadece o grup, verilmezse tüm öğrenciler ("Toplu Talebe").
// turId verilirse sadece o yoklama türü, verilmezse günün tüm türleri birlikte.
export async function sunumVerisiGetir(session, { grupId, turId, tarih: secilenTarih } = {}) {
  const supabase = supabaseServer();
  const tarih = secilenTarih || sunucuTarihiISO();

  let ogrQ = supabase.from("ogrenciler").select("id", { count: "exact" }).eq("aktif", true);
  if (grupId) ogrQ = ogrQ.eq("grup_id", grupId);
  const { data: aktifOgrenciler, count: toplamOgrenci } = await ogrQ;
  const aktifIdler = (aktifOgrenciler || []).map((o) => o.id);

  let yoklama = null;
  if (modulErisimVarMi(session, "duz_yoklama") && aktifIdler.length) {
    let q = supabase.from("yoklama").select("durum").eq("tarih", tarih).in("ogrenci_id", aktifIdler);
    if (turId) q = q.eq("tur_id", turId);
    const { data: kayitlar } = await q;
    const liste = kayitlar || [];
    yoklama = {
      geldi: liste.filter((k) => k.durum === "geldi").length,
      izinli: liste.filter((k) => k.durum === "izinli").length,
      izinsiz: liste.filter((k) => k.durum === "izinsiz").length,
      toplamIsaretlenen: liste.length,
    };
  }

  const vazifeler = modulErisimVarMi(session, "gorev_listeleri") ? await vazifelerGetir(supabase, tarih).catch(() => []) : [];

  return {
    tarih,
    toplamOgrenci: toplamOgrenci || 0,
    yoklama,
    vazifeler,
  };
}
