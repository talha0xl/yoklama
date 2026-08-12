import Kabuk from "../../components/Kabuk";
import IstatistikIstemci from "./IstatistikIstemci";

export default function IstatistikSayfasi() {
  return (
    <Kabuk aktif="/istatistik">
      <IstatistikIstemci />
    </Kabuk>
  );
}
