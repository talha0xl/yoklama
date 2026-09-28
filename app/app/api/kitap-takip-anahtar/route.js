import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { modulErisimVarMi } from "../../../lib/moduller";

// GET /api/kitap-takip-anahtar — kitap-takip.html sayfası açılır açılmaz
// bunu sessizce çağırır. Kişi zaten ana portala (Yoklama'ya vs.) girdiği
// erişim koduyla oturum açmışsa, Kitap Takip'in Supabase erişimi için de
// AYNI kodu döndürür ki ayrıca bir kod sormaya gerek kalmasın — "aynı
// sitedeki gibi" giriş yapmış olur. Oturum yoksa ya da bu kişinin Kitap
// Takip modülüne izni yoksa 401/403 döner; bu durumda kitap-takip.html
// kendi (elle kod giriştirilen) kapısına düşer.
export async function GET() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  if (!session) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });
  if (!modulErisimVarMi(session, "kitap_takip")) {
    return NextResponse.json({ error: "Bu modüle erişiminiz yok" }, { status: 403 });
  }
  if (!session.kod) {
    // Bu oturum, "kod" alanının session'a eklenmesinden ÖNCE açılmış olabilir
    // (30 günlük eski bir çerez). Kişi bir kere daha giriş yapınca düzelir.
    return NextResponse.json({ error: "Kod bilgisi yok, tekrar giriş yapın" }, { status: 401 });
  }
  return NextResponse.json({ kod: session.kod });
}
