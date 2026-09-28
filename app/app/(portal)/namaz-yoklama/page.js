import { supabaseServer } from "../../../lib/supabaseServer";
import NamazYoklamaIstemci from "./NamazYoklamaIstemci";

export const dynamic = "force-dynamic";

export default async function NamazYoklamaSayfasi() {
  const supabase = supabaseServer();
  const { data: gruplar } = await supabase.from("gruplar").select("*").order("siralama");

  return <NamazYoklamaIstemci baslangicGruplar={gruplar || []} />;
}
