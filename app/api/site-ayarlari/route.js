import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";
import { modulErisimVarMi } from "../../../lib/moduller";
import { denetimKaydet } from "../../../lib/denetim";

const GECERLI_SITELER = new Set(["ana_portal", "kitap_takip"]);
// Base64'e çevrilmiş bir logonun büyüklüğü — çok büyük bir görsel hem
// veritabanı satırını şişirir hem de sayfaları yavaşlatır.
const MAKS_LOGO_KARAKTER = 900_000; // ~yaklaşık 650KB'lık bir görsele denk

async function oturumGetir() {
  const token = cookies().get("yt_session")?.value;
  return token ? await verifySession(token, process.env.SESSION_SECRET) : null;
}

function yetkiVarMi(session) {
  return !!session && (session.admin || modulErisimVarMi(session, "site_tasarim"));
}

// GET /api/site-ayarlari — hem ana_portal hem kitap_takip satırlarını döner.
export async function GET() {
  const session = await oturumGetir();
  if (!yetkiVarMi(session)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
  }
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("site_ayarlari").select("*");
  if (error) {
    // v15 SQL'i henüz çalıştırılmamışsa tablo yoktur — boş dön, sayfa
    // kullanıcıya "önce SQL'i çalıştırın" mesajı gösterebilsin.
    return NextResponse.json({ ayarlar: [], hazirDegil: true });
  }
  return NextResponse.json({ ayarlar: data });
}

// PATCH { site, site_adi, logo_url, ana_renk }
export async function PATCH(req) {
  const session = await oturumGetir();
  if (!yetkiVarMi(session)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
  }
  const body = await req.json();
  const site = body.site;
  if (!GECERLI_SITELER.has(site)) {
    return NextResponse.json({ error: "Geçersiz site" }, { status: 400 });
  }
  if (typeof body.logo_url === "string" && body.logo_url.length > MAKS_LOGO_KARAKTER) {
    return NextResponse.json({ error: "Logo dosyası çok büyük. Lütfen daha küçük bir görsel seçin." }, { status: 400 });
  }
  if (body.ana_renk && !/^#[0-9a-fA-F]{6}$/.test(body.ana_renk)) {
    return NextResponse.json({ error: "Renk kodu geçersiz." }, { status: 400 });
  }

  const guncelleme = { updated_at: new Date().toISOString() };
  if (body.site_adi !== undefined) guncelleme.site_adi = body.site_adi?.trim() || null;
  if (body.logo_url !== undefined) guncelleme.logo_url = body.logo_url || null;
  if (body.ana_renk !== undefined) guncelleme.ana_renk = body.ana_renk || null;

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("site_ayarlari")
    .upsert({ site, ...guncelleme }, { onConflict: "site" })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await denetimKaydet(supabase, {
    islem: "guncelleme",
    hedefTablo: "site_ayarlari",
    hedefId: site,
    aciklama: `${session.sahip_adi || "Bir kullanıcı"} site tasarımını güncelledi (${site === "kitap_takip" ? "Kitap Takip" : "Ana Portal"})`,
  });

  return NextResponse.json({ ayar: data });
}
