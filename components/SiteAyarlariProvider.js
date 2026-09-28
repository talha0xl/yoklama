"use client";
import { createContext, useContext } from "react";

// "Site Tasarımı" sayfasından değiştirilebilen site adı/logo — kök layout
// bunu sunucuda okuyup buraya veriyor, alt bileşenler /logo.png ve sabit
// "Yavuztürk Süleymaniye" metni yerine bunu kullanıyor.
const SiteAyarlariBaglam = createContext({
  siteAdi: "Yavuztürk Süleymaniye",
  logoUrl: null,
});

export function SiteAyarlariProvider({ value, children }) {
  return <SiteAyarlariBaglam.Provider value={value}>{children}</SiteAyarlariBaglam.Provider>;
}

export function useSiteAyarlari() {
  return useContext(SiteAyarlariBaglam);
}
