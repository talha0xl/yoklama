"use client";
import { useEffect, useState, useCallback, useRef } from "react";

function b64ToUint8(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function tarihYaz(iso) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return iso;
  }
}

async function swHazir() {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export default function DuyurularIstemci({ isAdmin }) {
  // null = henüz kontrol edilmedi (sunucu/ilk render ile uyumlu kalsın diye)
  const [destek, setDestek] = useState(null);
  const [izin, setIzin] = useState("default");
  const [abone, setAbone] = useState(false);
  const [ios, setIos] = useState(false);
  const [uygulamaModu, setUygulamaModu] = useState(false);
  const [kurulumHazir, setKurulumHazir] = useState(false);
  const kurulumOlayi = useRef(null);

  const [islem, setIslem] = useState(false);
  const [mesaj, setMesaj] = useState(null); // { tur: "basari" | "hata", metin }

  const [liste, setListe] = useState([]);
  const [listeYuklendi, setListeYuklendi] = useState(false);
  const [aboneSayisi, setAboneSayisi] = useState(null);

  const [baslik, setBaslik] = useState("");
  const [metin, setMetin] = useState("");
  const [gonderiyor, setGonderiyor] = useState(false);

  const listeyiYukle = useCallback(async () => {
    try {
      const r = await fetch("/api/duyurular");
      const d = await r.json();
      setListe(d.duyurular || []);
      setAboneSayisi(typeof d.aboneSayisi === "number" ? d.aboneSayisi : null);
      if (!r.ok && d.error) setMesaj({ tur: "hata", metin: "Geçmiş yüklenemedi: " + d.error });
    } catch (e) {
      setMesaj({ tur: "hata", metin: "Geçmiş yüklenemedi." });
    }
    setListeYuklendi(true);
  }, []);

  const durumuYokla = useCallback(async () => {
    try {
      const reg = await swHazir();
      const sub = await reg.pushManager.getSubscription();
      setAbone(!!sub);
      if (sub && Notification.permission === "granted") {
        // Kayıt veritabanından silinmişse geri ekle (sessizce).
        fetch("/api/push/abone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ abonelik: sub.toJSON() }),
        }).catch(() => {});
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIos(/iphone|ipad|ipod/i.test(ua));
    setUygulamaModu(
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true
    );
    const var_ = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setDestek(var_);
    if (var_) {
      setIzin(Notification.permission);
      durumuYokla();
    }
    const kurulumDinle = (e) => {
      e.preventDefault();
      kurulumOlayi.current = e;
      setKurulumHazir(true);
    };
    window.addEventListener("beforeinstallprompt", kurulumDinle);
    listeyiYukle();
    return () => window.removeEventListener("beforeinstallprompt", kurulumDinle);
  }, [durumuYokla, listeyiYukle]);

  async function uygulamayiKur() {
    const olay = kurulumOlayi.current;
    if (!olay) return;
    olay.prompt();
    try {
      await olay.userChoice;
    } catch (e) {}
    kurulumOlayi.current = null;
    setKurulumHazir(false);
  }

  async function bildirimAc() {
    setIslem(true);
    setMesaj(null);
    try {
      const sonuc = await Notification.requestPermission();
      setIzin(sonuc);
      if (sonuc !== "granted") {
        setMesaj({ tur: "hata", metin: "Bildirim izni verilmedi." });
        return;
      }
      const reg = await swHazir();
      const anahtarRes = await fetch("/api/push/abone");
      const anahtarVeri = await anahtarRes.json();
      if (!anahtarVeri.publicKey) throw new Error(anahtarVeri.error || "Sunucu anahtarı alınamadı");
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64ToUint8(anahtarVeri.publicKey),
        });
      }
      const r = await fetch("/api/push/abone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abonelik: sub.toJSON() }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Kayıt başarısız");
      }
      setAbone(true);
      setMesaj({ tur: "basari", metin: "Bildirimler bu cihazda açıldı." });
      if (isAdmin) listeyiYukle();
    } catch (e) {
      setMesaj({ tur: "hata", metin: "Bildirim açılamadı: " + (e.message || e) });
    } finally {
      setIslem(false);
    }
  }

  async function bildirimKapat() {
    setIslem(true);
    setMesaj(null);
    try {
      const reg = await swHazir();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/abone", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      setAbone(false);
      setMesaj({ tur: "basari", metin: "Bu cihazda bildirimler kapatıldı." });
      if (isAdmin) listeyiYukle();
    } catch (e) {
      setMesaj({ tur: "hata", metin: "Kapatılamadı: " + (e.message || e) });
    } finally {
      setIslem(false);
    }
  }

  async function denemeGonder() {
    setMesaj(null);
    try {
      const reg = await swHazir();
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setMesaj({ tur: "hata", metin: "Önce bu cihazda bildirimleri aç." });
        return;
      }
      setGonderiyor(true);
      const r = await fetch("/api/duyurular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, endpoint: sub.endpoint, baslik: baslik, metin: metin }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Gönderilemedi");
      setMesaj({
        tur: d.basarili ? "basari" : "hata",
        metin: d.basarili ? "Deneme bildirimi gönderildi, birkaç saniye içinde gelmeli." : "Deneme bildirimi iletilemedi.",
      });
    } catch (e) {
      setMesaj({ tur: "hata", metin: e.message || String(e) });
    } finally {
      setGonderiyor(false);
    }
  }

  async function duyuruGonder() {
    if (!baslik.trim() || !metin.trim()) {
      setMesaj({ tur: "hata", metin: "Başlık ve duyuru metnini yaz." });
      return;
    }
    const kime = aboneSayisi !== null ? aboneSayisi + " cihaza" : "bildirimi açık herkese";
    if (!confirm("Bu duyuru " + kime + " bildirim olarak gidecek. Gönderilsin mi?")) return;
    setGonderiyor(true);
    setMesaj(null);
    try {
      const r = await fetch("/api/duyurular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baslik: baslik, metin: metin }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Gönderilemedi");
      setMesaj({
        tur: "basari",
        metin: "Duyuru gönderildi: " + d.basarili + " cihaza ulaştı" + (d.basarisiz ? ", " + d.basarisiz + " cihaza ulaşamadı." : "."),
      });
      setBaslik("");
      setMetin("");
      listeyiYukle();
    } catch (e) {
      setMesaj({ tur: "hata", metin: e.message || String(e) });
    } finally {
      setGonderiyor(false);
    }
  }

  async function duyuruSil(id) {
    if (!confirm("Bu duyuru geçmişten silinsin mi? (Telefonlara giden bildirim geri alınmaz.)")) return;
    const r = await fetch("/api/duyurular?id=" + encodeURIComponent(id), { method: "DELETE" });
    if (r.ok) setListe((l) => l.filter((x) => x.id !== id));
    else setMesaj({ tur: "hata", metin: "Silinemedi." });
  }

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Duyurular</h1>
      </div>
      <p style={{ color: "var(--metin-soluk)", marginTop: 0, marginBottom: 16, fontSize: 14 }}>
        Yöneticinin gönderdiği duyurular telefona bildirim olarak düşer. Aşağıda geçmiş duyuruları da görebilirsin.
      </p>

      {mesaj && (
        <div className={mesaj.tur === "basari" ? "basari" : "hata"} style={{ marginBottom: 14 }}>
          {mesaj.metin}
        </div>
      )}

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-ic">
          <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--baslik)" }}>Bu cihazdaki bildirimler</div>

          {destek === null && <div style={{ color: "var(--metin-soluk)", fontSize: 14 }}>Kontrol ediliyor...</div>}

          {destek === false && ios && !uygulamaModu && (
            <div className="uyari">
              iPhone'da bildirim alabilmek için önce siteyi Ana Ekrana eklemelisin: Safari'de alttaki <b>Paylaş</b> düğmesine bas, <b>Ana Ekrana Ekle</b>'yi seç,
              sonra uygulamayı ana ekrandaki simgesinden aç ve bu sayfaya tekrar gel. (iOS 16.4 veya üstü gerekir.)
            </div>
          )}
          {destek === false && !(ios && !uygulamaModu) && (
            <div className="uyari">Bu tarayıcı bildirimleri desteklemiyor. Chrome (Android/bilgisayar) veya Safari'de ana ekrana eklenmiş uygulama dene.</div>
          )}

          {destek && izin === "denied" && (
            <div className="hata">
              Bildirimler tarayıcıdan engellenmiş. Adres çubuğundaki kilit/ayar simgesinden bu site için bildirimlere izin ver, sonra sayfayı yenile.
            </div>
          )}

          {destek && izin !== "denied" && abone && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="rozet rozet-yesil">Bildirimler AÇIK</span>
              <button className="btn btn-hayalet btn-sm" disabled={islem} onClick={bildirimKapat}>
                {islem ? "Kapatılıyor..." : "Bu cihazda kapat"}
              </button>
            </div>
          )}

          {destek && izin !== "denied" && !abone && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="rozet rozet-gri">Bildirimler kapalı</span>
              <button className="btn btn-lacivert btn-sm" disabled={islem} onClick={bildirimAc}>
                {islem ? "Açılıyor..." : "Bildirimleri aç"}
              </button>
            </div>
          )}

          {kurulumHazir && (
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-hayalet btn-sm" onClick={uygulamayiKur}>
                Uygulamayı telefona / bilgisayara kur
              </button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="kart" style={{ marginBottom: 16 }}>
          <div className="kart-ic">
            <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--baslik)" }}>Yeni duyuru gönder</div>
            <div style={{ color: "var(--metin-soluk)", fontSize: 13, marginBottom: 12 }}>
              {aboneSayisi !== null ? "Şu an bildirimi açık " + aboneSayisi + " cihaz var." : ""}
            </div>
            <label className="etiket">Başlık</label>
            <input
              type="text"
              value={baslik}
              maxLength={80}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="Örn: Yarın yoklama 08:00'de"
              style={{ width: "100%", marginBottom: 12 }}
            />
            <label className="etiket">Duyuru metni</label>
            <textarea
              value={metin}
              maxLength={500}
              rows={4}
              onChange={(e) => setMetin(e.target.value)}
              placeholder="Telefonda görünecek mesaj..."
              style={{ width: "100%", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-lacivert" disabled={gonderiyor} onClick={duyuruGonder}>
                {gonderiyor ? "Gönderiliyor..." : "Duyuruyu gönder"}
              </button>
              <button className="btn btn-hayalet" disabled={gonderiyor} onClick={denemeGonder}>
                Sadece bana deneme gönder
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="kart">
        <div className="kart-ic">
          <div style={{ fontWeight: 700, marginBottom: 12, color: "var(--baslik)" }}>Geçmiş duyurular</div>
          {!listeYuklendi && <div style={{ color: "var(--metin-soluk)", fontSize: 14 }}>Yükleniyor...</div>}
          {listeYuklendi && liste.length === 0 && (
            <div style={{ color: "var(--metin-soluk)", fontSize: 14 }}>Henüz duyuru yok.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {liste.map((d) => (
              <div key={d.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, color: "var(--baslik)" }}>{d.baslik}</div>
                  {isAdmin && (
                    <button className="btn btn-hayalet btn-sm" onClick={() => duyuruSil(d.id)} title="Geçmişten sil">
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 6, whiteSpace: "pre-wrap", fontSize: 14 }}>{d.metin}</div>
                <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--metin-soluk)" }}>
                  {tarihYaz(d.created_at)}
                  {d.gonderen ? " · " + d.gonderen : ""}
                  {isAdmin ? " · " + d.gonderilen_sayi + " cihaza gitti" + (d.basarisiz_sayi ? " (" + d.basarisiz_sayi + " ulaşamadı)" : "") : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
