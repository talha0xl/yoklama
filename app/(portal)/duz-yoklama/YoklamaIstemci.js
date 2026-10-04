"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAraliklaTazele } from "../../../lib/useAraliklaTazele";

const TUMU = "__tumu__";
const SON_TUR_ANAHTARI = "yoklama_son_tur_id";
const SON_GRUP_ANAHTARI = "yoklama_son_grup_id";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Bir sonraki girişte aynı tür/grup açık gelsin diye tarayıcıda hatırlar —
// böylece sayfadan çıkıp tekrar girince ekran sessizce ilk türe/gruba
// dönmüyor (biri "izin dönüşü" gibi başka bir türdeyken çıkıp girdiğinde
// farkında olmadan "Günlük Yoklama"da işaretlemeye devam etmesin diye).
function depodanOku(anahtar) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(anahtar);
  } catch {
    return null;
  }
}
function depoyaYaz(anahtar, deger) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(anahtar, deger);
  } catch {}
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

  // Kayıtlı tür/grup, sunucu tarafında bilinmediği (localStorage sunucuda
  // yok) için ilk render'da DEĞİL, mount sonrası bir effect'te uygulanır —
  // aksi halde sunucunun bastığı HTML ile istemcinin ilk render'ı
  // uyuşmuyor ("hydration mismatch") ve React bu durumda ekrandaki
  // sekmenin görünümünü güncellemeyi atlayabiliyor (buton state'te doğru
  // görünse de görsel olarak eski sekmede takılı kalıyordu).
  const [hazir, setHazir] = useState(false);
  useEffect(() => {
    const kayitliTur = depodanOku(SON_TUR_ANAHTARI);
    if (kayitliTur && (baslangicTurler || []).some((t) => t.id === kayitliTur)) setTurId(kayitliTur);
    const kayitliGrup = depodanOku(SON_GRUP_ANAHTARI);
    if (kayitliGrup && (kayitliGrup === TUMU || (baslangicGruplar || []).some((g) => g.id === kayitliGrup))) setGrupId(kayitliGrup);
    setHazir(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (hazir && turId) depoyaYaz(SON_TUR_ANAHTARI, turId);
  }, [hazir, turId]);
  useEffect(() => {
    if (hazir && grupId) depoyaYaz(SON_GRUP_ANAHTARI, grupId);
  }, [hazir, grupId]);

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
      const params = new URLSearchParams({ tarih, tur_id: turId });
      if (grupId !== TUMU) params.set("grup_id", grupId);
      fetch(`/api/yoklama?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          let liste = d.ogrenciler || [];
          // "Tüm Talebe" seçiliyken sunucu grup filtresi olmadan alfabetik
          // döndürüyor — burada grup sırasına göre yeniden diziyoruz ki
          // İstatistik'teki "Tümü" gibi grup grup aşağı doğru görünsün.
          if (grupId === TUMU) {
            const siraMap = new Map(gruplar.map((g, i) => [g.id, g.siralama ?? i]));
            liste = [...liste].sort((a, b) => {
              const sa = siraMap.has(a.grup_id) ? siraMap.get(a.grup_id) : 999;
              const sb = siraMap.has(b.grup_id) ? siraMap.get(b.grup_id) : 999;
              if (sa !== sb) return sa - sb;
              return (a.ad_soyad || "").localeCompare(b.ad_soyad || "", "tr");
            });
          }
          setOgrenciler(liste);
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
    [grupId, tarih, turId, gruplar]
  );

  useEffect(() => veriGetir(false), [veriGetir]);
  // Sekme açıkken arka planda birkaç saniyede bir sessizce tazeler, böylece
  // başka bir hocanın az önce işaretlediği bir kayıt da kısa sürede görünür.
  useAraliklaTazele(() => veriGetir(true));

  // İyimser (optimistic) güncelleme: sunucudan cevap beklemeden ekranı hemen
  // günceller, böylece dokunuş anında tepki veriyormuş gibi hissettirir.
  // Cevap gelince gerçek kayıtla senkronlanır; hata olursa geri alınır.
  async function isaretle(ogrenciId, durum, notMetni) {
    // İzinli/izinsiz dışında bir duruma geçiliyorsa, o öğrencinin açık
    // "sebep/not" kutusu varsa kapat — yoksa altında asılı kalıyordu.
    if (durum !== "izinli" && durum !== "izinsiz" && sebepAcikId === ogrenciId) setSebepAcikId(null);

    const oncekiKayit = kayitMap[ogrenciId];
    const notDegeri = durum === "izinli" || durum === "izinsiz" ? (notMetni ?? oncekiKayit?.not_metni ?? null) : null;

    // Saati kullanıcının kendi cihazından alıyoruz: ekranda gördüğü saatle
    // birebir aynı olsun, sunucunun saat dilimine bağlı kalmasın.
    const simdi = new Date();
    const yerelSaat =
      String(simdi.getHours()).padStart(2, "0") + ":" + String(simdi.getMinutes()).padStart(2, "0") + ":" + String(simdi.getSeconds()).padStart(2, "0");

    beklemedekiler.current.add(ogrenciId);
    setKayitMap((m) => ({ ...m, [ogrenciId]: { ...(m[ogrenciId] || {}), durum, not_metni: notDegeri, saat: yerelSaat } }));

    try {
      const res = await fetch("/api/yoklama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ogrenci_id: ogrenciId, tarih, tur_id: turId, durum, not_metni: notDegeri, saat: yerelSaat }),
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

  function sebepliTiklandi(ogrenciId, durum) {
    isaretle(ogrenciId, durum);
    setSebepAcikId(ogrenciId);
    setSebepTaslak(kayitMap[ogrenciId]?.not_metni || "");
  }

  function sebepKaydet(ogrenciId, durum) {
    isaretle(ogrenciId, durum, sebepTaslak.trim() || null);
    setSebepAcikId(null);
  }

  // Ekranda görünen listeye göre (seçili tarih + tür + grup/"Tüm Talebe")
  // o günkü TÜM işaretlemeleri topluca siler — tek tek "Sıfırla"ya basmaya
  // gerek kalmadan yanlış girilen bir günü baştan almak için.
  const [topluSiliniyor, setTopluSiliniyor] = useState(false);
  async function gununYoklamasiniSil() {
    const isaretliSayisi = ogrenciler.filter((o) => kayitMap[o.id]?.durum).length;
    if (!isaretliSayisi) return;
    const turAdi = turler.find((t) => t.id === turId)?.isim || "";
    const grupAdi = grupId === TUMU ? "Tüm Talebe" : gruplar.find((g) => g.id === grupId)?.isim || "";
    if (
      !confirm(
        `${tarih} tarihindeki "${turAdi}" (${grupAdi}) yoklamasında işaretli ${isaretliSayisi} kaydı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
      )
    )
      return;
    setTopluSiliniyor(true);
    try {
      const res = await fetch("/api/yoklama", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarih, tur_id: turId, ogrenci_ids: ogrenciler.map((o) => o.id) }),
      });
      if (!res.ok) throw new Error("silinemedi");
      setKayitMap((m) => {
        const yeni = { ...m };
        ogrenciler.forEach((o) => delete yeni[o.id]);
        return yeni;
      });
    } catch (err) {
      setKayitHata("Topluca silinemedi, tekrar deneyin.");
      setTimeout(() => setKayitHata(""), 8000);
    } finally {
      setTopluSiliniyor(false);
    }
  }

  async function turSil(t) {
    if (!confirm(`"${t.isim}" türünü kaldırmak istediğinize emin misiniz? Bu türle daha önce alınmış yoklama kayıtları silinmez, sadece bu tür seçim listesinden kalkar.`)) return;
    const res = await fetch(`/api/yoklama-turleri/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Kaldırılamadı, tekrar deneyin.");
      return;
    }
    setTurler((liste) => {
      const kalan = liste.filter((x) => x.id !== t.id);
      if (turId === t.id) setTurId(kalan[0]?.id || null);
      return kalan;
    });
  }

  async function turAdiniDuzenle(t) {
    const yeniAd = prompt("Yeni ad:", t.isim);
    if (!yeniAd || !yeniAd.trim() || yeniAd.trim() === t.isim) return;
    const res = await fetch(`/api/yoklama-turleri/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isim: yeniAd.trim() }),
    });
    if (!res.ok) {
      alert("Ad değiştirilemedi, tekrar deneyin.");
      return;
    }
    const d = await res.json();
    setTurler((liste) => liste.map((x) => (x.id === t.id ? d.tur : x)));
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

      <div className="yoklama-secim-sabit">
      <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Yoklama türü</label>
      <div className="grup-sekme">
        {turler.map((t) => (
          <div key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <button className={turId === t.id ? "aktif" : ""} onClick={() => setTurId(t.id)}>
              {t.isim}
            </button>
            {isAdmin && (
              <button
                type="button"
                title={`"${t.isim}" adını değiştir`}
                onClick={() => turAdiniDuzenle(t)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--metin-soluk)",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "0 2px",
                  lineHeight: 1,
                  borderRadius: 0,
                }}
              >
                ✎
              </button>
            )}
            {isAdmin && turler.length > 1 && (
              <button
                type="button"
                title={`"${t.isim}" türünü kaldır`}
                onClick={() => turSil(t)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--metin-soluk)",
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 700,
                  padding: "0 2px",
                  lineHeight: 1,
                  borderRadius: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
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
        <button className={grupId === TUMU ? "aktif" : ""} onClick={() => setGrupId(TUMU)}>
          Tüm Talebe
        </button>
        {gruplar.map((g) => (
          <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
            {g.isim}
          </button>
        ))}
      </div>
      </div>

      {!yukleniyor && ogrenciler.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          <span className="rozet rozet-yesil">{gelenSayisi} geldi</span>
          <span className="rozet rozet-amber">{izinliSayisi} izinli</span>
          <span className="rozet rozet-kirmizi">{izinsizSayisi} izinsiz</span>
          <span className="rozet rozet-gri">{isaretsizSayisi} işaretsiz</span>
          {isAdmin && gelenSayisi + izinliSayisi + izinsizSayisi > 0 && (
            <button
              type="button"
              className="btn btn-hayalet btn-sm"
              style={{ color: "var(--kirmizi, #c0392b)", marginLeft: "auto" }}
              disabled={topluSiliniyor}
              onClick={gununYoklamasiniSil}
            >
              Bu günün yoklamasını sil
            </button>
          )}
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
                  <div className="ogrenci-satir" style={sebepAcik || ((durum === "izinli" || durum === "izinsiz") && kayit?.not_metni) ? { borderBottom: "none" } : undefined}>
                    <div>
                      <div className="ogrenci-ad">
                        {o.ad_soyad}
                        {grupId === TUMU && (
                          <span className="rozet rozet-gri" style={{ marginLeft: 8, fontWeight: 600, fontSize: 11 }}>
                            {gruplar.find((g) => g.id === o.grup_id)?.isim || "Grupsuz"}
                          </span>
                        )}
                      </div>
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
                      <button className={`durum-btn ${durum === "izinli" ? "secili-izinli" : ""}`} onClick={() => sebepliTiklandi(o.id, "izinli")}>
                        İzinli
                      </button>
                      <button className={`durum-btn ${durum === "izinsiz" ? "secili-izinsiz" : ""}`} onClick={() => sebepliTiklandi(o.id, "izinsiz")}>
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
                        placeholder={
                          durum === "izinsiz"
                            ? "Not (isteğe bağlı) — örn. Haber vermeden çıktı"
                            : "İzin sebebi (isteğe bağlı) — örn. Doktor randevusu"
                        }
                        value={sebepTaslak}
                        onChange={(e) => setSebepTaslak(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sebepKaydet(o.id, durum)}
                      />
                      <button className="btn btn-lacivert btn-sm" onClick={() => sebepKaydet(o.id, durum)}>
                        Kaydet
                      </button>
                      <button className="btn btn-hayalet btn-sm" onClick={() => setSebepAcikId(null)}>
                        Kapat
                      </button>
                    </div>
                  )}
                  {!sebepAcik && (durum === "izinli" || durum === "izinsiz") && kayit?.not_metni && (
                    <div className="sebep-alani sebep-goruntu">
                      <span>{durum === "izinsiz" ? "Not" : "Sebep"}: {kayit.not_metni}</span>
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
