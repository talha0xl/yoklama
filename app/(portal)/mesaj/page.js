import { supabaseServer } from "../../../lib/supabaseServer";
import MesajIstemci from "./MesajIstemci";

export const dynamic = "force-dynamic";

export default async function MesajSayfasi() {
  const supabase = supabaseServer();
  const [{ data: gruplar }, { data: turler }] = await Promise.all([
    supabase.from("gruplar").select("*").order("siralama"),
    supabase.from("yoklama_turleri").select("*").eq("aktif", true).order("siralama"),
  ]);

  return <MesajIstemci baslangicGruplar={gruplar || []} baslangicTurler={turler || []} />;
}
