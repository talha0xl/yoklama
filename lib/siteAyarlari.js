import { supabaseServer } from "./supabaseServer";

// v15 SQL'i henüz çalıştırılmamışsa (tablo yoksa) ya da satır boşsa,
// portal eskisi gibi sabit varsayılanlarla çalışmaya devam etsin diye.
const VARSAYILAN = {
  ana_portal: { siteAdi: "Yavuztürk Süleymaniye", logoUrl: null, anaRenk: "#28334a" },
  kitap_takip: { siteAdi: "Yavuztürk Süleymaniye — Kitap Takip", logoUrl: null, anaRenk: "#28334a" },
};

export async function siteAyarlariGetir(site) {
  const varsayilan = VARSAYILAN[site] || VARSAYILAN.ana_portal;
  try {
    const supabase = supabaseServer();
    const { data } = await supabase.from("site_ayarlari").select("*").eq("site", site).maybeSingle();
    if (!data) return varsayilan;
    return {
      siteAdi: data.site_adi || varsayilan.siteAdi,
      logoUrl: data.logo_url || null,
      anaRenk: data.ana_renk || varsayilan.anaRenk,
    };
  } catch {
    return varsayilan;
  }
}

// Ana rengin biraz koyu bir tonu — hover/koyu-tema gibi yerlerde
// "--lacivert-koyu" olarak kullanılıyor. Basit bir RGB karartma.
export function koyulastir(hex, miktar = 0.18) {
  try {
    const h = (hex || "").replace("#", "");
    if (h.length !== 6) return hex;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    if ([r, g, b].some((c) => Number.isNaN(c))) return hex;
    const koyu = [r, g, b].map((c) => Math.max(0, Math.round(c * (1 - miktar))));
    return `#${koyu.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return hex;
  }
}
