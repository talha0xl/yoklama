"use client";
import { useEffect, useState, useCallback } from "react";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function ayBasi() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
}

export default function IstatistikIstemci() {
  const [gruplar, setGruplar] = useState([]);
  const [grupId, setGrupId] = useState(null);
  const [baslangic, setBaslangic] = useState(ayBasi());
  const [bitis, setBitis] = useState(bugun());
  const [sonuc, setSonuc] = useState([]);
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
    fetch(`/api/istatistik?grup_id=${grupId}&baslangic=${baslangic}&bitis=${bitis}`)
      .then((r) => r.json())
      .then((d) => {
        setSonuc(d.sonuc || []);
        setYukleniyor(false);
      });
  }, [grupId, baslangic, bitis]);

  useEffect(() => getir(), [getir]);

  const genelToplam = sonuc.reduce((a, s) => a + s.toplam, 0);
  const genelGeldi = sonuc.reduce((a, s) => a + s.geldi, 0);
  const genelOran = genelToplam ? Math.round((genelGeldi / genelToplam) * 100) : null;

  return (
    <>
      <div className="sayfa-baslik">
        <h1>İstatistik</h1>
      </div>
      <p className="sayfa-alt">Seçtiğiniz tarih aralığında grup devam durumu.</p>

      <div className="grup-sekme">
        {gruplar.map((g) => (
          <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
            {g.isim}
          </button>
        ))}
      </div>

      <div className="kart" style={{ marginBottom: 20 }}>
        <div className="kart-ic" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="etiket">Başlangıç</label>
            <input type="date" className="girdi" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
          </div>
          <div>
            <label className="etiket">Bitiş</label>
            <input type="date" className="girdi" value={bitis} max={bugun()} onChange={(e) => setBitis(e.target.value)} />
          </div>
          {genelOran !== null && (
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 13, color: "var(--metin-soluk)" }}>Genel devam oranı</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--lacivert)" }}>%{genelOran}</div>
            </div>
          )}
        </div>
      </div>

      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && sonuc.length === 0 && <div className="bos-durum">Bu grupta öğrenci yok.</div>}
          {!yukleniyor && sonuc.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Geldi</th>
                  <th>İzinli</th>
                  <th>İzinsiz</th>
                  <th style={{ width: 160 }}>Devam oranı</th>
                </tr>
              </thead>
              <tbody>
                {sonuc.map((s) => (
                  <tr key={s.ogrenci.id}>
                    <td style={{ fontWeight: 600 }}>{s.ogrenci.ad_soyad}</td>
                    <td>{s.geldi}</td>
                    <td>{s.izinli}</td>
                    <td>{s.izinsiz}</td>
                    <td>
                      {s.oran === null ? (
                        <span style={{ color: "var(--metin-soluk)" }}>Kayıt yok</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="istatistik-cubuk-sarma" style={{ flex: 1 }}>
                            <div className="istatistik-cubuk" style={{ width: `${s.oran}%` }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, width: 34 }}>%{s.oran}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
