"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAraliklaTazele } from "../../../lib/useAraliklaTazele";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function YoklamaIstemci({ isAdmin, baslangicTurler, baslangicGruplar }) {
  const [turler, setTurler] = useState(baslangicTurler || []);
  const [turId, setTurId] = useState(baslangicTurler?.[0]?.id || null);
  const [yeniTurAcik, setYeniTurAcik] = useState(false);
  const [yeniTurAdi, setYeniTurAdi] = useState("");
  const [turEkleniyor, setTurEkleniyor] = useState(false);

  const [gruplar] = useState(baslangicGruplar || []);
  const [grupId, setGrupId] = useState(baslangicGruplar?.[0]?.id || null);
  const [tarih, setTarih] = useState(bugun());
  const [ogrenciler, setOgrenciler] = useState([]);
  const [kayitMap, setKayitMap] = useState({}); // ogrenci_id -> {durum, saat}
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sebepAcikId, setSebepAcikId] = useState(null);
  const [sebepTaslak, setSebepTaslak] = useState("");
  const [kayitHata, setKayitHata] = useState("");
  // Sunucuya gönderilmiş ama henüz cevabı gelmemiş (devam eden) işaretlemeleri
  // tutar; arka plandaki sessiz tazeleme bunları eski veriyle ezmesin diye.
  const beklemedekiler = useRef(new Set());

  const turleriGetir = useCallback(() => {
    fetch("/api/yoklama-turleri")
      .then((r) => r.json())
      .then((d) => {
        setTurler(d.turler || []);
        setTurId((mevcut) => mevcut || d.turler?.[0]?.id || null);
      });
  }, []);

  const veriGetir = useCallback(
    (sessiz) => {
      if (!grupId || !tarih || !turId) return;
      if (!sessiz) setYukleniyor(true);
      fetch(`/api/yoklama?grup_id=${grupId}&tarih=${tarih}&tur_id=${turId}`)
        .then((r) => r.json())
        .then((d) => {
          setOgrenciler(d.ogrenciler || []);
          const map = {};
          (d.kayitlar || []).forEach((k) => (map[k.ogrenci_id] = k));
          // Devam eden (henüz cevabı gelmemiş) işaretlemeleri sunucudan gelen
          // eski veriyle ezme — mevcut yerel durumu koru.
          setKayitMap((eski) => {
            const birlesik = { ...map };
            beklemedekiler.current.forEach((anahtar) => {
              if (anahtar in eski) birlesik[anahtar] = eski[anahtar];
              else delete birlesik[anahtar];
            });
            return birlesik;
          });
          if (!sessiz) setYukleniyor(false);
        });
    },
    [grupId, tarih, turId]
  );

  useEffect(() => veriGetir(false), [veriGetir]);
  // Sekme açıkken arka planda birkaç saniyede bir sessizce tazeler, böylece
  // başka bir hocanın az önce işaretlediği bir kayıt da kısa sürede görünür.
  useAraliklaTazele(() => veriGetir(true));

  // İyimser (optimistic) güncelleme: sunucudan cevap beklemeden ekranı hemen
  // günceller, böylece dokunuş anında tepki veriyormuş gibi hissettirir.
  // Cevap gelince gerçek kayıtla senkronlanır; hata olursa geri alınır.
  async function isaretle(ogrenciId, durum, notMetni) {
    // İzinli dışında bir duruma geçiliyorsa, o öğrencinin açık "izin sebebi"
    // kutusu varsa kapat — yoksa altında asılı kalıyordu.
    if (durum !== "izinli" && sebepAcikId === ogrenciId) setSebepAcikId(null);

    const oncekiKayit = kayitMap[ogrenciId];
    const notDegeri = durum === "izinli" ? (notMetni ?? oncekiKayit?.not_metni ?? null) : null;

    beklemedekiler.current.add(ogrenciId);
    setKayitMap((m) => ({ ...m, [ogrenciId]: { ...(m[ogrenciId] || {}), durum, not_metni: notDegeri } }));

    try {
      const res = await fetch("/api/yoklama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ogrenci_id: ogrenciId, tarih, tur_id: turId, durum, not_metni: notDegeri }),
      });
      const d = await res.json();
      if (d.kayit) setKayitMap((m) => ({ ...m, [ogrenciId]: d.kayit }));
      else throw new Error(d.error || "kayıt hatası");
    } catch (err) {
      setKayitMap((m) => {
        const yeni = { ...m };
        if (oncekiKayit) yeni[ogrenciId] = oncekiKayit;
        else delete yeni[ogrenciId];
        return yeni;
      });
      setKayitHata(`Kaydedilemedi, işaretiniz geri alındı (${err.message}).`);
      setTimeout(() => setKayitHata(""), 8000);
    } finally {
      beklemedekiler.current.delete(ogrenciId);
    }
  }

  async function isaretiSil(ogrenciId) {
    const oncekiKayit = kayitMap[ogrenciId];
    beklemedekiler.current.add(ogrenciId);
    setKayitMap((m) => {
      const yeni = { ...m };
      delete yeni[ogrenciId];
      return yeni;
    });
    if (sebepAcikId === ogrenciId) setSebepAcikId(null);
    try {
      const res = await fetch(`/api/yoklama?ogrenci_id=${ogrenciId}&tarih=${tarih}&tur_id=${turId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("silinemedi");
    } catch (err) {
      setKayitMap((m) => {
        if (!oncekiKayit) return m;
        return { ...m, [ogrenciId]: oncekiKayit };
      });
      setKayitHata("Sıfırlanamadı, işaretiniz geri getirildi. Tekrar deneyin.");
      setTimeout(() => setKayitHata(""), 8000);
    } finally {
      beklemedekiler.current.delete(ogrenciId);
    }
  }

  function izinliTiklandi(ogrenciId) {
    isaretle(ogrenciId, "izinli");
    setSebepAcikId(ogrenciId);
    setSebepTaslak(kayitMap[ogrenciId]?.not_metni || "");
  }

  function sebepKaydet(ogrenciId) {
    isaretle(ogrenciId, "izinli", sebepTaslak.trim() || null);
    setSebepAcikId(null);
  }

  async function yeniTurEkle(e) {
    e.preventDefault();
    if (!yeniTurAdi.trim()) return;
    setTurEkleniyor(true);
    const res = await fetch("/api/yoklama-turleri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isim: yeniTurAdi, siralama: turler.length + 1 }),
    });
    const d = await res.json();
    setTurEkleniyor(false);
    if (d.tur) {
      setYeniTurAdi("");
      setYeniTurAcik(false);
      turleriGetir();
      setTurId(d.tur.id);
    }
  }

  const gelenSayisi = Object.values(kayitMap).filter((k) => k.durum === "geldi").length;
  const izinliSayisi = Object.values(kayitMap).filter((k) => k.durum === "izinli").length;
  const izinsizSayisi = Object.values(kayitMap).filter((k) => k.durum === "izinsiz").length;
  const isaretsizSayisi = ogrenciler.length - gelenSayisi - izinliSayisi - izinsizSayisi;

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Yoklama</h1>
        <input
          type="date"
          className="girdi"
          style={{ width: 170 }}
          value={tarih}
          onChange={(e) => setTarih(e.target.value)}
          max={bugun()}
        />
      </div>
      <p className="sayfa-alt">Önce hangi amaçla yoklama aldığınızı seçin, sonra "Geldi"'ye basınca saat otomatik kaydedilir.</p>

      {kayitHata && <div className="hata" style={{ marginBottom: 16 }}>{kayitHata}</div>}

      <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Yoklama türü</label>
      <div className="grup-sekme">
        {turler.map((t) => (
          <button key={t.id} className={turId === t.id ? "aktif" : ""} onClick={() => setTurId(t.id)}>
            {t.isim}
          </button>
        ))}
        {isAdmin && !yeniTurAcik && (
          <button className="btn-hayalet-sekme" onClick={() => setYeniTurAcik(true)}>
            + Yeni tür
          </button>
        )}
      </div>
      {isAdmin && yeniTurAcik && (
        <form onSubmit={yeniTurEkle} style={{ display: "flex", gap: 8, marginBottom: 16, maxWidth: 360 }}>
          <input
            className="girdi"
            autoFocus
            placeholder="Örn. Pazar İzin Dönüşü"
            value={yeniTurAdi}
            onChange={(e) => setYeniTurAdi(e.target.value)}
          />
          <button className="btn btn-lacivert btn-sm" disabled={turEkleniyor}>
            Ekle
          </button>
          <button type="button" className="btn btn-hayalet btn-sm" onClick={() => setYeniTurAcik(false)}>
            Vazgeç
          </button>
        </form>
      )}

      <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Grup</label>
      <div className="grup-sekme">
        {gruplar.map((g) => (
          <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
            {g.isim}
          </button>
        ))}
      </div>

      {!yukleniyor && ogrenciler.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <span className="rozet rozet-yesil">{gelenSayisi} geldi</span>
          <span className="rozet rozet-amber">{izinliSayisi} izinli</span>
          <span className="rozet rozet-kirmizi">{izinsizSayisi} izinsiz</span>
          <span className="rozet rozet-gri">{isaretsizSayisi} işaretsiz</span>
        </div>
      )}

      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && ogrenciler.length === 0 && (
            <div className="bos-durum">Bu grupta kayıtlı öğrenci yok. Yönetim sayfasından öğrenci ekleyin.</div>
          )}
          {!yukleniyor &&
            ogrenciler.map((o) => {
              const kayit = kayitMap[o.id];
              const durum = kayit?.durum;
              const sebepAcik = sebepAcikId === o.id;
              return (
                <div key={o.id}>
                  <div className="ogrenci-satir" style={sebepAcik || (durum === "izinli" && kayit?.not_metni) ? { borderBottom: "none" } : undefined}>
                    <div>
                      <div className="ogrenci-ad">{o.ad_soyad}</div>
                      <div className="ogrenci-detay">
                        {durum === "geldi" && kayit?.saat && <>Saat {kayit.saat.slice(0, 5)} itibarıyla geldi</>}
                        {durum === "izinli" && <>İzinli olarak işaretlendi</>}
                        {durum === "izinsiz" && <>İzinsiz olarak işaretlendi</>}
                        {!durum && <>Henüz işaretlenmedi</>}
                      </div>
                    </div>

                    <div className="durum-btn-grup">
                      <button className={`durum-btn ${durum === "geldi" ? "secili-geldi" : ""}`} onClick={() => isaretle(o.id, "geldi")}>
                        Geldi
                      </button>
                      <button className={`durum-btn ${durum === "izinli" ? "secili-izinli" : ""}`} onClick={() => izinliTiklandi(o.id)}>
                        İzinli
                      </button>
                      <button className={`durum-btn ${durum === "izinsiz" ? "secili-izinsiz" : ""}`} onClick={() => isaretle(o.id, "izinsiz")}>
                        İzinsiz
                      </button>
                      {durum && (
                        <button className="btn btn-hayalet btn-sm" title="İşareti sil" onClick={() => isaretiSil(o.id)}>
                          Sıfırla
                        </button>
                      )}
                    </div>
                  </div>

                  {sebepAcik && (
                    <div className="sebep-alani">
                      <input
                        className="girdi"
                        autoFocus
                        placeholder="İzin sebebi (isteğe bağlı) — örn. Doktor randevusu"
                        value={sebepTaslak}
                        onChange={(e) => setSebepTaslak(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sebepKaydet(o.id)}
                      />
                      <button className="btn btn-lacivert btn-sm" onClick={() => sebepKaydet(o.id)}>
                        Kaydet
                      </button>
                      <button className="btn btn-hayalet btn-sm" onClick={() => setSebepAcikId(null)}>
                        Kapat
                      </button>
                    </div>
                  )}
                  {!sebepAcik && durum === "izinli" && kayit?.not_metni && (
                    <div className="sebep-alani sebep-goruntu">
                      <span>Sebep: {kayit.not_metni}</span>
                      <button
                        className="btn btn-hayalet btn-sm"
                        onClick={() => {
                          setSebepAcikId(o.id);
                          setSebepTaslak(kayit.not_metni || "");
                        }}
                      >
                        Düzenle
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
