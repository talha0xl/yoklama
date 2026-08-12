import Kabuk from "../../components/Kabuk";
import YoklamaIstemci from "./YoklamaIstemci";

export default function YoklamaSayfasi() {
  return (
    <Kabuk aktif="/yoklama">
      <YoklamaIstemci />
    </Kabuk>
  );
}
