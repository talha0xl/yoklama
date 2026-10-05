"use client";
import { useEffect } from "react";

// Servis çalışanını (bildirim + "uygulama olarak kur" için gerekli) sessizce kaydeder.
export default function SwKaydi() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
