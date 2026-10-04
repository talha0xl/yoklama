"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSiteAyarlari } from "../../components/SiteAyarlariProvider";

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const YENILEME_MS = 15 * 1000; // 15 saniye
const KATEGORI_BASLIK = { geldi: "Gelenler", izinli: "İzinliler", izinsiz: "İzinsizler" };

function saatFormatla(d) {
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function tarihFormatla(d) {
  return `${GUNLER[d.getDay()]}, ${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`;
}
function tarihEtiketKisa(iso) {
  if (!iso) return "";
  const [yil, ay, gun] = iso.split("-");
  return `${gun}.${ay}.${yil}`;
}

export default function SunumIstemci({ ilkVeri }) {
  const { siteAdi, logoUrl } = useSiteAyarlari();
  const [veri, setVeri] = useState(ilkVeri);
  const [saat, setSaat] = useState(null);
  const [tamEkran, setTamEkran] = useState(false);
  const sarmalRef = useRef(null);

  // Sunuma bakan kişi neye bakacağını kendisi seçsin diye: grup (Toplu
  // Talebe ya da tek bir grup), yoklama türü ve hangi GÜNÜN verisine
  // bakılacağı seçimi (varsayılan: bugün, sunucudan gelen ilk veri).
  const [gruplar, setGruplar] = useState([]);
  const [turler, setTurler] = useState([]);
  const [grupId, setGrupId] = useState("");
  const [turId, setTurId] = useState("");
  const [tarih, setTarih] = useState(ilkVeri.tarih || "");
  const gercekBugun = ilkVeri.tarih || "";
  const ilkTurAyarlandi = useRef(false);

  // "İncele" paneli: hangi kategori (geldi/izinli/izinsiz) açık, ve o
  // kategorideki hangi isme basıldı (sebebi/saati göstermek için).
  const [acikKategori, setAcikKategori] = useState(null);
  const [acikIsimIndex, setAcikIsimIndex] = useState(null);

  useEffect(() => {
    fetch("/api/gruplar").then((r) => r.json()).then((d) => setGruplar(d.gruplar || []));
    fetch("/api/yoklama-turleri").then((r) => r.json()).then((d) => {
      const t = d.turler || [];
      setTurler(t);
      if (!ilkTurAyarlandi.current && t.length) {
        ilkTurAyarlandi.current = true;
        setTurId(t[0].id);
      }
    });
  }, []);

  const yenile = useCallback(() => {
    const params = new URLSearchParams();
    if (grupId) params.set("grup_id", grupId);
    if (turId) params.set("tur_id", turId);
    if (tarih) params.set("tarih", tarih);
    fetch(`/api/sunum?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setVeri(d))
      .catch(() => {});
  }, [grupId, turId, tarih]);

  // Grup, tür ya da tarih değiştiğinde hemen yenile (kişi seçim yaptığında
  // sonucu görsün), sonrasında normal 15 saniyelik döngü devam etsin.
  useEffect(() => {
    yenile();
  }, [yenile]);

  // Seçim değişince açık "incele" panelini kapat — eski grubun listesi
  // yeni grubun kartının altında kalmasın.
  useEffect(() => {
    setAcikKategori(null);
    setAcikIsimIndex(null);
  }, [grupId, turId, tarih]);

  function inceleAc(kategori) {
    setAcikIsimIndex(null);
    setAcikKategori((mevcut) => (mevcut === kategori ? null : kategori));
  }

  useEffect(() => {
    setSaat(new Date());
    const zamanlayici = setInterval(() => setSaat(new Date()), 1000 * 30);
    const yenileZamanlayici = setInterval(yenile, YENILEME_MS);
    return () => {
      clearInterval(zamanlayici);
      clearInterval(yenileZamanlayici);
    };
  }, [yenile]);

  function tamEkraniDegistir() {
    if (!document.fullscreenElement) {
      sarmalRef.current?.requestFullscreen?.().then(() => setTamEkran(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setTamEkran(false)).catch(() => {});
    }
  }

  const yoklamaOran = veri.yoklama && veri.yoklama.toplamIsaretlenen > veri.yoklama.izinli
    ? Math.round((veri.yoklama.geldi / (veri.yoklama.toplamIsaretlenen - veri.yoklama.izinli || 1)) * 100)
    : null;

  const seciliGrupAdi = gruplar.find((g) => g.id === grupId)?.isim || "Toplu Talebe";
  const seciliTurAdi = turler.find((t) => t.id === turId)?.isim || "";

  return (
    <div className="sunum-sayfa" ref={sarmalRef}>
      <div className="sunum-ust">
        <div className="sunum-org">
          <img src={logoUrl || "/logo.png"} alt={siteAdi} />
          <div className="sunum-org-metin">{siteAdi}</div>
        </div>
        <div className="sunum-saat-blok">
          <div className="sunum-tarih">{saat ? tarihFormatla(saat) : ""}</div>
          <div className="sunum-saat">{saat ? saatFormatla(saat) : "--:--"}</div>
          <div className="sunum-kontroller">
            <button className="sunum-kontrol-btn" onClick={tamEkraniDegistir}>
              {tamEkran ? "⤡ Tam Ekrandan Çık" : "⤢ Tam Ekran"}
            </button>
            <Link href="/" className="sunum-kontrol-btn" style={{ textDecoration: "none" }}>
              ✕ Çıkış
            </Link>
          </div>
        </div>
      </div>

      <div className="sunum-secim-cubugu">
        <div className="sunum-secim-alan">
          <label>Grup</label>
          <div className="sunum-grup-dugmeler">
            <button type="button" className={`sunum-grup-dugme ${!grupId ? "aktif" : ""}`} onClick={() => setGrupId("")}>
              Toplu Talebe
            </button>
            {gruplar.map((g) => (
              <button
                type="button"
                key={g.id}
                className={`sunum-grup-dugme ${grupId === g.id ? "aktif" : ""}`}
                onClick={() => setGrupId(g.id)}
              >
                {g.isim}
              </button>
            ))}
          </div>
        </div>
        <div className="sunum-secim-alan">
          <label>Yoklama Türü</label>
          <select value={turId} onChange={(e) => setTurId(e.target.value)}>
            {turler.length === 0 && <option value="">—</option>}
            {turler.map((t) => (
              <option key={t.id} value={t.id}>{t.isim}</option>
            ))}
          </select>
        </div>
        <div className="sunum-secim-alan">
          <label>Gün</label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
            {tarih !== gercekBugun && (
              <button className="sunum-kontrol-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setTarih(gercekBugun)}>
                Bugün
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="sunum-bolum-baslik">
        {seciliGrupAdi} — {seciliTurAdi || "Yoklama"} — Toplam {veri.toplamOgrenci} Öğrenci
      </div>

      {veri.yoklama && (
        <div className="sunum-izgara">
          <div className="sunum-kart">
            <div className="sunum-kart-sayi" style={{ color: "#7fd9a8" }}>{veri.yoklama.geldi}</div>
            <div className="sunum-kart-etiket">Geldi</div>
            {veri.yoklama.geldi > 0 && (
              <button type="button" className="sunum-kart-incele" onClick={() => inceleAc("geldi")}>
                {acikKategori === "geldi" ? "Kapat" : "İncele"}
              </button>
            )}
          </div>
          <div className="sunum-kart">
            <div className="sunum-kart-sayi" style={{ color: "#e3b972" }}>{veri.yoklama.izinli}</div>
            <div className="sunum-kart-etiket">İzinli</div>
            {veri.yoklama.izinli > 0 && (
              <button type="button" className="sunum-kart-incele" onClick={() => inceleAc("izinli")}>
                {acikKategori === "izinli" ? "Kapat" : "İncele"}
              </button>
            )}
          </div>
          <div className="sunum-kart">
            <div className="sunum-kart-sayi" style={{ color: "#e0776f" }}>{veri.yoklama.izinsiz}</div>
            <div className="sunum-kart-etiket">İzinsiz</div>
            {veri.yoklama.izinsiz > 0 && (
              <button type="button" className="sunum-kart-incele" onClick={() => inceleAc("izinsiz")}>
                {acikKategori === "izinsiz" ? "Kapat" : "İncele"}
              </button>
            )}
          </div>
          {yoklamaOran !== null && (
            <div className="sunum-kart">
              <div className="sunum-kart-sayi">%{yoklamaOran}</div>
              <div className="sunum-kart-etiket">Devam Oranı</div>
            </div>
          )}
        </div>
      )}

      {acikKategori && veri.yoklama?.isimler?.[acikKategori] && (
        <div className="sunum-incele-panel">
          <div className="sunum-incele-baslik">{KATEGORI_BASLIK[acikKategori]} ({veri.yoklama.isimler[acikKategori].length})</div>
          {veri.yoklama.isimler[acikKategori].length === 0 ? (
            <div className="sunum-incele-bos">Kimse yok.</div>
          ) : (
            <div className="sunum-incele-liste">
              {veri.yoklama.isimler[acikKategori].map((k, i) => (
                <div key={i}>
                  <button type="button" className="sunum-incele-isim" onClick={() => setAcikIsimIndex((mevcut) => (mevcut === i ? null : i))}>
                    {k.ad_soyad}
                  </button>
                  {acikIsimIndex === i && (
                    <div className="sunum-incele-sebep">
                      {acikKategori === "geldi"
                        ? k.saat
                          ? `Saat ${k.saat.slice(0, 5)}'te geldi işaretlendi.`
                          : "Saat bilgisi yok."
                        : k.not_metni
                        ? `Sebep: ${k.not_metni}`
                        : "Sebep belirtilmemiş."}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {veri.vazifeler.length > 0 && (
        <>
          <div className="sunum-bolum-baslik">
            {tarih === gercekBugun ? "Bugünün Vazifeleri" : `${tarihEtiketKisa(tarih)} Vazifeleri`}
          </div>
          <div className="sunum-vazife-izgara">
            {veri.vazifeler.map((v) => (
              <div className="sunum-vazife-kart" key={v.liste}>
                <div className="sunum-vazife-liste">{v.liste}</div>
                <div className="sunum-vazife-kisi">{v.kisi}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!veri.yoklama && veri.vazifeler.length === 0 && (
        <div className="sunum-bos">Gösterilecek modül verisi yok.</div>
      )}

      <div className="sunum-canli">
        <span className="sunum-canli-nokta" /> Canlı — her 15 saniyede güncellenir
      </div>
    </div>
  );
}
