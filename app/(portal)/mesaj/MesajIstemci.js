"use client";
import { useEffect, useState, useCallback } from "react";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Bir öğrencinin kayıtlı yakınlarından (ogrenci_yakinlari tablosu) telefonu
// olanları tek tek listeler — her biri kendi WhatsApp bağlantısını alır.
// Henüz v9 SQL'i çalıştırılmamış / eski (v8 öncesi) kayıtlarda yakın
// tablosu boşsa eski anne/baba/diğer/veli alanlarına geri düşer.
function ogrenciKontaklari(o) {
  const yakinlar = Array.isArray(o.ogrenci_yakinlari) ? o.ogrenci_yakinlari : [];
  const kontaklar = yakinlar
    .filter((y) => y.telefon)
    .map((y) => ({ etiket: y.yakinlik || "Yakını", ad: y.ad_soyad || y.yakinlik || "Yakını", telefon: y.telefon }));
  if (kontaklar.length) return kontaklar;

  // Eski şema geri düşüşü
  const eski = [];
  if (o.anne_telefon) eski.push({ etiket: "Anne", ad: o.anne_adi || "Anne", telefon: o.anne_telefon });
  if (o.baba_telefon) eski.push({ etiket: "Baba", ad: o.baba_adi || "Baba", telefon: o.baba_telefon });
  if (o.diger_yakin_telefon) {
    eski.push({
      etiket: o.diger_yakin_yakinlik || "Diğer",
      ad: o.diger_yakin_adi || o.diger_yakin_yakinlik || "Yakını",
      telefon: o.diger_yakin_telefon,
    });
  }
  if (!eski.length && o.veli_telefon) {
    eski.push({ etiket: "Veli", ad: o.veli_adi || "Veli", telefon: o.veli_telefon });
  }
  return eski;
}

function whatsappNumarasi(tel) {
  if (!tel) return null;
  let t = tel.replace(/[^0-9]/g, ""); // sadece rakamlar
  if (t.startsWith("90")) return t; // zaten uluslararası: 905321234567
  if (t.startsWith("0")) return "90" + t.slice(1); // 05321234567 -> 905321234567
  if (t.length === 10) return "90" + t; // 5321234567 -> 905321234567
  return t;
}

const KAYNAKLAR = [
  { anahtar: "yoklama", isim: "Yoklama" },
  { anahtar: "namaz", isim: "Namaz Yoklama" },
];

const VAKIT_ETIKET = { sabah: "Sabah", ogle: "Öğle", ikindi: "İkindi", aksam: "Akşam", yatsi: "Yatsı" };
const VAKIT_SIRA = ["sabah", "ogle", "ikindi", "aksam", "yatsi"];
const NAMAZ_DURUM_ETIKET = { kildi: "Kıldı", gec_kildi: "Geç Kıldı", izinli: "İzinli", kilmadi: "Kılmadı" };

const VARSAYILAN_SABLON_YOKLAMA =
  "Sayın {veli}, {ogrenci} adlı öğrencimizin {tarih} tarihli {tur} durumu: {durum}. Bilginize sunarız. Yavuztürk Süleymaniye Yurdu";
const VARSAYILAN_SABLON_NAMAZ =
  "Sayın {veli}, {ogrenci} adlı öğrencimizin {tarih} tarihli namaz durumu: {durum}. Bilginize sunarız. Yavuztürk Süleymaniye Yurdu";

export default function MesajIstemci({ baslangicGruplar, baslangicTurler }) {
  const [kaynak, setKaynak] = useState("yoklama");
  const [gruplar] = useState(baslangicGruplar || []);
  const [grupId, setGrupId] = useState(baslangicGruplar?.[0]?.id || null);
  const [turler] = useState(baslangicTurler || []);
  const [turId, setTurId] = useState(baslangicTurler?.[0]?.id || null);
  const [tarih, setTarih] = useState(bugun());
  const [durumFiltre, setDurumFiltre] = useState("izinsiz");
  const [sablonlar, setSablonlar] = useState([]);
  const [sablonId, setSablonId] = useState(null);
  const [sablon, setSablon] = useState(VARSAYILAN_SABLON_YOKLAMA);
  const [sablonElleDegisti, setSablonElleDegisti] = useState(false);
  const [sablonKaydediliyor, setSablonKaydediliyor] = useState(false);
  const [sablonHata, setSablonHata] = useState("");
  const [ogrenciler, setOgrenciler] = useState([]);
  const [kayitMap, setKayitMap] = useState({}); // yoklama: ogrenci_id -> kayit | namaz: ogrenci_id -> [kayitlar]
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kayitHata, setKayitHata] = useState("");

  // Kaynak değişince filtre ve şablon listesini o kaynağa uygun olana çek.
  // ogrenciler/kayitMap'i de HEMEN boşaltıyoruz: "namaz" kaynağında kayıt
  // şekli dizi, "yoklama" kaynağında tek nesne — yeni veri gelene kadar eski
  // (yanlış şekilde) veri ekranda kalırsa aşağıdaki hesaplamalar çöküyordu
  // ("kayitlar.some is not a function").
  useEffect(() => {
    setDurumFiltre(kaynak === "namaz" ? "kilmadi" : "izinsiz");
    setOgrenciler([]);
    setKayitMap({});
    setSablonElleDegisti(false);
    fetch(`/api/mesaj-sablonlari?kaynak=${kaynak}`)
      .then((r) => r.json())
      .then((d) => {
        const liste = d.sablonlar || [];
        setSablonlar(liste);
        const ilk = liste[0];
        setSablonId(ilk?.id || null);
        setSablon(ilk?.icerik || (kaynak === "namaz" ? VARSAYILAN_SABLON_NAMAZ : VARSAYILAN_SABLON_YOKLAMA));
      });
  }, [kaynak]);

  function sablonSec(s) {
    setSablonId(s.id);
    setSablon(s.icerik);
    setSablonElleDegisti(false);
    setSablonHata("");
  }

  async function sablonuKaydet() {
    if (!sablonId) return;
    setSablonKaydediliyor(true);
    setSablonHata("");
    const res = await fetch(`/api/mesaj-sablonlari/${sablonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icerik: sablon }),
    });
    const d = await res.json();
    setSablonKaydediliyor(false);
    if (d.error) return setSablonHata(d.error);
    setSablonlar((liste) => liste.map((s) => (s.id === sablonId ? { ...s, icerik: sablon } : s)));
    setSablonElleDegisti(false);
  }

  async function sablonuFarkliKaydet() {
    const ad = prompt("Yeni şablona bir isim verin (örn. \"Kısa versiyon\"):");
    if (!ad?.trim()) return;
    setSablonKaydediliyor(true);
    setSablonHata("");
    const res = await fetch("/api/mesaj-sablonlari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad: ad.trim(), kaynak, icerik: sablon, siralama: sablonlar.length + 1 }),
    });
    const d = await res.json();
    setSablonKaydediliyor(false);
    if (d.error) return setSablonHata(d.error);
    setSablonlar((liste) => [...liste, d.sablon]);
    setSablonId(d.sablon.id);
    setSablonElleDegisti(false);
  }

  const getir = useCallback(() => {
    if (!grupId) return;
    if (kaynak === "yoklama" && !turId) return;
    setYukleniyor(true);
    if (kaynak === "namaz") {
      fetch(`/api/namaz-yoklama?grup_id=${grupId}&tarih=${tarih}`)
        .then((r) => r.json())
        .then((d) => {
          setOgrenciler(d.ogrenciler || []);
          const map = {};
          (d.kayitlar || []).forEach((k) => {
            if (!map[k.ogrenci_id]) map[k.ogrenci_id] = [];
            map[k.ogrenci_id].push(k);
          });
          setKayitMap(map);
          setYukleniyor(false);
        });
    } else {
      fetch(`/api/yoklama?grup_id=${grupId}&tarih=${tarih}&tur_id=${turId}`)
        .then((r) => r.json())
        .then((d) => {
          setOgrenciler(d.ogrenciler || []);
          const map = {};
          (d.kayitlar || []).forEach((k) => (map[k.ogrenci_id] = k));
          setKayitMap(map);
          setYukleniyor(false);
        });
    }
  }, [kaynak, grupId, turId, tarih]);

  useEffect(() => getir(), [getir]);

  const seciliGrup = gruplar.find((g) => g.id === grupId);
  const grupKapali = seciliGrup && seciliGrup.veli_bilgilendirme_aktif === false;
  const seciliTur = turler.find((t) => t.id === turId);

  const durumEtiketYoklama = { geldi: "Geldi", izinli: "İzinli", izinsiz: "İzinsiz" };

  function namazOzeti(kayitlarGirdi) {
    const kayitlar = Array.isArray(kayitlarGirdi) ? kayitlarGirdi : [];
    if (kayitlar.length === 0) return "İşaretlenmedi";
    return VAKIT_SIRA.filter((v) => kayitlar.some((k) => k.vakit === v))
      .map((v) => {
        const k = kayitlar.find((kk) => kk.vakit === v);
        return `${VAKIT_ETIKET[v]}: ${NAMAZ_DURUM_ETIKET[k.durum] || k.durum}`;
      })
      .join(", ");
  }

  const hedefListe = ogrenciler
    .map((o) => ({ ogrenci: o, kayit: kayitMap[o.id], kontaklar: ogrenciKontaklari(o) }))
    .filter(({ kontaklar }) => kontaklar.length > 0)
    .filter(({ kayit }) => {
      if (kaynak === "namaz") {
        const kayitlar = Array.isArray(kayit) ? kayit : [];
        if (durumFiltre === "hepsi") return kayitlar.length > 0;
        return kayitlar.some((k) => k.durum === durumFiltre);
      }
      if (durumFiltre === "hepsi") return true;
      return kayit?.durum === durumFiltre;
    });

  function mesajUret(ogrenci, kayit, kontakAdi) {
    const durumMetni = kaynak === "namaz" ? namazOzeti(kayit) : kayit ? durumEtiketYoklama[kayit.durum] : "İşaretlenmedi";
    return sablon
      .replaceAll("{veli}", kontakAdi || "Veli")
      .replaceAll("{ogrenci}", ogrenci.ad_soyad)
      .replaceAll("{tarih}", tarih.split("-").reverse().join("."))
      .replaceAll("{tur}", seciliTur?.isim || "yoklama")
      .replaceAll("{durum}", durumMetni);
  }

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Veli Bilgilendirme</h1>
      </div>
      <p className="sayfa-alt">
        Önce hangi konuda mesaj göndereceğinizi seçin. Her veli için hazır mesajla WhatsApp'ı açan bir bağlantı üretir;
        gönder'e siz basarsınız.
      </p>

      <div className="grup-sekme">
        {KAYNAKLAR.map((k) => (
          <button key={k.anahtar} className={kaynak === k.anahtar ? "aktif" : ""} onClick={() => setKaynak(k.anahtar)}>
            {k.isim}
          </button>
        ))}
      </div>

      {kaynak === "yoklama" && turler.length > 1 && (
        <>
          <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Hangi yoklama türü</label>
          <div className="grup-sekme">
            {turler.map((t) => (
              <button key={t.id} className={turId === t.id ? "aktif" : ""} onClick={() => setTurId(t.id)}>
                {t.isim}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="grup-sekme">
        {gruplar.map((g) => (
          <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
            {g.isim} {g.veli_bilgilendirme_aktif === false && "🔕"}
          </button>
        ))}
      </div>

      {grupKapali ? (
        <div className="uyari">
          {seciliGrup.isim} grubu için veli bilgilendirmesi Yönetim sayfasından kapatılmış. Açmak için Yönetim →
          Gruplar bölümüne gidin.
        </div>
      ) : (
        <>
          <div className="kart" style={{ marginBottom: 20 }}>
            <div className="kart-ic">
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <label className="etiket">Tarih</label>
                  <input type="date" className="girdi" value={tarih} onChange={(e) => setTarih(e.target.value)} max={bugun()} />
                </div>
                <div>
                  <label className="etiket">Kimlere gönderilsin</label>
                  {kaynak === "namaz" ? (
                    <select className="girdi" value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)}>
                      <option value="kilmadi">En az bir vakti kılmayanlar</option>
                      <option value="gec_kildi">Geç kılanı olanlar</option>
                      <option value="izinli">İzinli olanlar</option>
                      <option value="hepsi">Bugün işaretlenen herkes</option>
                    </select>
                  ) : (
                    <select className="girdi" value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)}>
                      <option value="izinsiz">Sadece izinsiz olanlar</option>
                      <option value="izinli">Sadece izinli olanlar</option>
                      <option value="geldi">Sadece gelenler</option>
                      <option value="hepsi">Bugün işaretlenen herkes</option>
                    </select>
                  )}
                </div>
              </div>
              <label className="etiket">Mesaj şablonu</label>
              {sablonlar.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {sablonlar.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="btn-hayalet-sekme"
                      style={
                        s.id === sablonId
                          ? { background: "var(--lacivert)", borderColor: "var(--lacivert)", color: "#fff" }
                          : undefined
                      }
                      onClick={() => sablonSec(s)}
                    >
                      {s.ad}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                className="girdi"
                rows={3}
                value={sablon}
                onChange={(e) => {
                  setSablon(e.target.value);
                  setSablonElleDegisti(true);
                }}
              />
              <div style={{ fontSize: 12.5, color: "var(--metin-soluk)", marginTop: 6 }}>
                Kullanabileceğiniz alanlar: {"{veli}"}, {"{ogrenci}"}, {"{tarih}"}, {"{durum}"}
                {kaynak === "yoklama" && <> , {"{tur}"}</>}
              </div>
              {sablonElleDegisti && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {sablonId && (
                    <button type="button" className="btn btn-lacivert btn-sm" disabled={sablonKaydediliyor} onClick={sablonuKaydet}>
                      {sablonKaydediliyor ? "Kaydediliyor..." : "Bu şablonu güncelle"}
                    </button>
                  )}
                  <button type="button" className="btn btn-hayalet btn-sm" disabled={sablonKaydediliyor} onClick={sablonuFarkliKaydet}>
                    Yeni şablon olarak kaydet
                  </button>
                  <span style={{ fontSize: 12, color: "var(--metin-soluk)" }}>Değişiklik henüz kaydedilmedi</span>
                </div>
              )}
              {sablonHata && <div className="hata" style={{ marginTop: 10 }}>{sablonHata}</div>}
            </div>
          </div>

          <div className="kart">
            <div className="kart-ic">
              {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
              {!yukleniyor && hedefListe.length === 0 && (
                <div className="bos-durum">Bu filtreye uyan, telefonu kayıtlı öğrenci yok.</div>
              )}
              {!yukleniyor &&
                hedefListe.map(({ ogrenci, kayit, kontaklar }) =>
                  kontaklar.map((kontak) => {
                    const numara = whatsappNumarasi(kontak.telefon);
                    const metin = mesajUret(ogrenci, kayit, kontak.ad);
                    const link = numara ? `https://wa.me/${numara}?text=${encodeURIComponent(metin)}` : null;
                    return (
                      <div className="ogrenci-satir" key={`${ogrenci.id}:${kontak.etiket}`}>
                        <div>
                          <div className="ogrenci-ad">{ogrenci.ad_soyad}</div>
                          <div className="ogrenci-detay">
                            {kontak.etiket}: {kontak.ad} · {kontak.telefon}
                          </div>
                        </div>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-yesil btn-sm">
                          WhatsApp'ta gönder
                        </a>
                      </div>
                    );
                  })
                )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
