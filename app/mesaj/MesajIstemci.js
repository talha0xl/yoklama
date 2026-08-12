"use client";
import { useEffect, useState, useCallback } from "react";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function whatsappNumarasi(tel) {
  if (!tel) return null;
  let t = tel.replace(/[^0-9]/g, ""); // sadece rakamlar
  if (t.startsWith("90")) return t; // zaten uluslararası: 905321234567
  if (t.startsWith("0")) return "90" + t.slice(1); // 05321234567 -> 905321234567
  if (t.length === 10) return "90" + t; // 5321234567 -> 905321234567
  return t;
}

const VARSAYILAN_SABLON =
  "Sayın {veli}, {ogrenci} adlı öğrencimizin {tarih} tarihli yurt yoklama durumu: {durum}. Bilginize sunarız. Yavuztürk Süleymaniye Yurdu";

export default function MesajIstemci() {
  const [gruplar, setGruplar] = useState([]);
  const [grupId, setGrupId] = useState(null);
  const [tarih, setTarih] = useState(bugun());
  const [durumFiltre, setDurumFiltre] = useState("izinsiz");
  const [sablon, setSablon] = useState(VARSAYILAN_SABLON);
  const [ogrenciler, setOgrenciler] = useState([]);
  const [kayitMap, setKayitMap] = useState({});
  const [yukleniyor, setYukleniyor] = useState(true);

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
    fetch(`/api/yoklama?grup_id=${grupId}&tarih=${tarih}`)
      .then((r) => r.json())
      .then((d) => {
        setOgrenciler(d.ogrenciler || []);
        const map = {};
        (d.kayitlar || []).forEach((k) => (map[k.ogrenci_id] = k));
        setKayitMap(map);
        setYukleniyor(false);
      });
  }, [grupId, tarih]);

  useEffect(() => getir(), [getir]);

  const seciliGrup = gruplar.find((g) => g.id === grupId);
  const grupKapali = seciliGrup && seciliGrup.veli_bilgilendirme_aktif === false;

  const durumEtiket = { geldi: "Geldi", izinli: "İzinli", izinsiz: "İzinsiz" };

  const hedefListe = ogrenciler
    .filter((o) => o.veli_telefon)
    .map((o) => ({ ogrenci: o, kayit: kayitMap[o.id] }))
    .filter(({ kayit }) => {
      if (durumFiltre === "hepsi") return true;
      return kayit?.durum === durumFiltre;
    });

  function mesajUret(ogrenci, kayit) {
    return sablon
      .replaceAll("{veli}", ogrenci.veli_adi || "Veli")
      .replaceAll("{ogrenci}", ogrenci.ad_soyad)
      .replaceAll("{tarih}", tarih.split("-").reverse().join("."))
      .replaceAll("{durum}", kayit ? durumEtiket[kayit.durum] : "İşaretlenmedi");
  }

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Veli Bilgilendirme</h1>
      </div>
      <p className="sayfa-alt">
        Her veli için hazır mesajla WhatsApp'ı açan bir bağlantı üretir; gönder'e siz basarsınız. Tamamen otomatik
        toplu gönderim için WhatsApp Business API başvurusu gerekir (Yönetim sayfasında not var).
      </p>

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
                  <select className="girdi" value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)}>
                    <option value="izinsiz">Sadece izinsiz olanlar</option>
                    <option value="izinli">Sadece izinli olanlar</option>
                    <option value="geldi">Sadece gelenler</option>
                    <option value="hepsi">Bugün işaretlenen herkes</option>
                  </select>
                </div>
              </div>
              <label className="etiket">Mesaj şablonu</label>
              <textarea className="girdi" rows={3} value={sablon} onChange={(e) => setSablon(e.target.value)} />
              <div style={{ fontSize: 12.5, color: "var(--metin-soluk)", marginTop: 6 }}>
                Kullanabileceğiniz alanlar: {"{veli}"}, {"{ogrenci}"}, {"{tarih}"}, {"{durum}"}
              </div>
            </div>
          </div>

          <div className="kart">
            <div className="kart-ic">
              {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
              {!yukleniyor && hedefListe.length === 0 && (
                <div className="bos-durum">Bu filtreye uyan, telefonu kayıtlı öğrenci yok.</div>
              )}
              {!yukleniyor &&
                hedefListe.map(({ ogrenci, kayit }) => {
                  const numara = whatsappNumarasi(ogrenci.veli_telefon);
                  const metin = mesajUret(ogrenci, kayit);
                  const link = numara ? `https://wa.me/${numara}?text=${encodeURIComponent(metin)}` : null;
                  return (
                    <div className="ogrenci-satir" key={ogrenci.id}>
                      <div>
                        <div className="ogrenci-ad">{ogrenci.ad_soyad}</div>
                        <div className="ogrenci-detay">
                          {ogrenci.veli_adi || "Veli"} · {ogrenci.veli_telefon}
                        </div>
                      </div>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-yesil btn-sm">
                        WhatsApp'ta gönder
                      </a>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
