"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GirisSayfasi() {
  return (
    <Suspense fallback={null}>
      <GirisFormu />
    </Suspense>
  );
}

function GirisFormu() {
  const [kod, setKod] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  async function girisYap(e) {
    e.preventDefault();
    setHata("");
    setYukleniyor(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kod }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHata(data.error || "Giriş başarısız.");
        setYukleniyor(false);
        return;
      }
      const hedef = params.get("next") || (data.yetki === "yonetici" ? "/yoklama" : "/yoklama");
      router.push(hedef);
      router.refresh();
    } catch {
      setHata("Bağlantı hatası. Tekrar deneyin.");
      setYukleniyor(false);
    }
  }

  return (
    <div className="login-sarma">
      <div className="login-kart">
        <img src="/logo.png" alt="Yavuztürk Süleymaniye" />
        <div className="serit" style={{ marginBottom: 24 }} />
        <h1 style={{ fontSize: 19, textAlign: "center", color: "var(--lacivert)", marginBottom: 6 }}>
          Yoklama Sistemi
        </h1>
        <p style={{ textAlign: "center", color: "var(--metin-soluk)", fontSize: 14, marginBottom: 26 }}>
          Size verilen erişim kodunu girin
        </p>
        <form onSubmit={girisYap}>
          <label className="etiket">Erişim kodu</label>
          <input
            className="girdi"
            type="password"
            autoFocus
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            placeholder="••••••"
            style={{ textAlign: "center", letterSpacing: "2px", fontSize: 18, fontWeight: 700 }}
          />
          {hata && <div className="hata" style={{ marginTop: 14 }}>{hata}</div>}
          <button className="btn btn-lacivert btn-blok" style={{ marginTop: 18 }} disabled={yukleniyor || !kod}>
            {yukleniyor ? "Kontrol ediliyor..." : "Giriş yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
