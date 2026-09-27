import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";
import { signSession } from "../../../lib/session";

export async function POST(req) {
  const { kod } = await req.json();
  if (!kod || typeof kod !== "string") {
    return NextResponse.json({ error: "Kod gerekli." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("erisim_kodlari")
    .select("*")
    .eq("kod", kod.trim())
    .eq("aktif", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Kod hatalı veya pasif." }, { status: 401 });
  }

  let moduller = [];
  if (!data.admin) {
    const { data: izinler } = await supabase
      .from("erisim_kodu_moduller")
      .select("modul_anahtari")
      .eq("erisim_kodu_id", data.id);
    moduller = (izinler || []).map((i) => i.modul_anahtari);
  }

  await supabase
    .from("erisim_kodlari")
    .update({ son_giris: new Date().toISOString() })
    .eq("id", data.id);

  const token = await signSession(
    {
      sahip_adi: data.sahip_adi,
      admin: !!data.admin,
      moduller,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 gün
    },
    process.env.SESSION_SECRET
  );

  const res = NextResponse.json({ ok: true, admin: !!data.admin, sahip_adi: data.sahip_adi });
  res.cookies.set("yt_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
