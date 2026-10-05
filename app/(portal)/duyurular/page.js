import { cookies } from "next/headers";
import { verifySession } from "../../../lib/session";
import DuyurularIstemci from "./DuyurularIstemci";

export const dynamic = "force-dynamic";

export default async function DuyurularSayfasi() {
  const token = cookies().get("yt_session")?.value;
  const session = token ? await verifySession(token, process.env.SESSION_SECRET) : null;
  return <DuyurularIstemci isAdmin={!!session?.admin} />;
}
