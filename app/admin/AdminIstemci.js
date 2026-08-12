"use client";
import { useEffect, useState, useCallback } from "react";

const SEKMELER = [
  { id: "ogrenciler", etiket: "Öğrenciler" },
  { id: "kodlar", etiket: "Erişim Kodları" },
  { id: "gruplar", etiket: "Gruplar" },
];

export default function AdminIstemci() {
  const [sekme, setSekme] = useState("ogrenciler");
  return (
    <>
      <div className="sayfa-baslik">
        <h1>Yönetim</h1>
      </div>
      <p className="sayfa-alt">Öğrenci ekleyin, personelinize giriş kodu tanımlayın, grup ayarlarını yönetin.</p>
      <div className="grup-sekme">
        {SEKMELER.map((s) => (
          <button key={s.id} className={sekme === s.id ? "aktif" : ""} onClick={() => setSekme(s.id)}>
            {s.etiket}
          </button>
        ))}
      </div>
      {sekme === "ogrenciler" && <OgrencilerPaneli />}
      {sekme === "kodlar" && <KodlarPaneli />}
      {sekme === "gruplar" && <GruplarPaneli />}
    </>
  );
}

/* ================= ÖĞRENCİLER ================= */
function OgrencilerPaneli() {
  const [gruplar, setGruplar] = useState([]);
  const [grupId, setGrupId] = useState(null);
  const [ogrenciler, setOgrenciler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [form, setForm] = useState({ ad_soyad: "", veli_adi: "", veli_telefon: "" });
  const [ekleniyor, setEkleniyor] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    fetch("/api/gruplar")
      .then((r) => r.json())
      .then((d) => {
        setGruplar(d.gruplar || []);
        if (d.gruplar?.length) setGrupId(d.gruplar[0].id);
      });
  }, []);

  const getir = useCallback(() => {
    if (!grupId) return;
    setYukleniyor(true);
    fetch(`/api/ogrenciler?grup_id=${grupId}`)
      .then((r) => r.json())
      .then((d) => {
        setOgrenciler(d.ogrenciler || []);
        setYukleniyor(false);
      });
  }, [grupId]);

  useEffect(() => getir(), [getir]);

  async function ekle(e) {
    e.preventDefault();
    setHata("");
    if (!form.ad_soyad.trim()) return;
    setEkleniyor(true);
    const res = await fetch("/api/ogrenciler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, grup_id: grupId }),
    });
    const d = await res.json();
    setEkleniyor(false);
    if (d.error) return setHata(d.error);
    setForm({ ad_soyad: "", veli_adi: "", veli_telefon: "" });
    getir();
  }

  async function sil(id) {
    if (!confirm("Bu öğrenciyi listeden kaldırmak istediğinize emin misiniz? Geçmiş yoklama kayıtları saklanır.")) return;
    await fetch(`/api/ogrenciler/${id}`, { method: "DELETE" });
    getir();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }}>
      <div className="kart">
        <div className="kart-ic">
          <div className="grup-sekme">
            {gruplar.map((g) => (
              <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
                {g.isim}
              </button>
            ))}
          </div>
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && ogrenciler.length === 0 && <div className="bos-durum">Bu grupta henüz öğrenci yok.</div>}
          {!yukleniyor &&
            ogrenciler.map((o) => (
              <div className="ogrenci-satir" key={o.id}>
                <div>
                  <div className="ogrenci-ad">{o.ad_soyad}</div>
                  <div className="ogrenci-detay">
                    {o.veli_adi || "Veli adı yok"} {o.veli_telefon ? `· ${o.veli_telefon}` : "· telefon yok"}
                  </div>
                </div>
                <button className="btn btn-tehlike btn-sm" onClick={() => sil(o.id)}>
                  Kaldır
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="kart" style={{ alignSelf: "start" }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Yeni öğrenci ekle</h3>
          <form onSubmit={ekle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="etiket">Ad Soyad</label>
              <input
                className="girdi"
                value={form.ad_soyad}
                onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })}
                placeholder="Örn. Ahmet Yılmaz"
              />
            </div>
            <div>
              <label className="etiket">Veli adı</label>
              <input
                className="girdi"
                value={form.veli_adi}
                onChange={(e) => setForm({ ...form, veli_adi: e.target.value })}
                placeholder="Örn. Mehmet Yılmaz"
              />
            </div>
            <div>
              <label className="etiket">Veli WhatsApp no</label>
              <input
                className="girdi"
                value={form.veli_telefon}
                onChange={(e) => setForm({ ...form, veli_telefon: e.target.value })}
                placeholder="05XX XXX XX XX"
              />
            </div>
            {hata && <div className="hata">{hata}</div>}
            <button className="btn btn-lacivert btn-blok" disabled={ekleniyor}>
              {ekleniyor ? "Ekleniyor..." : "Ekle"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ================= ERİŞİM KODLARI ================= */
function KodlarPaneli() {
  const [kodlar, setKodlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [form, setForm] = useState({ kod: "", sahip_adi: "", yetki: "yoklamaci" });
  const [ekleniyor, setEkleniyor] = useState(false);
  const [hata, setHata] = useState("");

  const getir = useCallback(() => {
    setYukleniyor(true);
    fetch("/api/kodlar")
      .then((r) => r.json())
      .then((d) => {
        setKodlar(d.kodlar || []);
        setYukleniyor(false);
      });
  }, []);

  useEffect(() => getir(), [getir]);

  async function ekle(e) {
    e.preventDefault();
    setHata("");
    if (!form.kod.trim() || !form.sahip_adi.trim()) return;
    setEkleniyor(true);
    const res = await fetch("/api/kodlar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setEkleniyor(false);
    if (d.error) return setHata(d.error.includes("duplicate") ? "Bu kod zaten kullanılıyor." : d.error);
    setForm({ kod: "", sahip_adi: "", yetki: "yoklamaci" });
    getir();
  }

  async function aktifligiDegistir(k) {
    await fetch(`/api/kodlar/${k.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !k.aktif }),
    });
    getir();
  }

  async function sil(id) {
    if (!confirm("Bu erişim kodunu tamamen silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/kodlar/${id}`, { method: "DELETE" });
    getir();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }}>
      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && kodlar.length === 0 && <div className="bos-durum">Henüz erişim kodu yok.</div>}
          {!yukleniyor &&
            kodlar.map((k) => (
              <div className="ogrenci-satir" key={k.id}>
                <div>
                  <div className="ogrenci-ad">
                    {k.sahip_adi} <span style={{ fontWeight: 400, color: "var(--metin-soluk)" }}>· {k.kod}</span>
                  </div>
                  <div className="ogrenci-detay">
                    {k.yetki === "yonetici" ? "Yönetici (her yeri görür)" : "Yoklamacı (yönetim hariç)"}
                    {k.son_giris && <> · son giriş {new Date(k.son_giris).toLocaleDateString("tr-TR")}</>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className={`rozet ${k.aktif ? "rozet-yesil" : "rozet-gri"}`}>{k.aktif ? "Aktif" : "Pasif"}</span>
                  <button className="btn btn-hayalet btn-sm" onClick={() => aktifligiDegistir(k)}>
                    {k.aktif ? "Devre dışı bırak" : "Etkinleştir"}
                  </button>
                  <button className="btn btn-tehlike btn-sm" onClick={() => sil(k.id)}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="kart" style={{ alignSelf: "start" }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Yeni erişim kodu</h3>
          <form onSubmit={ekle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="etiket">Kimin için</label>
              <input
                className="girdi"
                value={form.sahip_adi}
                onChange={(e) => setForm({ ...form, sahip_adi: e.target.value })}
                placeholder="Örn. Rehber Abi - Bilal"
              />
            </div>
            <div>
              <label className="etiket">Kod</label>
              <input
                className="girdi"
                value={form.kod}
                onChange={(e) => setForm({ ...form, kod: e.target.value })}
                placeholder="Örn. YT8271"
              />
            </div>
            <div>
              <label className="etiket">Yetki</label>
              <select className="girdi" value={form.yetki} onChange={(e) => setForm({ ...form, yetki: e.target.value })}>
                <option value="yoklamaci">Yoklamacı (Yönetim sayfasını göremez)</option>
                <option value="yonetici">Yönetici (her yeri görür)</option>
              </select>
            </div>
            {hata && <div className="hata">{hata}</div>}
            <button className="btn btn-lacivert btn-blok" disabled={ekleniyor}>
              {ekleniyor ? "Ekleniyor..." : "Oluştur"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ================= GRUPLAR ================= */
function GruplarPaneli() {
  const [gruplar, setGruplar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yeniIsim, setYeniIsim] = useState("");
  const [ekleniyor, setEkleniyor] = useState(false);

  const getir = useCallback(() => {
    setYukleniyor(true);
    fetch("/api/gruplar")
      .then((r) => r.json())
      .then((d) => {
        setGruplar(d.gruplar || []);
        setYukleniyor(false);
      });
  }, []);

  useEffect(() => getir(), [getir]);

  async function bilgilendirmeyiDegistir(g) {
    await fetch("/api/gruplar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id, veli_bilgilendirme_aktif: !g.veli_bilgilendirme_aktif }),
    });
    getir();
  }

  async function grupEkle(e) {
    e.preventDefault();
    if (!yeniIsim.trim()) return;
    setEkleniyor(true);
    await fetch("/api/gruplar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isim: yeniIsim, siralama: gruplar.length + 1 }),
    });
    setYeniIsim("");
    setEkleniyor(false);
    getir();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }}>
      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor &&
            gruplar.map((g) => (
              <div className="ogrenci-satir" key={g.id}>
                <div>
                  <div className="ogrenci-ad">{g.isim}</div>
                  <div className="ogrenci-detay">
                    {g.veli_bilgilendirme_aktif
                      ? "Veli Bilgilendirme sayfasında görünür"
                      : "Veli Bilgilendirme sayfasında gizli — bu gruba mesaj gönderilmez"}
                  </div>
                </div>
                <button className={`btn btn-sm ${g.veli_bilgilendirme_aktif ? "btn-tehlike" : "btn-yesil"}`} onClick={() => bilgilendirmeyiDegistir(g)}>
                  {g.veli_bilgilendirme_aktif ? "Mesajı kapat" : "Mesajı aç"}
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="kart" style={{ alignSelf: "start" }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Yeni grup ekle</h3>
          <form onSubmit={grupEkle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="etiket">Grup adı</label>
              <input className="girdi" value={yeniIsim} onChange={(e) => setYeniIsim(e.target.value)} placeholder="Örn. Hazırlık" />
            </div>
            <button className="btn btn-lacivert btn-blok" disabled={ekleniyor}>
              {ekleniyor ? "Ekleniyor..." : "Ekle"}
            </button>
          </form>
          <div className="uyari" style={{ marginTop: 18 }}>
            WhatsApp'ı tamamen otomatik (tek tuşla, tıklamadan) toplu göndermek isterseniz, Meta WhatsApp
            Business Cloud API için işletme hesabı başvurusu gerekir. Şu anki sistem her veli için hazır
            mesajlı bağlantı üretir, gönder'e siz basarsınız.
          </div>
        </div>
      </div>
    </div>
  );
}
