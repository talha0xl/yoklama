import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../../lib/session";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { vapidAl } from "../../../../lib/pushGonder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function oturum() {
  const token = cookies().get("yt_session")?.value;
  return token ? await verifySession(token, process.env.SESSION_SECRET) : null;
}

// GET -> tarayıcının abone olurken kullanacağı PUBLIC anahtar
export async function GET() {
  try {
    const { publicKey } = await vapidAl();
    return NextResponse.json({ publicKey });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST { abonelik: { endpoint, keys: { p256dh, auth } } } -> bu cihazı kaydet
export async function POST(req) {
  const session = await oturum();
  const body = await req.json().catch(() => null);
  const ab = body?.abonelik;
  if (!ab?.endpoint || !ab?.keys?.p256dh || !ab?.keys?.auth) {
    return NextResponse.json({ error: "Geçersiz abonelik" }, { status: 400 });
  }
  const supabase = supabaseServer();
  const { error } = await supabase.from("push_abonelikleri").upsert(
    {
      endpoint: ab.endpoint,
      p256dh: ab.keys.p256dh,
      auth: ab.keys.auth,
      kullanici: session?.sahip_adi || null,
      yonetici: !!session?.admin,
      user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
      son_gorulme: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE { endpoint } -> bu cihazın bildirimini kapat
export async function DELETE(req) {
  const body = await req.json().catch(() => null);
  if (!body?.endpoint) return NextResponse.json({ error: "endpoint gerekli" }, { status: 400 });
  const supabase = supabaseServer();
  const { error } = await supabase.from("push_abonelikleri").delete().eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
