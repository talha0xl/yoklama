"use client";
import { useEffect, useRef } from "react";

// Aynı sayfayı aynı anda açmış birden fazla hoca olabildiği için (örn.
// namaz yoklamasını nöbetçi hoca işaretlerken başka bir hoca da aynı
// ekrana bakıyor olabilir), sekme açık ve öndeyken belirli aralıklarla
// arka planda veriyi tazeliyoruz. Gerçek "anlık" (websocket) güncelleme
// değil ama kurulumu basit ve ek bir Supabase ayarı gerektirmiyor — birkaç
// saniye içinde diğer ekranlara da yansır. Sekme arka plandayken veya
// pencere odakta değilken durur, gereksiz istek atmaz.
export function useAraliklaTazele(geriCagri, msAralik = 6000) {
  const cagriRef = useRef(geriCagri);
  cagriRef.current = geriCagri;

  useEffect(() => {
    const zamanlayici = setInterval(() => {
      if (document.visibilityState === "visible") cagriRef.current();
    }, msAralik);
    return () => clearInterval(zamanlayici);
  }, [msAralik]);
}
