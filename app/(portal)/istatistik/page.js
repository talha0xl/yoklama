import { supabaseServer } from "../../../lib/supabaseServer";
import IstatistikIstemci from "./IstatistikIstemci";

export const dynamic = "force-dynamic";

export default async function IstatistikSayfasi() {
  const supabase = supabaseServer();
  const [{ data: gruplar }, { data: turler }, { data: listeler }] = await Promise.all([
    supabase.from("gruplar").select("*").order("siralama"),
    supabase.from("yoklama_turleri").select("*").eq("aktif", true).order("siralama"),
    supabase.from("gorev_listeleri").select("*").order("siralama"),
  ]);

  return (
    <IstatistikIstemci
      baslangicGruplar={gruplar || []}
      baslangicTurler={turler || []}
      baslangicListeler={listeler || []}
    />
  );
}
