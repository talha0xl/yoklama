import Kabuk from "../../components/Kabuk";
import AdminIstemci from "./AdminIstemci";

export default function AdminSayfasi() {
  return (
    <Kabuk aktif="/admin">
      <AdminIstemci />
    </Kabuk>
  );
}
