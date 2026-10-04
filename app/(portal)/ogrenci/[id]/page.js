import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifySession } from "../../../../lib/session";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { modulErisimVarMi } from "../../../../lib/moduller";
import { sunucuTarihiISO } from "../../../../lib/zaman";

export const dynamic = "force-dynamic";

const GUN_SAYISI = 30;
const DURUM_ETIKET = { geldi: "Geldi", izinli: "İzinli", izinsiz: "İzinsiz" };
const DURUM_ROZET = { geldi: "rozet-yesil", izinli: "rozet-amber", izinsiz: "rozet-kirmizi" };
const NAMAZ_ETIKET = { kildi: "Kıldı", gec_kildi: "Geç kıldı", izinli: "İzinli", kilmadi: "Kılmadı" };
const NAMAZ_ROZET = { kildi: "rozet-yesil", gec_kildi: "rozet-mavi", izinli: "rozet-amber", kilmadi: "rozet-kirmizi" };
const VAKIT_ETIKET = { sabah: "Sabah", ogle: "Öğle", ikindi: "İkindi", aksam: "Akşam", yatsi: "Yatsı" };

function tarihKisa(iso) {
  if (!iso) return "";
  const [y, a, g] = iso.split("-");
  return `${g}.${a}.${y}`;
}

// 'YYYY-MM-DD' tarihinden n gün öncesi (takvim günü olarak, saat dilimi kaymasız).
function gunOncesi(iso, n) {
  const [y, a, g] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, a - 1, g));
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function haritaLinki(adres) {
  if (!adres || !adres.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres.trim())}`;
}

// Yakınlar tablosu boşsa eski anne/baba/diğer/veli alanlarına geri düş.
function yakinlariTopla(o, yakinlar) {
  if (yakinlar && yakinlar.length) return [...yakinlar].sort((a, b) => a.siralama - b.siralama);
  const eski = [];
  if (o.anne_adi || o.anne_telefon) eski.push({ id: "anne", yakinlik: "Anne", ad_soyad: o.anne_adi, telefon: o.anne_telefon, meslek: o.anne_meslek });
  if (o.baba_adi || o.baba_telefon) eski.push({ id: "baba", yakinlik: "Baba", ad_soyad: o.baba_adi, telefon: o.baba_telefon, meslek: o.baba_meslek });
  if (o.diger_yakin_adi || o.diger_yakin_telefon)
    eski.push({ id: "diger", yakinlik: o.diger_yakin_yakinlik || "Diğer", ad_soyad: o.diger_yakin_adi, telefon: o.diger_yakin_telefon });
  if (!eski.length && (o.veli_adi || o.veli_telefon)) eski.push({ id: "veli", yakinlik: "Veli", ad_soyad: o.veli_adi, telefon: o.veli_telefon });
  return eski;
}

function Istatistik({ sayi, etiket, renk }) {
  return (
    <div className="profil-stat">
      <div className="profil-stat-sayi" style={renk ? { color: renk } : undefined}>{sayi}</div>
      <div className="profil-stat-etiket">{etiket}</div>
    </div>
  );
}

export default async function OgrenciProfili({ params }) {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  const yoklamaVar = modulErisimVarMi(session, "duz_yoklama");
  const namazVar = modulErisimVarMi(session, "namaz_yoklama");

  const supabase = supabaseServer();
  const { data: ogrenci } = await supabase
    .from("ogrenciler")
    .select("*, ogrenci_yakinlari(*), gruplar(isim)")
    .eq("id", params.id)
    .maybeSingle();
  if (!ogrenci) notFound();

  const bugun = sunucuTarihiISO();
  const baslangic = gunOncesi(bugun, GUN_SAYISI - 1);

  const [yoklamaSonuc, namazSonuc, turSonuc] = await Promise.all([
    yoklamaVar
      ? supabase
          .from("yoklama")
          .select("tarih, durum, saat, not_metni, tur_id")
          .eq("ogrenci_id", ogrenci.id)
          .gte("tarih", baslangic)
          .lte("tarih", bugun)
          .order("tarih", { ascending: false })
          .order("saat", { ascending: false })
      : Promise.resolve({ data: [] }),
    namazVar
      ? supabase
          .from("namaz_yoklama")
          .select("tarih, vakit, durum")
          .eq("ogrenci_id", ogrenci.id)
          .gte("tarih", baslangic)
          .lte("tarih", bugun)
      : Promise.resolve({ data: [] }),
    supabase.from("yoklama_turleri").select("id, isim"),
  ]);

  const turAdi = new Map((turSonuc.data || []).map((t) => [t.id, t.isim]));
  const yoklamalar = yoklamaSonuc.data || [];
  const namazlar = namazSonuc.data || [];

  const say = (liste, anahtar, deger) => liste.filter((k) => k[anahtar] === deger).length;
  const geldi = say(yoklamalar, "durum", "geldi");
  const izinli = say(yoklamalar, "durum", "izinli");
  const izinsiz = say(yoklamalar, "durum", "izinsiz");
  // Devam oranı: izinli günler hesaba katılmaz (Sunum Modu ile aynı mantık).
  const oranPay = yoklamalar.length - izinli;
  const devamOrani = oranPay > 0 ? Math.round((geldi / oranPay) * 100) : null;

  const kildi = say(namazlar, "durum", "kildi");
  const gecKildi = say(namazlar, "durum", "gec_kildi");
  const namazIzinli = say(namazlar, "durum", "izinli");
  const kilmadi = say(namazlar, "durum", "kilmadi");

  const yakinlar = yakinlariTopla(ogrenci, ogrenci.ogrenci_yakinlari);
  const harita = haritaLinki(ogrenci.yasadigi_yer);
  const grupAdi = ogrenci.gruplar?.isim || "Grupsuz";

  return (
    <>
      <div className="sayfa-baslik">
        <h1>{ogrenci.ad_soyad}</h1>
        <span className="rozet rozet-mavi">{grupAdi}</span>
      </div>
      <p className="sayfa-alt">
        {ogrenci.aktif ? "Aktif öğrenci" : "Pasif (listeden kaldırılmış)"} · Son {GUN_SAYISI} günün özeti
      </p>

      <div className="profil-izgara">
        <div className="kart">
          <div className="kart-ic">
            <h3 className="profil-baslik">İletişim ve adres</h3>
            {ogrenci.yasadigi_yer ? (
              <div className="profil-satir">
                <span>{ogrenci.yasadigi_yer}</span>
                {harita && (
                  <a className="btn btn-hayalet btn-sm" href={harita} target="_blank" rel="noopener noreferrer">
                    Haritada aç
                  </a>
                )}
              </div>
            ) : (
              <div className="ogrenci-detay">Adres girilmemiş.</div>
            )}
            {yakinlar.length === 0 && <div className="ogrenci-detay" style={{ marginTop: 8 }}>Veli bilgisi girilmemiş.</div>}
            {yakinlar.map((y) => (
              <div className="profil-satir" key={y.id}>
                <span>
                  <strong>{y.yakinlik}</strong>
                  {y.ad_soyad ? `: ${y.ad_soyad}` : ""}
                  {y.meslek ? ` (${y.meslek})` : ""}
                </span>
                {y.telefon && (
                  <a className="btn btn-hayalet btn-sm" href={`tel:${y.telefon.replace(/\s+/g, "")}`}>
                    {y.telefon}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {yoklamaVar && (
          <div className="kart">
            <div className="kart-ic">
              <h3 className="profil-baslik">Yoklama özeti</h3>
              {yoklamalar.length === 0 ? (
                <div className="ogrenci-detay">Bu dönemde yoklama kaydı yok.</div>
              ) : (
                <div className="profil-stat-izgara">
                  <Istatistik sayi={geldi} etiket="Geldi" renk="var(--yesil-metin)" />
                  <Istatistik sayi={izinli} etiket="İzinli" renk="var(--amber-metin)" />
                  <Istatistik sayi={izinsiz} etiket="İzinsiz" renk="var(--kirmizi-metin)" />
                  {devamOrani !== null && <Istatistik sayi={`%${devamOrani}`} etiket="Devam oranı" />}
                </div>
              )}
            </div>
          </div>
        )}

        {namazVar && (
          <div className="kart">
            <div className="kart-ic">
              <h3 className="profil-baslik">Namaz özeti</h3>
              {namazlar.length === 0 ? (
                <div className="ogrenci-detay">Bu dönemde namaz kaydı yok.</div>
              ) : (
                <div className="profil-stat-izgara">
                  <Istatistik sayi={kildi} etiket="Kıldı" renk="var(--yesil-metin)" />
                  <Istatistik sayi={gecKildi} etiket="Geç kıldı" />
                  <Istatistik sayi={namazIzinli} etiket="İzinli" renk="var(--amber-metin)" />
                  <Istatistik sayi={kilmadi} etiket="Kılmadı" renk="var(--kirmizi-metin)" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {yoklamaVar && yoklamalar.length > 0 && (
        <div className="kart" style={{ marginTop: 20 }}>
          <div className="kart-ic">
            <h3 className="profil-baslik">Son yoklama kayıtları</h3>
            {yoklamalar.slice(0, 40).map((k, i) => (
              <div className="profil-kayit" key={i}>
                <div>
                  <div className="ogrenci-ad">{tarihKisa(k.tarih)}</div>
                  <div className="ogrenci-detay">
                    {turAdi.get(k.tur_id) || "Yoklama"}
                    {k.durum === "geldi" && k.saat ? ` · saat ${k.saat.slice(0, 5)}` : ""}
                    {k.not_metni ? ` · ${k.not_metni}` : ""}
                  </div>
                </div>
                <span className={`rozet ${DURUM_ROZET[k.durum] || "rozet-gri"}`}>{DURUM_ETIKET[k.durum] || k.durum}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {namazVar && namazlar.length > 0 && (
        <div className="kart" style={{ marginTop: 20 }}>
          <div className="kart-ic">
            <h3 className="profil-baslik">Son namaz kayıtları</h3>
            {[...namazlar]
              .sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0))
              .slice(0, 40)
              .map((k, i) => (
                <div className="profil-kayit" key={i}>
                  <div>
                    <div className="ogrenci-ad">{tarihKisa(k.tarih)}</div>
                    <div className="ogrenci-detay">{VAKIT_ETIKET[k.vakit] || k.vakit}</div>
                  </div>
                  <span className={`rozet ${NAMAZ_ROZET[k.durum] || "rozet-gri"}`}>{NAMAZ_ETIKET[k.durum] || k.durum}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/duz-yoklama" className="btn btn-hayalet btn-sm">
          ← Yoklamaya dön
        </Link>
      </div>
    </>
  );
}
