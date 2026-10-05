// Servis çalışanı: site kapalıyken bile gelen bildirimi gösterir.
self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function () {
  // Önbellek yok: her şey her zaman güncel gelir.
});

self.addEventListener("push", function (event) {
  var veri = {};
  try {
    veri = event.data ? event.data.json() : {};
  } catch (e) {
    veri = { baslik: "Yeni duyuru", metin: event.data ? event.data.text() : "" };
  }
  var baslik = veri.baslik || "Yeni duyuru";
  event.waitUntil(
    self.registration.showNotification(baslik, {
      body: veri.metin || "",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: veri.etiket || undefined,
      data: { url: veri.url || "/duyurular" },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var hedef = (event.notification.data && event.notification.data.url) || "/duyurular";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (liste) {
      for (var i = 0; i < liste.length; i++) {
        var c = liste[i];
        if ("focus" in c) {
          if ("navigate" in c) c.navigate(hedef);
          return c.focus();
        }
      }
      return self.clients.openWindow(hedef);
    })
  );
});
