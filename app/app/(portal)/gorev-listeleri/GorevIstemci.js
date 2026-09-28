"use client";
import { useEffect, useState, useCallback } from "react";
import { sirdakiOge, bugunISO, tarihEkle } from "../../../lib/rotasyon";

const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function tarihEtiket(iso, bugun) {
  if (iso === bugun) return "Bugün";
  if (iso === tarihEkle(bugun, 1)) return "Yarın";
  const d = new Date(iso + "T00:00:00");
  return `${GUN_KISA[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GorevIstemci({ isAdmin, baslangicListeler }) {
  const [listeler, setListeler] = useState(baslangicListeler || []);
  const [tarih, setTarih] = useState(bugunISO());
  const [yonetimAcik, setYonetimAcik] = useState(false);

  const listeleriGetir = useCallback(() => {
    fetch("/api/gorev-listeleri")
      .then((r) => r.json())
      .then((d) => setListeler(d.listeler || []));
  }, []);

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Görev Listeleri</h1>
        {isAdmin && (
          <button className="btn btn-hayalet btn-sm" onClick={() => setYonetimAcik((a) => !a)}>
            {yonetimAcik ? "Yönetimi kapat" : "Liste / kişi / grup yönetimi"}
          </button>
        )}
      </div>
      <p className="sayfa-alt">
        Yemekçilik, müezzinlik, nöbetçi, çaycı — kimin sırada olduğunu otomatik gösterir, elle işaretlemeye gerek yok.
      </p>

      <div style={{ marginBottom: 18 }}>
        <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Tarih</label>
        <input type="date" className="girdi" style={{ width: 170 }} value={tarih} onChange={(e) => setTarih(e.target.value)} />
      </div>

      {isAdmin && yonetimAcik && <YonetimPaneli listeler={listeler} onDegisti={listeleriGetir} />}

      {listeler.length === 0 && <div className="bos-durum">Henüz bir görev listesi yok.</div>}

      <div className="modul-izgara">
        {listeler.map((l) => (
          <VazifeKarti key={l.id} liste={l} tarih={tarih} />
        ))}
      </div>
    </>
  );
}

/* ================= VAZİFE KARTI (bugün/seçili tarihte kim sırada) ================= */
function VazifeKarti({ liste, tarih }) {
  const [kisiler, setKisiler] = useState([]);
  const [gruplar, setGruplar] = useState([]);
  const [kategoriler, setKategoriler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    setYukleniyor(true);
    Promise.all([
      fetch(`/api/gorev-kisileri?liste_id=${liste.id}`).then((r) => r.json()),
      fetch(`/api/gorev-gruplari?liste_id=${liste.id}`).then((r) => r.json()),
      fetch(`/api/gorev-kategorileri?liste_id=${liste.id}`).then((r) => r.json()),
    ]).then(([kd, gd, ktd]) => {
      setKisiler(kd.kisiler || []);
      setGruplar(gd.gruplar || []);
      setKategoriler(ktd.kategoriler || []);
      setYukleniyor(false);
    });
  }, [liste.id]);

  const birimler =
    gruplar.length > 0
      ? gruplar.map((g) => ({ id: g.id, isim: g.isim, uyeler: kisiler.filter((k) => k.grup_id === g.id) }))
      : kisiler.map((k) => ({ id: k.id, isim: k.ad_soyad, uyeler: [k] }));

  const bugunVazifeli = liste.rotasyonlu ? sirdakiOge(birimler, liste.rotasyon_baslangic, tarih) : null;

  const yaklasanlar = [];
  if (liste.rotasyonlu && birimler.length) {
    for (let i = 1; i <= 4; i++) {
      const g = tarihEkle(tarih, i);
      const birim = sirdakiOge(birimler, liste.rotasyon_baslangic, g);
      yaklasanlar.push({ tarih: g, isim: birim?.isim || "—" });
    }
  }

  return (
    <div className="kart vazife-kart">
      <div className="kart-ic">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ fontSize: 15, margin: 0, color: "var(--baslik)" }}>{liste.isim}</h3>
          {kategoriler.length > 0 && (
            <span className="rozet rozet-gri" style={{ fontSize: 10.5 }}>
              {kategoriler.map((k) => k.isim).join(" · ")}
            </span>
          )}
        </div>

        {yukleniyor && <div className="bos-durum" style={{ padding: "14px 0" }}>Yükleniyor...</div>}

        {!yukleniyor && !liste.rotasyonlu && (
          <div className="bos-durum" style={{ padding: "10px 0", fontSize: 13 }}>
            Otomatik sıra kapalı. Açmak için Yönetim'den bu listeyi düzenleyin.
          </div>
        )}

        {!yukleniyor && liste.rotasyonlu && birimler.length === 0 && (
          <div className="bos-durum" style={{ padding: "10px 0", fontSize: 13 }}>Bu listede henüz kişi yok.</div>
        )}

        {!yukleniyor && liste.rotasyonlu && birimler.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, color: "var(--metin-soluk)", marginBottom: 2 }}>
              {tarihEtiket(tarih, bugunISO())} sırada
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--baslik)", marginBottom: bugunVazifeli?.uyeler?.length > 1 ? 6 : 12 }}>
              {bugunVazifeli?.isim || "—"}
            </div>
            {bugunVazifeli?.uyeler?.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {bugunVazifeli.uyeler.map((u) => (
                  <span key={u.id} className="rozet rozet-gri" style={{ fontWeight: 600 }}>
                    {u.ad_soyad}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {yaklasanlar.map((y) => (
                <div key={y.tarih} className="yaklasan-rozet">
                  <div className="yaklasan-gun">{tarihEtiket(y.tarih, bugunISO())}</div>
                  <div className="yaklasan-isim">{y.isim}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= YÖNETİM PANELİ (admin) ================= */
function YonetimPaneli({ listeler, onDegisti }) {
  const [listeId, setListeId] = useState(listeler?.[0]?.id || null);
  const [kisiler, setKisiler] = useState([]);
  const [gruplar, setGruplar] = useState([]);
  const [kategoriler, setKategoriler] = useState([]);
  const [yeniKisi, setYeniKisi] = useState("");
  const [yeniKisiGrup, setYeniKisiGrup] = useState("");
  const [yeniGrupAdi, setYeniGrupAdi] = useState("");
  const [yeniKategoriAdi, setYeniKategoriAdi] = useState("");
  const [yeniListeAdi, setYeniListeAdi] = useState("");
  const [ekleniyor, setEkleniyor] = useState(false);
  const [bugunAyarTarihi, setBugunAyarTarihi] = useState(bugunISO());
  const [bugunAyarBirim, setBugunAyarBirim] = useState("");

  const seciliListe = listeler.find((l) => l.id === listeId);

  const birimlerYonetim =
    gruplar.length > 0
      ? gruplar.map((g) => ({ id: g.id, isim: g.isim }))
      : kisiler.map((k) => ({ id: k.id, isim: k.ad_soyad }));

  const getir = useCallback(() => {
    if (!listeId) return;
    fetch(`/api/gorev-kisileri?liste_id=${listeId}`)
      .then((r) => r.json())
      .then((d) => setKisiler(d.kisiler || []));
    fetch(`/api/gorev-gruplari?liste_id=${listeId}`)
      .then((r) => r.json())
      .then((d) => setGruplar(d.gruplar || []));
    fetch(`/api/gorev-kategorileri?liste_id=${listeId}`)
      .then((r) => r.json())
      .then((d) => setKategoriler(d.kategoriler || []));
  }, [listeId]);

  useEffect(() => getir(), [getir]);
  useEffect(() => {
    if (!listeId && listeler.length) setListeId(listeler[0].id);
  }, [listeler, listeId]);
  useEffect(() => {
    setBugunAyarBirim("");
    setBugunAyarTarihi(bugunISO());
  }, [listeId]);

  async function kisiEkle(e) {
    e.preventDefault();
    if (!yeniKisi.trim() || !listeId) return;
    setEkleniyor(true);
    await fetch("/api/gorev-kisileri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liste_id: listeId, ad_soyad: yeniKisi, sira: kisiler.length + 1, grup_id: yeniKisiGrup || null }),
    });
    setYeniKisi("");
    setEkleniyor(false);
    getir();
  }

  async function kisiGrubunuDegistir(kisiId, grupId) {
    await fetch(`/api/gorev-kisileri/${kisiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grup_id: grupId || null }),
    });
    getir();
  }

  async function kisiSil(id) {
    if (!confirm("Bu kişiyi listeden kaldırmak istediğinize emin misiniz?")) return;
    await fetch(`/api/gorev-kisileri/${id}`, { method: "DELETE" });
    getir();
  }

  async function grupEkle(e) {
    e.preventDefault();
    if (!yeniGrupAdi.trim() || !listeId) return;
    setEkleniyor(true);
    await fetch("/api/gorev-gruplari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liste_id: listeId, isim: yeniGrupAdi, siralama: gruplar.length + 1 }),
    });
    setYeniGrupAdi("");
    setEkleniyor(false);
    getir();
  }

  async function grupSil(id) {
    if (!confirm("Bu grubu silmek istediğinize emin misiniz? İçindeki kişiler grupsuz kalır, silinmez.")) return;
    await fetch(`/api/gorev-gruplari/${id}`, { method: "DELETE" });
    getir();
  }

  async function kategoriEkle(e) {
    e.preventDefault();
    if (!yeniKategoriAdi.trim() || !listeId) return;
    setEkleniyor(true);
    await fetch("/api/gorev-kategorileri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liste_id: listeId, isim: yeniKategoriAdi, siralama: kategoriler.length + 1 }),
    });
    setYeniKategoriAdi("");
    setEkleniyor(false);
    getir();
  }

  async function kategoriSil(id) {
    if (!confirm("Bu etiketi silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/gorev-kategorileri/${id}`, { method: "DELETE" });
    getir();
  }

  async function listeEkle(e) {
    e.preventDefault();
    if (!yeniListeAdi.trim()) return;
    setEkleniyor(true);
    await fetch("/api/gorev-listeleri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isim: yeniListeAdi, siralama: listeler.length + 1 }),
    });
    setYeniListeAdi("");
    setEkleniyor(false);
    onDegisti();
  }

  async function listeAyariGuncelle(alanlar) {
    if (!seciliListe) return;
    await fetch(`/api/gorev-listeleri/${seciliListe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alanlar),
    });
    onDegisti();
  }

  async function bugunSirayiAta() {
    if (!seciliListe || bugunAyarBirim === "") return;
    const index = parseInt(bugunAyarBirim, 10);
    // rotasyon_baslangic'i, seçilen tarihte tam olarak seçilen birime denk
    // gelecek şekilde geriye sarıyoruz (sirdakiOge bu tarihten itibaren gün
    // farkına göre sırayı hesaplıyor) — sonraki günler otomatik sırayla devam eder.
    const yeniBaslangic = tarihEkle(bugunAyarTarihi, -index);
    await listeAyariGuncelle({ rotasyon_baslangic: yeniBaslangic });
    setBugunAyarBirim("");
  }

  return (
    <div className="kart" style={{ marginBottom: 20 }}>
      <div className="kart-ic">
        <label className="etiket" style={{ marginBottom: 6, display: "block" }}>Düzenlenecek liste</label>
        <div className="grup-sekme" style={{ marginBottom: 18 }}>
          {listeler.map((l) => (
            <button key={l.id} className={listeId === l.id ? "aktif" : ""} onClick={() => setListeId(l.id)}>
              {l.isim}
            </button>
          ))}
        </div>

        <div className="gorev-yonetim-izgara">
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>"{seciliListe?.isim}" kişileri (sıralı)</h3>
            {kisiler.length === 0 && <div className="bos-durum" style={{ padding: "20px 0" }}>Henüz kişi yok.</div>}
            {kisiler.map((k, i) => (
              <div className="ogrenci-satir" key={k.id}>
                <div className="ogrenci-ad">
                  {i + 1}. {k.ad_soyad}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {gruplar.length > 0 && (
                    <select className="girdi" style={{ width: 140 }} value={k.grup_id || ""} onChange={(e) => kisiGrubunuDegistir(k.id, e.target.value)}>
                      <option value="">Grupsuz</option>
                      {gruplar.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.isim}
                        </option>
                      ))}
                    </select>
                  )}
                  <button className="btn btn-tehlike btn-sm" onClick={() => kisiSil(k.id)}>
                    Kaldır
                  </button>
                </div>
              </div>
            ))}
            <form onSubmit={kisiEkle} style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <input className="girdi" placeholder="Ad Soyad" value={yeniKisi} onChange={(e) => setYeniKisi(e.target.value)} />
              {gruplar.length > 0 && (
                <select className="girdi" style={{ width: 140 }} value={yeniKisiGrup} onChange={(e) => setYeniKisiGrup(e.target.value)}>
                  <option value="">Grupsuz</option>
                  {gruplar.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.isim}
                    </option>
                  ))}
                </select>
              )}
              <button className="btn btn-lacivert" disabled={ekleniyor}>
                Ekle
              </button>
            </form>
            <p style={{ fontSize: 12, color: "var(--metin-soluk)", marginTop: 10 }}>
              Sıralama, kimin hangi gün sırada olduğunu belirler — kişileri eklerken sıraya dikkat edin.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Grupları (opsiyonel)</h3>
            <p style={{ fontSize: 12.5, color: "var(--metin-soluk)", marginTop: -6, marginBottom: 12 }}>
              Grup açarsanız (örn. "1. Grup", "2. Grup") sıra kişi kişi değil grup grup döner — o gün sıradaki grubun tüm üyeleri gösterilir.
            </p>
            {gruplar.length === 0 && <div className="bos-durum" style={{ padding: "12px 0" }}>Henüz grup yok, sıra kişi kişi döner.</div>}
            {gruplar.map((g) => (
              <div className="ogrenci-satir" key={g.id}>
                <div className="ogrenci-ad">{g.isim}</div>
                <button className="btn btn-tehlike btn-sm" onClick={() => grupSil(g.id)}>
                  Sil
                </button>
              </div>
            ))}
            <form onSubmit={grupEkle} style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input className="girdi" placeholder="Örn. 1. Grup" value={yeniGrupAdi} onChange={(e) => setYeniGrupAdi(e.target.value)} />
              <button className="btn btn-lacivert" disabled={ekleniyor}>
                Ekle
              </button>
            </form>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Etiketler (opsiyonel)</h3>
              <p style={{ fontSize: 12.5, color: "var(--metin-soluk)", marginBottom: 10 }}>
                Kartın altında bilgi amaçlı görünür — örn. Müezzinlik için 5 vakit, Yemekçilik için Kahvaltı/Öğle/Akşam.
              </p>
              {kategoriler.length === 0 && <div className="bos-durum" style={{ padding: "8px 0", fontSize: 13 }}>Henüz etiket yok.</div>}
              {kategoriler.map((k) => (
                <div className="ogrenci-satir" key={k.id}>
                  <div className="ogrenci-ad">{k.isim}</div>
                  <button className="btn btn-tehlike btn-sm" onClick={() => kategoriSil(k.id)}>
                    Sil
                  </button>
                </div>
              ))}
              <form onSubmit={kategoriEkle} style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input className="girdi" placeholder="Örn. Ara Öğün" value={yeniKategoriAdi} onChange={(e) => setYeniKategoriAdi(e.target.value)} />
                <button className="btn btn-lacivert btn-sm" disabled={ekleniyor}>
                  Ekle
                </button>
              </form>
            </div>

            {seciliListe && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <button className="btn btn-hayalet btn-sm" onClick={() => listeAyariGuncelle({ rotasyonlu: !seciliListe.rotasyonlu })}>
                  {seciliListe.rotasyonlu ? "Otomatik sıra: Açık — kapat" : "Otomatik sıra: Kapalı — aç"}
                </button>
                {seciliListe.rotasyonlu && birimlerYonetim.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <label className="etiket" style={{ marginBottom: 6, display: "block" }}>
                      Bugün (ya da seçtiğiniz tarihte) kimin sırası — elle ayarla
                    </label>
                    <p style={{ fontSize: 12, color: "var(--metin-soluk)", marginTop: -2, marginBottom: 10 }}>
                      Sistem daha başlamadıysa ya da sıra kaymışsa, o tarihte kimin/hangi grubun sırada olduğunu buradan
                      seçin — sonraki günler oradan itibaren otomatik sırayla devam eder.
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        type="date"
                        className="girdi"
                        style={{ width: 150 }}
                        value={bugunAyarTarihi}
                        onChange={(e) => setBugunAyarTarihi(e.target.value)}
                      />
                      <select
                        className="girdi"
                        style={{ width: 180 }}
                        value={bugunAyarBirim}
                        onChange={(e) => setBugunAyarBirim(e.target.value)}
                      >
                        <option value="">Kişi / grup seçin...</option>
                        {birimlerYonetim.map((b, i) => (
                          <option key={b.id} value={i}>
                            {b.isim}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-lacivert btn-sm" disabled={bugunAyarBirim === ""} onClick={bugunSirayiAta}>
                        Bu tarihte bunu ata
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Yeni liste oluştur</h3>
            <form onSubmit={listeEkle} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="girdi" placeholder="Örn. Temizlik" value={yeniListeAdi} onChange={(e) => setYeniListeAdi(e.target.value)} />
              <button className="btn btn-hayalet" disabled={ekleniyor}>
                Liste oluştur
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
