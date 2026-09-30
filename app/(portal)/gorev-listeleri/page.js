import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabaseServer";
import GorevIstemci from "./GorevIstemci";

export const dynamic = "force-dynamic";

export default async function GorevListeleriSayfasi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;

  const supabase = supabaseServer();
  const { data: listeler } = await supabase.from("gorev_listeleri").select("*").order("siralama");

  return <GorevIstemci isAdmin={!!session?.admin} baslangicListeler={listeler || []} />;
}
