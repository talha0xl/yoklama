"use client";
import { useEffect, useState } from "react";

export default function TemaDugmesi() {
  const [tema, setTema] = useState(null); // ilk render'da bilinmiyor (SSR ile aynı kalsın diye)

  useEffect(() => {
    setTema(document.documentElement.getAttribute("data-tema") || "acik");
  }, []);

  function degistir() {
    const yeni = (tema === "koyu" ? "acik" : "koyu");
    document.documentElement.setAttribute("data-tema", yeni);
    try {
      localStorage.setItem("yt-tema", yeni);
    } catch {}
    setTema(yeni);
  }

  const koyuMu = tema === "koyu";

  return (
    <button type="button" className="tema-btn" onClick={degistir} title={koyuMu ? "Açık ekrana geç" : "Koyu ekrana geç"}>
      <span aria-hidden="true">{koyuMu ? "☀️" : "🌙"}</span>
      <span className="tema-btn-metin">{koyuMu ? "Açık Ekran" : "Koyu Ekran"}</span>
    </button>
  );
}
