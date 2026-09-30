"use client";
import { useEffect, useState, useCallback } from "react";
import { MODULLER } from "../../../lib/moduller";

const SEKMELER = [
  { id: "ogrenciler", etiket: "Öğrenciler" },
  { id: "kodlar", etiket: "Erişim Kodları" },
  { id: "gruplar", etiket: "Gruplar" },
  { id: "yedekle", etiket: "Yedekle" },
  { id: "denetim", etiket: "Denetim Kaydı" },
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
      {sekme === "yedekle" && <YedeklePaneli />}
      {sekme === "denetim" && <DenetimPaneli />}
    </>
  );
}

/* ================= ÖĞRENCİLER ================= */
function haritaLinki(adres) {
  if (!adres || !adres.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres.trim())}`;
}

// Bir öğrencinin yakınlar tablosundan (ogrenci_yakinlari) kısa özet satırı.
// v9 SQL'i henüz çalıştırılmadıysa eski anne/baba/diğer/veli alanlarına
// geri düşer.
function ogrenciYakinlari(o) {
  const yakinlar = Array.isArray(o.ogrenci_yakinlari) ? [...o.ogrenci_yakinlari].sort((a, b) => a.siralama - b.siralama) : [];
  if (yakinlar.length) return yakinlar;

  const eski = [];
  if (o.anne_adi || o.anne_telefon) eski.push({ id: "eski-anne", yakinlik: "Anne", ad_soyad: o.anne_adi, telefon: o.anne_telefon, meslek: o.anne_meslek });
  if (o.baba_adi || o.baba_telefon) eski.push({ id: "eski-baba", yakinlik: "Baba", ad_soyad: o.baba_adi, telefon: o.baba_telefon, meslek: o.baba_meslek });
  if (o.diger_yakin_adi || o.diger_yakin_telefon) {
    eski.push({ id: "eski-diger", yakinlik: o.diger_yakin_yakinlik || "Diğer", ad_soyad: o.diger_yakin_adi, telefon: o.diger_yakin_telefon });
  }
  if (!eski.length && (o.veli_adi || o.veli_telefon)) {
    eski.push({ id: "eski-veli", yakinlik: "Veli", ad_soyad: o.veli_adi, telefon: o.veli_telefon });
  }
  return eski;
}

function ogrenciVeliOzeti(o) {
  const yakinlar = ogrenciYakinlari(o);
  if (!yakinlar.length) return "Veli bilgisi girilmemiş";
  return yakinlar
    .map((y) => `${y.yakinlik}: ${y.ad_soyad || "-"}${y.meslek ? ` (${y.meslek})` : ""}${y.telefon ? ` · ${y.telefon}` : ""}`)
    .join("  ·  ");
}

const BOS_YAKIN = { yakinlik: "", ad_soyad: "", telefon: "", meslek: "", yasadigi_yer: "" };

function OgrencilerPaneli() {
  const [gruplar, setGruplar] = useState([]);
  const [sekmeGrupId, setSekmeGrupId] = useState("tumu");
  const [tumOgrenciler, setTumOgrenciler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [acikId, setAcikId] = useState(null);

  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [duzenleAdSoyad, setDuzenleAdSoyad] = useState("");
  const [duzenleGrupId, setDuzenleGrupId] = useState(null);
  const [duzenleYer, setDuzenleYer] = useState("");
  const [duzenleYakinlar, setDuzenleYakinlar] = useState([]);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const [formAdSoyad, setFormAdSoyad] = useState("");
  const [formYasadigiYer, setFormYasadigiYer] = useState("");
  const [formGrupId, setFormGrupId] = useState(null);
  const [yakinlarTaslak, setYakinlarTaslak] = useState([{ ...BOS_YAKIN, yakinlik: "Anne" }, { ...BOS_YAKIN, yakinlik: "Baba" }]);
  const [ekleniyor, setEkleniyor] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    fetch("/api/gruplar")
      .then((r) => r.json())
      .then((d) => {
        setGruplar(d.gruplar || []);
        if (d.gruplar?.length) setFormGrupId((mevcut) => mevcut || d.gruplar[0].id);
      });
  }, []);

  const getir = useCallback(() => {
    setYukleniyor(true);
    fetch("/api/ogrenciler")
      .then((r) => r.json())
      .then((d) => {
        setTumOgrenciler(d.ogrenciler || []);
        setYukleniyor(false);
      });
  }, []);

  useEffect(() => getir(), [getir]);

  const gosterilenler = sekmeGrupId === "tumu" ? tumOgrenciler : tumOgrenciler.filter((o) => o.grup_id === sekmeGrupId);

  function yakinEkle() {
    setYakinlarTaslak((t) => [...t, { ...BOS_YAKIN }]);
  }
  function yakinSil(i) {
    setYakinlarTaslak((t) => t.filter((_, idx) => idx !== i));
  }
  function yakinDegistir(i, alan, deger) {
    setYakinlarTaslak((t) => t.map((y, idx) => (idx === i ? { ...y, [alan]: deger } : y)));
  }

  async function ekle(e) {
    e.preventDefault();
    setHata("");
    if (!formAdSoyad.trim() || !formGrupId) return;
    setEkleniyor(true);
    const res = await fetch("/api/ogrenciler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad_soyad: formAdSoyad,
        grup_id: formGrupId,
        yasadigi_yer: formYasadigiYer,
        yakinlar: yakinlarTaslak.filter((y) => y.yakinlik.trim() && (y.ad_soyad.trim() || y.telefon.trim())),
      }),
    });
    const d = await res.json();
    setEkleniyor(false);
    if (d.error) return setHata(d.error);
    setFormAdSoyad("");
    setFormYasadigiYer("");
    setYakinlarTaslak([{ ...BOS_YAKIN, yakinlik: "Anne" }, { ...BOS_YAKIN, yakinlik: "Baba" }]);
    getir();
  }

  async function sil(id) {
    if (!confirm("Bu öğrenciyi listeden kaldırmak istediğinize emin misiniz? Geçmiş yoklama kayıtları saklanır.")) return;
    await fetch(`/api/ogrenciler/${id}`, { method: "DELETE" });
    getir();
  }

  async function yakinSilKayitli(yakinId) {
    await fetch(`/api/ogrenci-yakinlari/${yakinId}`, { method: "DELETE" });
    getir();
  }

  function duzenlemeyeBasla(o) {
    setDuzenlenenId(o.id);
    setAcikId(o.id);
    setDuzenleAdSoyad(o.ad_soyad || "");
    setDuzenleGrupId(o.grup_id);
    setDuzenleYer(o.yasadigi_yer || "");
    setDuzenleYakinlar(
      ogrenciYakinlari(o).map((y) => ({
        id: y.id,
        yakinlik: y.yakinlik || "",
        ad_soyad: y.ad_soyad || "",
        telefon: y.telefon || "",
        meslek: y.meslek || "",
        yasadigi_yer: y.yasadigi_yer || "",
      }))
    );
  }

  function duzenlemeyiIptalEt() {
    setDuzenlenenId(null);
  }

  function duzenleYakinEkle() {
    setDuzenleYakinlar((t) => [...t, { ...BOS_YAKIN }]);
  }
  function duzenleYakinSil(i) {
    setDuzenleYakinlar((t) => t.filter((_, idx) => idx !== i));
  }
  function duzenleYakinDegistir(i, alan, deger) {
    setDuzenleYakinlar((t) => t.map((y, idx) => (idx === i ? { ...y, [alan]: deger } : y)));
  }

  async function duzenlemeyiKaydet(e) {
    e.preventDefault();
    if (!duzenleAdSoyad.trim() || !duzenleGrupId) return;
    setKaydediliyor(true);
    await fetch(`/api/ogrenciler/${duzenlenenId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_soyad: duzenleAdSoyad, grup_id: duzenleGrupId, yasadigi_yer: duzenleYer }),
    });
    for (const y of duzenleYakinlar) {
      if (!y.yakinlik.trim() && !y.ad_soyad.trim() && !y.telefon.trim()) continue;
      const gercekKayit = typeof y.id === "string" && !y.id.startsWith("eski-");
      if (gercekKayit) {
        await fetch(`/api/ogrenci-yakinlari/${y.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yakinlik: y.yakinlik, ad_soyad: y.ad_soyad, telefon: y.telefon, meslek: y.meslek, yasadigi_yer: y.yasadigi_yer }),
        });
      } else {
        await fetch("/api/ogrenci-yakinlari", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ogrenci_id: duzenlenenId, yakinlik: y.yakinlik, ad_soyad: y.ad_soyad, telefon: y.telefon, meslek: y.meslek, yasadigi_yer: y.yasadigi_yer }),
        });
      }
    }
    setKaydediliyor(false);
    setDuzenlenenId(null);
    getir();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 20 }}>
      <div className="kart">
        <div className="kart-ic">
          <div className="grup-sekme">
            <button className={sekmeGrupId === "tumu" ? "aktif" : ""} onClick={() => setSekmeGrupId("tumu")}>
              Tümü
            </button>
            {gruplar.map((g) => (
              <button key={g.id} className={sekmeGrupId === g.id ? "aktif" : ""} onClick={() => setSekmeGrupId(g.id)}>
                {g.isim}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "var(--metin-soluk)", fontWeight: 600, marginBottom: 14 }}>
            Toplam {gosterilenler.length} öğrenci
          </div>
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && gosterilenler.length === 0 && <div className="bos-durum">Bu grupta henüz öğrenci yok.</div>}
          {!yukleniyor &&
            gosterilenler.map((o) => {
              const acik = acikId === o.id;
              const grupAdi = gruplar.find((g) => g.id === o.grup_id)?.isim;
              const yakinlar = ogrenciYakinlari(o);
              return (
                <div key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="ogrenci-satir" style={{ borderBottom: "none", cursor: "pointer" }} onClick={() => setAcikId(acik ? null : o.id)}>
                    <div>
                      <div className="ogrenci-ad">
                        {o.ad_soyad} {sekmeGrupId === "tumu" && grupAdi && <span className="rozet rozet-gri" style={{ marginLeft: 6, fontWeight: 600 }}>{grupAdi}</span>}
                      </div>
                      <div className="ogrenci-detay">{ogrenciVeliOzeti(o)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-hayalet btn-sm" onClick={(e) => { e.stopPropagation(); setAcikId(acik ? null : o.id); if (duzenlenenId === o.id) setDuzenlenenId(null); }}>
                        {acik ? "Kapat" : "Detay"}
                      </button>
                      <button className="btn btn-hayalet btn-sm" onClick={(e) => { e.stopPropagation(); duzenlemeyeBasla(o); }}>
                        Düzenle
                      </button>
                      <button className="btn btn-tehlike btn-sm" onClick={(e) => { e.stopPropagation(); sil(o.id); }}>
                        Kaldır
                      </button>
                    </div>
                  </div>

                  {acik && duzenlenenId === o.id && (
                    <form onSubmit={duzenlemeyiKaydet} style={{ padding: "0 4px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <label className="etiket">Ad Soyad</label>
                        <input className="girdi" value={duzenleAdSoyad} onChange={(e) => setDuzenleAdSoyad(e.target.value)} />
                      </div>
                      <div>
                        <label className="etiket">Grup</label>
                        <select className="girdi" value={duzenleGrupId || ""} onChange={(e) => setDuzenleGrupId(e.target.value)}>
                          {gruplar.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.isim}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="etiket">Yaşadığı yer</label>
                        <input className="girdi" value={duzenleYer} onChange={(e) => setDuzenleYer(e.target.value)} placeholder="Örn. Fatih, İstanbul" />
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--baslik)", marginTop: 4 }}>Veliler / yakınlar</div>
                      {duzenleYakinlar.map((y, i) => (
                        <div key={y.id || `yeni-${i}`} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              className="girdi"
                              style={{ flex: 1 }}
                              value={y.yakinlik}
                              onChange={(e) => duzenleYakinDegistir(i, "yakinlik", e.target.value)}
                              placeholder="Yakınlığı — Anne, Baba, Amca..."
                            />
                            <button type="button" className="btn btn-tehlike btn-sm" onClick={() => duzenleYakinSil(i)} title="Bu yakını kaldır">
                              ✕
                            </button>
                          </div>
                          <input className="girdi" value={y.ad_soyad} onChange={(e) => duzenleYakinDegistir(i, "ad_soyad", e.target.value)} placeholder="İsim soyisim" />
                          <input className="girdi" value={y.telefon} onChange={(e) => duzenleYakinDegistir(i, "telefon", e.target.value)} placeholder="WhatsApp no — 05XX XXX XX XX" />
                          <input className="girdi" value={y.meslek} onChange={(e) => duzenleYakinDegistir(i, "meslek", e.target.value)} placeholder="Mesleği (isteğe bağlı)" />
                          <input
                            className="girdi"
                            value={y.yasadigi_yer}
                            onChange={(e) => duzenleYakinDegistir(i, "yasadigi_yer", e.target.value)}
                            placeholder="Yaşadığı yer (öğrenciden farklıysa)"
                          />
                        </div>
                      ))}
                      <button type="button" className="btn btn-hayalet btn-blok" onClick={duzenleYakinEkle}>
                        + Veli Ekle
                      </button>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-lacivert" disabled={kaydediliyor}>
                          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                        <button type="button" className="btn btn-hayalet" onClick={duzenlemeyiIptalEt}>
                          Vazgeç
                        </button>
                      </div>
                    </form>
                  )}

                  {acik && duzenlenenId !== o.id && (
                    <div style={{ padding: "0 4px 16px" }}>
                      {o.yasadigi_yer && (
                        <div style={{ marginBottom: 10, fontSize: 13.5 }}>
                          Adres: {o.yasadigi_yer}{" "}
                          <a href={haritaLinki(o.yasadigi_yer)} target="_blank" rel="noopener noreferrer" className="btn btn-hayalet btn-sm" style={{ marginLeft: 6 }}>
                            🗺️ Haritada aç
                          </a>
                        </div>
                      )}
                      {yakinlar.length === 0 && <div className="bos-durum" style={{ padding: "8px 0", fontSize: 13 }}>Kayıtlı yakın yok.</div>}
                      {yakinlar.map((y) => (
                        <div key={y.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 13.5 }}>
                            <strong>{y.yakinlik}</strong>
                            {y.ad_soyad && <>: {y.ad_soyad}</>}
                            {y.meslek && <> ({y.meslek})</>}
                            {y.telefon && <> · {y.telefon}</>}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {(y.yasadigi_yer || o.yasadigi_yer) && (
                              <a href={haritaLinki(y.yasadigi_yer || o.yasadigi_yer)} target="_blank" rel="noopener noreferrer" className="btn btn-hayalet btn-sm">
                                🗺️
                              </a>
                            )}
                            {typeof y.id === "string" && !y.id.startsWith("eski-") && (
                              <button className="btn btn-tehlike btn-sm" onClick={() => yakinSilKayitli(y.id)}>
                                Kaldır
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <div className="kart" style={{ alignSelf: "start" }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Yeni öğrenci ekle</h3>
          <form onSubmit={ekle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="etiket">Ad Soyad</label>
              <input className="girdi" value={formAdSoyad} onChange={(e) => setFormAdSoyad(e.target.value)} placeholder="Örn. Ahmet Yılmaz" />
            </div>
            <div>
              <label className="etiket">Grup</label>
              <select className="girdi" value={formGrupId || ""} onChange={(e) => setFormGrupId(e.target.value)}>
                {gruplar.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.isim}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiket">Yaşadığı yer (isteğe bağlı)</label>
              <input
                className="girdi"
                value={formYasadigiYer}
                onChange={(e) => setFormYasadigiYer(e.target.value)}
                placeholder="Örn. Fatih, İstanbul"
              />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--baslik)", marginTop: 6 }}>Veliler / yakınlar</div>
            {yakinlarTaslak.map((y, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="girdi"
                    style={{ flex: 1 }}
                    value={y.yakinlik}
                    onChange={(e) => yakinDegistir(i, "yakinlik", e.target.value)}
                    placeholder="Yakınlığı — Anne, Baba, Amca..."
                  />
                  <button type="button" className="btn btn-tehlike btn-sm" onClick={() => yakinSil(i)} title="Bu yakını kaldır">
                    ✕
                  </button>
                </div>
                <input className="girdi" value={y.ad_soyad} onChange={(e) => yakinDegistir(i, "ad_soyad", e.target.value)} placeholder="İsim soyisim" />
                <input className="girdi" value={y.telefon} onChange={(e) => yakinDegistir(i, "telefon", e.target.value)} placeholder="WhatsApp no — 05XX XXX XX XX" />
                <input className="girdi" value={y.meslek} onChange={(e) => yakinDegistir(i, "meslek", e.target.value)} placeholder="Mesleği (isteğe bağlı)" />
                <input
                  className="girdi"
                  value={y.yasadigi_yer}
                  onChange={(e) => yakinDegistir(i, "yasadigi_yer", e.target.value)}
                  placeholder="Yaşadığı yer (öğrenciden farklıysa)"
                />
              </div>
            ))}
            <button type="button" className="btn btn-hayalet btn-blok" onClick={yakinEkle}>
              + Veli Ekle
            </button>

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
  const [form, setForm] = useState({ kod: "", sahip_adi: "", admin: false, moduller: [] });
  const [ekleniyor, setEkleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [duzenlenenModuller, setDuzenlenenModuller] = useState([]);

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

  function formModulToggle(anahtar) {
    setForm((f) => ({
      ...f,
      moduller: f.moduller.includes(anahtar) ? f.moduller.filter((m) => m !== anahtar) : [...f.moduller, anahtar],
    }));
  }

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
    setForm({ kod: "", sahip_adi: "", admin: false, moduller: [] });
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

  async function duzenlemeyiAc(k) {
    if (duzenlenenId === k.id) {
      setDuzenlenenId(null);
      return;
    }
    const res = await fetch(`/api/kodlar/${k.id}/moduller`);
    const d = await res.json();
    setDuzenlenenModuller(d.moduller || []);
    setDuzenlenenId(k.id);
  }

  function duzenlenenToggle(anahtar) {
    setDuzenlenenModuller((m) => (m.includes(anahtar) ? m.filter((x) => x !== anahtar) : [...m, anahtar]));
  }

  async function duzenlenenKaydet(id) {
    await fetch(`/api/kodlar/${id}/moduller`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduller: duzenlenenModuller }),
    });
    setDuzenlenenId(null);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }}>
      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && kodlar.length === 0 && <div className="bos-durum">Henüz erişim kodu yok.</div>}
          {!yukleniyor &&
            kodlar.map((k) => (
              <div key={k.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="ogrenci-satir" style={{ borderBottom: "none" }}>
                  <div>
                    <div className="ogrenci-ad">
                      {k.sahip_adi} <span style={{ fontWeight: 400, color: "var(--metin-soluk)" }}>· {k.kod}</span>
                    </div>
                    <div className="ogrenci-detay">
                      {k.admin ? "Admin (her yeri ve yönetimi görür)" : "Sınırlı erişim (sadece izinli modüller)"}
                      {k.son_giris && <> · son giriş {new Date(k.son_giris).toLocaleDateString("tr-TR")}</>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={`rozet ${k.aktif ? "rozet-yesil" : "rozet-gri"}`}>{k.aktif ? "Aktif" : "Pasif"}</span>
                    {!k.admin && (
                      <button className="btn btn-hayalet btn-sm" onClick={() => duzenlemeyiAc(k)}>
                        {duzenlenenId === k.id ? "Kapat" : "Modülleri düzenle"}
                      </button>
                    )}
                    <button className="btn btn-hayalet btn-sm" onClick={() => aktifligiDegistir(k)}>
                      {k.aktif ? "Devre dışı bırak" : "Etkinleştir"}
                    </button>
                    <button className="btn btn-tehlike btn-sm" onClick={() => sil(k.id)}>
                      Sil
                    </button>
                  </div>
                </div>
                {duzenlenenId === k.id && (
                  <div style={{ padding: "0 4px 16px" }}>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                      {MODULLER.map((m) => (
                        <label key={m.anahtar} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={duzenlenenModuller.includes(m.anahtar)}
                            onChange={() => duzenlenenToggle(m.anahtar)}
                          />
                          {m.isim}
                        </label>
                      ))}
                    </div>
                    <button className="btn btn-lacivert btn-sm" onClick={() => duzenlenenKaydet(k.id)}>
                      Kaydet
                    </button>
                  </div>
                )}
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
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={form.admin} onChange={(e) => setForm({ ...form, admin: e.target.checked })} />
              Admin (her modülü ve Yönetim sayfasını görsün)
            </label>
            {!form.admin && (
              <div>
                <label className="etiket">Hangi modülleri görebilsin</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {MODULLER.map((m) => (
                    <label key={m.anahtar} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                      <input type="checkbox" checked={form.moduller.includes(m.anahtar)} onChange={() => formModulToggle(m.anahtar)} />
                      {m.isim}
                    </label>
                  ))}
                </div>
              </div>
            )}
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

  async function grupSil(g) {
    if (!confirm(`"${g.isim}" grubunu kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    const res = await fetch(`/api/gruplar/${g.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error || "Grup silinemedi.");
      return;
    }
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
                <div style={{ display: "flex", gap: 8 }}>
                  <button className={`btn btn-sm ${g.veli_bilgilendirme_aktif ? "btn-tehlike" : "btn-yesil"}`} onClick={() => bilgilendirmeyiDegistir(g)}>
                    {g.veli_bilgilendirme_aktif ? "Mesajı kapat" : "Mesajı aç"}
                  </button>
                  <button className="btn btn-tehlike btn-sm" onClick={() => grupSil(g)}>
                    Kaldır
                  </button>
                </div>
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
        </div>
      </div>
    </div>
  );
}

function YedeklePaneli() {
  const [dosya, setDosya] = useState(null);
  const [geriYukleniyor, setGeriYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState("");

  async function geriYukle() {
    if (!dosya) return;
    if (!confirm("Seçtiğiniz yedek dosyasındaki kayıtlar sisteme geri yüklenecek (aynı kayıt varsa üzerine yazılır, yoksa eklenir). Yedekten sonra eklenen hiçbir kayıt silinmez. Devam edilsin mi?")) return;
    setHata("");
    setSonuc(null);
    setGeriYukleniyor(true);
    try {
      const metin = await dosya.text();
      const dokum = JSON.parse(metin);
      const res = await fetch("/api/yedek/geri-yukle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dokum),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Geri yükleme başarısız oldu.");
      setSonuc(d);
    } catch (err) {
      setHata(err.message === "Unexpected token" || err.name === "SyntaxError" ? "Bu dosya geçerli bir yedek (.json) dosyası değil." : err.message);
    } finally {
      setGeriYukleniyor(false);
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="kart" style={{ marginBottom: 20 }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 10 }}>Tüm veriyi indir</h3>
          <p style={{ fontSize: 13.5, color: "var(--metin-soluk)", marginBottom: 16 }}>
            Öğrenciler, veliler, yoklama kayıtları, görev listeleri, erişim kodları — sistemdeki her şeyin tek bir
            dosyaya (.json) tam dökümü. Bir yere (bilgisayarınıza, Google Drive'a) kaydedip saklayın. Ne sıklıkla
            indireceğiniz size kalmış — mesela haftada bir indirip tarihli bir klasörde tutmanız önerilir.
          </p>
          <a href="/api/yedek" download className="btn btn-lacivert">
            ⬇️ Yedeği indir (.json)
          </a>
        </div>
      </div>

      <div className="kart" style={{ marginBottom: 20 }}>
        <div className="kart-ic">
          <h3 style={{ fontSize: 16, marginBottom: 10 }}>Yedekten geri yükle</h3>
          <p style={{ fontSize: 13.5, color: "var(--metin-soluk)", marginBottom: 16 }}>
            Daha önce indirdiğiniz bir yedek dosyasını seçin — sistemdeki kayıtları o dosyadaki hâline döndürür.
            Sadece dosyadaki kayıtları ekler/üzerine yazar; sonradan eklediğiniz hiçbir şeyi silmez.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="file"
              accept="application/json,.json"
              className="girdi"
              style={{ maxWidth: 300 }}
              onChange={(e) => { setDosya(e.target.files?.[0] || null); setSonuc(null); setHata(""); }}
            />
            <button className="btn btn-lacivert" onClick={geriYukle} disabled={!dosya || geriYukleniyor}>
              {geriYukleniyor ? "Geri yükleniyor..." : "Geri yükle"}
            </button>
          </div>
          {hata && <div className="hata" style={{ marginTop: 12 }}>{hata}</div>}
          {sonuc && (
            <div className="uyari" style={{ marginTop: 12 }}>
              Geri yükleme tamamlandı — toplam {sonuc.toplamSatir} kayıt işlendi. Sayfayı yenileyip kontrol edebilirsiniz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= DENETİM KAYDI ================= */

const DENETIM_ROZET = {
  ekleme: "rozet-yesil",
  guncelleme: "rozet-mavi",
  silme: "rozet-kirmizi",
};
const DENETIM_ETIKET = {
  ekleme: "Ekleme",
  guncelleme: "Güncelleme",
  silme: "Silme",
};

function denetimTarihFormatla(t) {
  if (!t) return "";
  const d = new Date(t);
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const saat = String(d.getHours()).padStart(2, "0");
  const dakika = String(d.getMinutes()).padStart(2, "0");
  return `${gun}.${ay}.${d.getFullYear()} ${saat}:${dakika}`;
}

function DenetimPaneli() {
  const [kayitlar, setKayitlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hazirDegil, setHazirDegil] = useState(false);
  const [ara, setAra] = useState("");

  useEffect(() => {
    fetch("/api/denetim")
      .then((r) => r.json())
      .then((d) => {
        setKayitlar(d.kayitlar || []);
        setHazirDegil(!!d.hazirDegil);
        setYukleniyor(false);
      });
  }, []);

  const gosterilenler = ara.trim()
    ? kayitlar.filter((k) => (k.aciklama || "").toLocaleLowerCase("tr").includes(ara.trim().toLocaleLowerCase("tr")) || (k.kullanici || "").toLocaleLowerCase("tr").includes(ara.trim().toLocaleLowerCase("tr")))
    : kayitlar;

  return (
    <div className="kart">
      <div className="kart-ic">
        {hazirDegil && (
          <div className="uyari" style={{ marginBottom: 16 }}>
            Denetim kaydı tablosu henüz oluşturulmamış. Supabase SQL Editor'de{" "}
            <code>supabase_schema_v11_denetim_ve_ekler.sql</code> dosyasını çalıştırınca, o andan itibaren yapılan
            değişiklikler burada listelenmeye başlayacak.
          </div>
        )}
        {!hazirDegil && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 13, color: "var(--metin-soluk)", fontWeight: 600 }}>
                Son {kayitlar.length} kayıt — en yeni en üstte
              </div>
              <input className="girdi" style={{ maxWidth: 260 }} placeholder="Kişi veya açıklamada ara..." value={ara} onChange={(e) => setAra(e.target.value)} />
            </div>
            {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
            {!yukleniyor && gosterilenler.length === 0 && <div className="bos-durum">Henüz bir kayıt yok.</div>}
            {!yukleniyor && gosterilenler.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>Tarih</th>
                    <th style={{ width: 130 }}>Kullanıcı</th>
                    <th style={{ width: 100 }}>İşlem</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {gosterilenler.map((k) => (
                    <tr key={k.id}>
                      <td style={{ fontSize: 13, color: "var(--metin-soluk)", whiteSpace: "nowrap" }}>{denetimTarihFormatla(k.tarih)}</td>
                      <td style={{ fontWeight: 600 }}>{k.kullanici || "—"}</td>
                      <td>
                        <span className={`rozet ${DENETIM_ROZET[k.islem] || "rozet-gri"}`}>{DENETIM_ETIKET[k.islem] || k.islem}</span>
                      </td>
                      <td style={{ fontSize: 13.5 }}>{k.aciklama}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
