import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import SiteTasarimIstemci from "./SiteTasarimIstemci";

export const dynamic = "force-dynamic";

export default async function SiteTasarimSayfasi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  return <SiteTasarimIstemci sahipAdi={session?.sahip_adi || null} />;
}
