"use client";
import { useEffect, useState, useCallback } from "react";

const SITELER = [
  { anahtar: "ana_portal", isim: "Ana Portal", aciklama: "Bu portal — kenar menü, giriş ekranı, Sunum Modu, Veli Mektubu (PDF)." },
  { anahtar: "kitap_takip", isim: "Kitap Takip", aciklama: "Talebelerin kitap okuma takip uygulaması — açılış ekranı ve ana renk." },
];

const MAKS_LOGO_BYTE = 650 * 1024; // ~650KB — küçük ama net bir logo için yeterli

function dosyaBase64eCevir(dosya) {
  return new Promise((resolve, reject) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => resolve(okuyucu.result);
    okuyucu.onerror = reject;
    okuyucu.readAsDataURL(dosya);
  });
}

export default function SiteTasarimIstemci({ sahipAdi }) {
  const [siteAnahtari, setSiteAnahtari] = useState("ana_portal");
  const [ayarlar, setAyarlar] = useState({}); // { ana_portal: {...}, kitap_takip: {...} }
  const [taslak, setTaslak] = useState({}); // düzenlenmekte olan (kaydedilmemiş) alanlar, site bazlı
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hazirDegil, setHazirDegil] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState("");
  const [logoHata, setLogoHata] = useState("");

  const getir = useCallback(() => {
    setYukleniyor(true);
    fetch("/api/site-ayarlari")
      .then((r) => r.json())
      .then((d) => {
        if (d.hazirDegil) {
          setHazirDegil(true);
          setYukleniyor(false);
          return;
        }
        const harita = {};
        (d.ayarlar || []).forEach((a) => (harita[a.site] = a));
        setAyarlar(harita);
        setTaslak({
          ana_portal: { site_adi: harita.ana_portal?.site_adi || "", ana_renk: harita.ana_portal?.ana_renk || "#28334a", logo_url: harita.ana_portal?.logo_url || null },
          kitap_takip: { site_adi: harita.kitap_takip?.site_adi || "", ana_renk: harita.kitap_takip?.ana_renk || "#28334a", logo_url: harita.kitap_takip?.logo_url || null },
        });
        setYukleniyor(false);
      })
      .catch(() => {
        setHata("Ayarlar yüklenemedi.");
        setYukleniyor(false);
      });
  }, []);

  useEffect(() => getir(), [getir]);

  const gecerliTaslak = taslak[siteAnahtari] || { site_adi: "", ana_renk: "#28334a", logo_url: null };

  function alanGuncelle(alan, deger) {
    setTaslak((t) => ({ ...t, [siteAnahtari]: { ...t[siteAnahtari], [alan]: deger } }));
  }

  async function logoSecildi(e) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    setLogoHata("");
    if (dosya.size > MAKS_LOGO_BYTE) {
      setLogoHata(`Bu görsel çok büyük (${Math.round(dosya.size / 1024)}KB). Lütfen ${Math.round(MAKS_LOGO_BYTE / 1024)}KB'den küçük bir logo seçin.`);
      e.target.value = "";
      return;
    }
    try {
      const veriUrl = await dosyaBase64eCevir(dosya);
      alanGuncelle("logo_url", veriUrl);
    } catch {
      setLogoHata("Görsel okunamadı, tekrar deneyin.");
    }
    e.target.value = "";
  }

  async function kaydet() {
    setKaydediliyor(true);
    setMesaj("");
    setHata("");
    try {
      const res = await fetch("/api/site-ayarlari", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: siteAnahtari,
          site_adi: gecerliTaslak.site_adi,
          ana_renk: gecerliTaslak.ana_renk,
          logo_url: gecerliTaslak.logo_url,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Kaydedilemedi");
      setAyarlar((a) => ({ ...a, [siteAnahtari]: d.ayar }));
      setMesaj(
        siteAnahtari === "ana_portal"
          ? "Kaydedildi — sayfayı yenileyen herkes yeni görünümü hemen görecek."
          : "Kaydedildi — Kitap Takip'i açan herkes yeni görünümü hemen görecek."
      );
      setTimeout(() => setMesaj(""), 6000);
    } catch (err) {
      setHata(err.message);
    } finally {
      setKaydediliyor(false);
    }
  }

  if (yukleniyor) {
    return (
      <>
        <div className="sayfa-baslik">
          <h1>Site Tasarımı</h1>
        </div>
        <div className="bos-durum">Yükleniyor...</div>
      </>
    );
  }

  if (hazirDegil) {
    return (
      <>
        <div className="sayfa-baslik">
          <h1>Site Tasarımı</h1>
        </div>
        <div className="kart">
          <div className="kart-ic">
            <p>
              Bu özelliğin çalışması için önce <code>supabase_schema_v15_site_tasarim.sql</code> dosyasını Supabase
              projenizin SQL Editor'ünde bir kez çalıştırmanız gerekiyor. Çalıştırdıktan sonra bu sayfayı yenileyin.
            </p>
          </div>
        </div>
      </>
    );
  }

  const koyu = koyulastirGoster(gecerliTaslak.ana_renk);

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Site Tasarımı</h1>
      </div>
      <p className="sayfa-alt">
        Adı, logoyu ve ana rengi buradan değiştirin — kaydettiğiniz anda deploy beklemeden herkeste görünür.
      </p>

      <div className="grup-sekme">
        {SITELER.map((s) => (
          <button key={s.anahtar} className={siteAnahtari === s.anahtar ? "aktif" : ""} onClick={() => setSiteAnahtari(s.anahtar)}>
            {s.isim}
          </button>
        ))}
      </div>
      <p className="sayfa-alt" style={{ marginTop: -6 }}>
        {SITELER.find((s) => s.anahtar === siteAnahtari)?.aciklama}
      </p>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginTop: 6 }}>
        <div className="kart" style={{ flex: "1 1 360px" }}>
          <div className="kart-ic" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="etiket">Site adı</label>
              <input
                className="girdi"
                value={gecerliTaslak.site_adi}
                onChange={(e) => alanGuncelle("site_adi", e.target.value)}
                placeholder="Örn. Yavuztürk Süleymaniye"
              />
            </div>

            <div>
              <label className="etiket">Ana renk</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="color"
                  value={gecerliTaslak.ana_renk}
                  onChange={(e) => alanGuncelle("ana_renk", e.target.value)}
                  style={{ width: 48, height: 38, padding: 0, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}
                />
                <input
                  className="girdi"
                  style={{ maxWidth: 140 }}
                  value={gecerliTaslak.ana_renk}
                  onChange={(e) => alanGuncelle("ana_renk", e.target.value)}
                  placeholder="#28334a"
                />
              </div>
            </div>

            <div>
              <label className="etiket">Logo</label>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    background: gecerliTaslak.ana_renk,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {gecerliTaslak.logo_url ? (
                    <img src={gecerliTaslak.logo_url} alt="Logo" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
                  ) : (
                    <img src="/logo.png" alt="Varsayılan logo" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="btn btn-hayalet btn-sm" style={{ cursor: "pointer", display: "inline-flex", width: "fit-content" }}>
                    Görsel seç
                    <input type="file" accept="image/*" onChange={logoSecildi} style={{ display: "none" }} />
                  </label>
                  {gecerliTaslak.logo_url && (
                    <button className="btn btn-hayalet btn-sm" onClick={() => alanGuncelle("logo_url", null)}>
                      Varsayılana döndür
                    </button>
                  )}
                </div>
              </div>
              {logoHata && <div className="hata" style={{ marginTop: 8 }}>{logoHata}</div>}
            </div>

            {hata && <div className="hata">{hata}</div>}
            {mesaj && <div className="basari">{mesaj}</div>}

            <button className="btn btn-lacivert" onClick={kaydet} disabled={kaydediliyor} style={{ alignSelf: "flex-start" }}>
              {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>

        <div className="kart" style={{ flex: "1 1 280px", maxWidth: 360 }}>
          <div className="kart-ic">
            <div className="etiket" style={{ marginBottom: 10 }}>Önizleme</div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
              <div style={{ background: gecerliTaslak.ana_renk, padding: "16px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src={gecerliTaslak.logo_url || "/logo.png"}
                  alt="Logo önizleme"
                  style={{ width: 34, height: 34, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 3 }}
                />
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 14.5 }}>{gecerliTaslak.site_adi || "Site adı"}</span>
              </div>
              <div style={{ padding: 16, background: "var(--yuzey)" }}>
                <div style={{ height: 10, width: "70%", borderRadius: 4, background: koyu, opacity: 0.15, marginBottom: 8 }} />
                <div style={{ height: 10, width: "45%", borderRadius: 4, background: koyu, opacity: 0.15 }} />
                <button
                  disabled
                  style={{ marginTop: 14, background: gecerliTaslak.ana_renk, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}
                >
                  Örnek buton
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Yalnızca önizleme kartındaki soluk çubuklar için — kaydedilen gerçek
// koyulaştırma sunucu tarafında (lib/siteAyarlari.js) yapılıyor.
function koyulastirGoster(hex) {
  try {
    const h = (hex || "").replace("#", "");
    if (h.length !== 6) return hex || "#28334a";
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgb(${r},${g},${b})`;
  } catch {
    return hex || "#28334a";
  }
}
