import Kabuk from "../../components/Kabuk";
import MesajIstemci from "./MesajIstemci";

export default function MesajSayfasi() {
  return (
    <Kabuk aktif="/mesaj">
      <MesajIstemci />
    </Kabuk>
  );
}
