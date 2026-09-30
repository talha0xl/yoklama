"use client";
import { useEffect, useState, useCallback, Fragment } from "react";

function bugun() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function ayBasi() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
}

const KAYNAKLAR = [
  { anahtar: "yoklama", isim: "Yoklama" },
  { anahtar: "namaz", isim: "Namaz Yoklama" },
  { anahtar: "gorev", isim: "Görev Listeleri" },
];

const VAKIT_ETIKET = { sabah: "Sabah", ogle: "Öğle", ikindi: "İkindi", aksam: "Akşam", yatsi: "Yatsı" };

// Grup seçicide "Tümü" seçildiğinde gerçek bir grup id'si değil bu sabit
// kullanılır; API'ye gönderilirken grup_id parametresi hiç eklenmez, böylece
// sunucu tüm öğrencileri (grup grup sıralı) döner.
const TUMU = "__tumu__";

function tarihFormatla(t) {
  if (!t) return "";
  const [yil, ay, gun] = t.split("-");
  return `${gun}.${ay}.${yil}`;
}

export default function IstatistikIstemci({ baslangicGruplar, baslangicTurler, baslangicListeler }) {
  const [kaynak, setKaynak] = useState("yoklama");

  const [turler] = useState(baslangicTurler || []);
  const [turId, setTurId] = useState(baslangicTurler?.[0]?.id || null);

  const [gruplar] = useState(baslangicGruplar || []);
  const [grupId, setGrupId] = useState(baslangicGruplar?.[0]?.id || null);

  const [listeler] = useState(baslangicListeler || []);
  const [listeId, setListeId] = useState(baslangicListeler?.[0]?.id || null);

  const [baslangic, setBaslangic] = useState(ayBasi());
  const [bitis, setBitis] = useState(bugun());
  const [sonuc, setSonuc] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kisiAra, setKisiAra] = useState("");
  const [karneIndiriliyor, setKarneIndiriliyor] = useState(false);
  const [acikOgrenciId, setAcikOgrenciId] = useState(null);
  const [mektupIndiriliyor, setMektupIndiriliyor] = useState(false);
  const [mektupHata, setMektupHata] = useState("");

  const getir = useCallback(() => {
    if (kaynak === "gorev") {
      if (!listeId) return;
      setYukleniyor(true);
      const params = new URLSearchParams({ kaynak, liste_id: listeId, baslangic, bitis });
      fetch(`/api/istatistik?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          setSonuc(d.sonuc || []);
          setYukleniyor(false);
        });
      return;
    }
    if (!grupId) return;
    if (kaynak === "yoklama" && !turId) return;
    setYukleniyor(true);
    const params = new URLSearchParams({ kaynak, baslangic, bitis });
    if (grupId !== TUMU) params.set("grup_id", grupId);
    if (kaynak === "yoklama") params.set("tur_id", turId);
    fetch(`/api/istatistik?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setSonuc(d.sonuc || []);
        setYukleniyor(false);
      });
  }, [kaynak, grupId, turId, listeId, baslangic, bitis]);

  useEffect(() => getir(), [getir]);
  useEffect(() => setAcikOgrenciId(null), [kaynak, grupId, turId, listeId]);

  const genelPayda = sonuc.reduce((a, s) => a + (s.payda ?? s.toplam), 0);
  const genelBasari = sonuc.reduce((a, s) => a + (s.basari ?? s.geldi), 0);
  const genelOran = genelPayda ? Math.round((genelBasari / genelPayda) * 100) : null;

  // sutunlar: tablodaki her ek sütunun başlığı ve o satırdaki hangi alandan
  // okunacağı. "Kişi/Öğrenci" ve oran sütunu ayrıca, sabit olarak eklenir.
  const basliklar =
    kaynak === "namaz"
      ? {
          sutunlar: [
            { baslik: "Kıldı", alan: "geldi" },
            { baslik: "Geç Kıldı", alan: "gecKildi" },
            { baslik: "İzinli", alan: "izinli" },
            { baslik: "Kılmadı", alan: "izinsiz" },
          ],
          oranEtiket: "Kılma oranı",
        }
      : kaynak === "gorev"
      ? { sutunlar: [{ baslik: "Vazifeli olduğu gün", alan: "geldi" }], oranEtiket: "Aralığın yüzdesi" }
      : {
          sutunlar: [
            { baslik: "Geldi", alan: "geldi" },
            { baslik: "İzinli", alan: "izinli" },
            { baslik: "İzinsiz", alan: "izinsiz" },
          ],
          oranEtiket: "Devam oranı",
        };

  const gosterilenSonuc = kisiAra.trim()
    ? sonuc.filter((s) => s.ogrenci.ad_soyad.toLocaleLowerCase("tr").includes(kisiAra.trim().toLocaleLowerCase("tr")))
    : sonuc;

  async function karneIndir() {
    setKarneIndiriliyor(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const baslikMetni =
        kaynak === "gorev"
          ? listeler.find((l) => l.id === listeId)?.isim || "Görev"
          : grupId === TUMU
          ? "Tüm Öğrenciler"
          : gruplar.find((g) => g.id === grupId)?.isim || "Grup";
      const ws = wb.addWorksheet(baslikMetni.slice(0, 30) || "Karne");

      ws.addRow([`${baslikMetni} — ${basliklar.oranEtiket} Karnesi`]);
      ws.getRow(1).font = { bold: true, size: 14 };
      ws.addRow([`Tarih aralığı: ${baslangic} — ${bitis}`]);
      ws.getRow(2).font = { italic: true, color: { argb: "FF666666" } };
      ws.addRow([]);

      const basHucre = [kaynak === "gorev" ? "Kişi" : "Öğrenci", ...basliklar.sutunlar.map((su) => su.baslik), basliklar.oranEtiket];
      const basSatir = ws.addRow(basHucre);
      basSatir.font = { bold: true, color: { argb: "FFFFFFFF" } };
      basSatir.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B2A4A" } };
        c.alignment = { horizontal: "center" };
      });

      gosterilenSonuc.forEach((s) => {
        const satir = [s.ogrenci.ad_soyad, ...basliklar.sutunlar.map((su) => s[su.alan] ?? 0), s.oran === null ? "Kayıt yok" : `%${s.oran}`];
        ws.addRow(satir);
      });

      ws.columns.forEach((col, i) => {
        col.width = i === 0 ? 26 : 16;
      });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `karne-${baslikMetni}-${baslangic}-${bitis}.xlsx`.replace(/\s+/g, "-");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setKarneIndiriliyor(false);
    }
  }

  async function veliMektubuIndir() {
    setMektupHata("");
    setMektupIndiriliyor(true);
    try {
      const params = new URLSearchParams({ kaynak, baslangic, bitis });
      if (grupId && grupId !== TUMU) params.set("grup_id", grupId);
      if (kaynak === "yoklama" && turId) params.set("tur_id", turId);
      const res = await fetch(`/api/istatistik/pdf?${params.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Mektup oluşturulamadı.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baslikMetni = grupId === TUMU ? "Tum-Ogrenciler" : gruplar.find((g) => g.id === grupId)?.isim || "Tum-Ogrenciler";
      a.href = url;
      a.download = `veli-mektubu-${baslikMetni}-${baslangic}-${bitis}.pdf`.replace(/\s+/g, "-");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMektupHata(err.message);
    } finally {
      setMektupIndiriliyor(false);
    }
  }

  return (
    <>
      <div className="sayfa-baslik">
        <h1>İstatistik</h1>
      </div>
      <p className="sayfa-alt">Neyin istatistiğini görmek istediğinizi seçin, sonra tarih aralığını daraltın.</p>

      <div className="grup-sekme">
        {KAYNAKLAR.map((k) => (
          <button key={k.anahtar} className={kaynak === k.anahtar ? "aktif" : ""} onClick={() => setKaynak(k.anahtar)}>
            {k.isim}
          </button>
        ))}
      </div>

      {kaynak === "yoklama" && turler.length > 1 && (
        <>
          <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Yoklama türü</label>
          <div className="grup-sekme">
            {turler.map((t) => (
              <button key={t.id} className={turId === t.id ? "aktif" : ""} onClick={() => setTurId(t.id)}>
                {t.isim}
              </button>
            ))}
          </div>
        </>
      )}

      {kaynak === "gorev" ? (
        <>
          <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Hangi görev listesi</label>
          <div className="grup-sekme">
            {listeler.map((l) => (
              <button key={l.id} className={listeId === l.id ? "aktif" : ""} onClick={() => setListeId(l.id)}>
                {l.isim}
              </button>
            ))}
            {listeler.length === 0 && <span className="bos-durum">Henüz görev listesi yok.</span>}
          </div>
        </>
      ) : (
        <>
          <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Grup</label>
          <div className="grup-sekme">
            <button className={grupId === TUMU ? "aktif" : ""} onClick={() => setGrupId(TUMU)}>
              Tümü
            </button>
            {gruplar.map((g) => (
              <button key={g.id} className={grupId === g.id ? "aktif" : ""} onClick={() => setGrupId(g.id)}>
                {g.isim}
              </button>
            ))}
          </div>
        </>
      )}

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
              <div style={{ fontSize: 13, color: "var(--metin-soluk)" }}>Genel {basliklar.oranEtiket.toLocaleLowerCase("tr")}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--baslik)" }}>%{genelOran}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {sonuc.length > 3 && (
          <input
            className="girdi"
            style={{ maxWidth: 280 }}
            placeholder="Kişi ara..."
            value={kisiAra}
            onChange={(e) => setKisiAra(e.target.value)}
          />
        )}
        {gosterilenSonuc.length > 0 && (
          <button className="btn btn-hayalet" onClick={karneIndir} disabled={karneIndiriliyor} style={{ marginLeft: "auto" }}>
            {karneIndiriliyor ? "Hazırlanıyor..." : "📊 Karneyi Excel indir"}
          </button>
        )}
        {kaynak !== "gorev" && gosterilenSonuc.length > 0 && (
          <button className="btn btn-hayalet" onClick={veliMektubuIndir} disabled={mektupIndiriliyor}>
            {mektupIndiriliyor ? "Hazırlanıyor..." : "📄 Veli Mektubu (PDF)"}
          </button>
        )}
      </div>
      {mektupHata && <div className="hata" style={{ marginBottom: 14 }}>{mektupHata}</div>}

      <div className="kart">
        <div className="kart-ic">
          {yukleniyor && <div className="bos-durum">Yükleniyor...</div>}
          {!yukleniyor && sonuc.length === 0 && (
            <div className="bos-durum">{kaynak === "gorev" ? "Bu listede kişi yok." : "Bu grupta öğrenci yok."}</div>
          )}
          {!yukleniyor && sonuc.length > 0 && gosterilenSonuc.length === 0 && (
            <div className="bos-durum">"{kisiAra}" ile eşleşen kimse yok.</div>
          )}
          {!yukleniyor && gosterilenSonuc.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>{kaynak === "gorev" ? "Kişi" : "Öğrenci"}</th>
                  {basliklar.sutunlar.map((su) => (
                    <th key={su.alan}>{su.baslik}</th>
                  ))}
                  <th style={{ width: 160 }}>{basliklar.oranEtiket}</th>
                </tr>
              </thead>
              <tbody>
                {gosterilenSonuc.map((s) => {
                  const tiklanabilir = kaynak !== "gorev";
                  const acik = acikOgrenciId === s.ogrenci.id;
                  return (
                    <Fragment key={s.ogrenci.id}>
                      <tr
                        style={tiklanabilir ? { cursor: "pointer" } : undefined}
                        onClick={() => tiklanabilir && setAcikOgrenciId(acik ? null : s.ogrenci.id)}
                        title={tiklanabilir ? "İzinli tarih ve sebeplerini görmek için tıklayın" : undefined}
                      >
                        <td style={{ fontWeight: 600 }}>
                          {s.ogrenci.ad_soyad}
                          {tiklanabilir && s.izinKayitlari?.length > 0 && (
                            <span className="rozet rozet-gri" style={{ marginLeft: 8, fontWeight: 600 }}>
                              {s.izinKayitlari.length} izin
                            </span>
                          )}
                        </td>
                        {basliklar.sutunlar.map((su) => (
                          <td key={su.alan}>{s[su.alan]}</td>
                        ))}
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
                      {acik && (
                        <tr>
                          <td colSpan={2 + basliklar.sutunlar.length} style={{ background: "var(--gri-acik)" }}>
                            {s.izinKayitlari?.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 4px" }}>
                                {s.izinKayitlari.map((iz, i) => (
                                  <div key={i} style={{ fontSize: 13.5, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <strong style={{ minWidth: 90 }}>{tarihFormatla(iz.tarih)}</strong>
                                    {iz.vakit && <span style={{ color: "var(--metin-soluk)" }}>{VAKIT_ETIKET[iz.vakit] || iz.vakit}</span>}
                                    <span>{iz.sebep ? iz.sebep : <span style={{ color: "var(--metin-soluk)" }}>Sebep belirtilmemiş</span>}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: 13.5, color: "var(--metin-soluk)", padding: "6px 4px" }}>
                                Bu tarih aralığında izinli kaydı yok.
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
