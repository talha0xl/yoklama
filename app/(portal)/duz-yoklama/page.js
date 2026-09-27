import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";
import YoklamaIstemci from "./YoklamaIstemci";

export const dynamic = "force-dynamic";

export default async function YoklamaSayfasi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  const supabase = supabaseServer();
  const [{ data: turler }, { data: gruplar }] = await Promise.all([
    supabase.from("yoklama_turleri").select("*").eq("aktif", true).order("siralama"),
    supabase.from("gruplar").select("*").order("siralama"),
  ]);

  return <YoklamaIstemci isAdmin={!!session?.admin} baslangicTurler={turler || []} baslangicGruplar={gruplar || []} />;
}
