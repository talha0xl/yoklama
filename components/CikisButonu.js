"use client";
import { useRouter } from "next/navigation";

export default function CikisButonu() {
  const router = useRouter();
  async function cikis() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button className="cikis-btn" onClick={cikis}>
      Çıkış yap
    </button>
  );
}
