import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "../../lib/session";
import { MODULLER, modulErisimVarMi } from "../../lib/moduller";
import { supabaseServer } from "../../lib/supabaseServer";
import { sirdakiOge } from "../../lib/rotasyon";
import { sunucuTarihiISO } from "../../lib/zaman";

async function tekVazifeGetir(supabase, liste, tarih) {
  const [{ data: kisiler }, { data: gruplar }] = await Promise.all([
    supabase.from("gorev_kisileri").select("*").eq("aktif", true).eq("liste_id", liste.id).order("sira"),
    supabase.from("gorev_gruplari").select("*").eq("liste_id", liste.id).order("siralama"),
  ]);
  const birimler =
    gruplar && gruplar.length
      ? gruplar.map((g) => ({ isim: g.isim }))
      : (kisiler || []).map((k) => ({ isim: k.ad_soyad }));
  if (!birimler.length) return null;
  const bugunVazifeli = sirdakiOge(birimler, liste.rotasyon_baslangic, tarih);
  return bugunVazifeli ? { liste: liste.isim, kisi: bugunVazifeli.isim } : null;
}

async function vazifelerGetir(supabase, tarih) {
  const { data: listeler } = await supabase.from("gorev_listeleri").select("*").eq("rotasyonlu", true).order("siralama");
  const sonuclar = await Promise.all((listeler || []).map((liste) => tekVazifeGetir(supabase, liste, tarih)));
  return sonuclar.filter(Boolean);
}

async function ozetVerileriGetir(session) {
  const supabase = supabaseServer();
  const tarih = sunucuTarihiISO();
  const vazifeSonuc = modulErisimVarMi(session, "gorev_listeleri")
    ? await vazifelerGetir(supabase, tarih).catch(() => [])
    : [];
  return { vazifeler: vazifeSonuc || [] };
}

export default async function Anasayfa() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session) redirect("/login");

  const gorulebilirModuller = MODULLER.filter(
    (m) => (m.hazir || session.admin) && modulErisimVarMi(session, m.anahtar)
  );
  const ozet = await ozetVerileriGetir(session);

  return (
    <>
      <div className="sayfa-baslik">
        <h1>Hoş geldiniz{session.sahip_adi ? `, ${session.sahip_adi}` : ""}</h1>
      </div>
      <p className="sayfa-alt">Devam etmek istediğiniz modülü seçin.</p>

      {ozet.vazifeler.length > 0 && (
        <>
          <div className="ozet-baslik">Bugünün vazifeleri</div>
          <div className="vazife-ozet-izgara">
            {ozet.vazifeler.map((v) => (
              <div className="vazife-ozet-kart" key={v.liste}>
                <div className="vazife-ozet-liste">{v.liste}</div>
                <div className="vazife-ozet-kisi">{v.kisi}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="modul-izgara">
        {gorulebilirModuller.map((m) => {
          const pasif = !m.hazir;
          return (
            <ModulKart key={m.anahtar} modul={m} pasif={pasif} />
          );
        })}
        {gorulebilirModuller.length === 0 && (
          <div className="bos-durum">
            Henüz erişiminiz olan bir modül yok. Yöneticinizle iletişime geçin.
          </div>
        )}
      </div>
    </>
  );
}

function ModulKart({ modul, pasif }) {
  const icerik = (
    <>
      <div className="modul-simge">
        <ModulSimgesi anahtar={modul.anahtar} />
      </div>
      <div className="modul-baslik">
        {modul.isim}
        {pasif && <span className="rozet rozet-gri">Yapım aşamasında</span>}
      </div>
      <div className="modul-aciklama">{modul.aciklama}</div>
    </>
  );
  if (pasif) {
    return <div className={`modul-kart modul-pasif`}>{icerik}</div>;
  }
  return (
    <Link href={modul.yol} className="modul-kart">
      {icerik}
    </Link>
  );
}

function ModulSimgesi({ anahtar }) {
  const stil = { width: 22, height: 22, stroke: "var(--baslik)", fill: "none", strokeWidth: 1.8 };
  if (anahtar === "duz_yoklama")
    return (
      <svg viewBox="0 0 24 24" style={stil}>
        <path d="M4 12l4 4L20 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (anahtar === "namaz_yoklama")
    return (
      <svg viewBox="0 0 24 24" style={stil}>
        <path d="M12 3v6M12 21c-4-2-7-5-7-9a7 7 0 0114 0c0 4-3 7-7 9z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (anahtar === "gorev_listeleri")
    return (
      <svg viewBox="0 0 24 24" style={stil}>
        <path d="M5 6h14M5 12h14M5 18h9" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" style={stil}>
      <path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5zM20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z" strokeLinejoin="round" />
    </svg>
  );
}
