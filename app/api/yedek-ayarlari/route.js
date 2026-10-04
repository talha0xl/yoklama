import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";

async function adminMi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  return !!session?.admin;
}

// GET /api/yedek-ayarlari — otomatik yedekleme sıklığını (haftalık/aylık) döner.
export async function GET() {
  if (!(await adminMi())) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("yedek_ayarlari").select("*").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ayar: data });
}

// PATCH { siklik: "haftalik" | "aylik" }
export async function PATCH(req) {
  if (!(await adminMi())) {
    return NextResponse.json({ error: "Bu işlem sadece yöneticiler içindir" }, { status: 403 });
  }
  const body = await req.json();
  if (!["haftalik", "aylik"].includes(body.siklik)) {
    return NextResponse.json({ error: "Geçersiz sıklık" }, { status: 400 });
  }
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("yedek_ayarlari")
    .update({ siklik: body.siklik })
    .eq("id", 1)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ayar: data });
}
