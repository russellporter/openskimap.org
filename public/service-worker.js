// Do not remove! This is needed to clean up the old service worker used before we switched to Vite.
self.addEventListener("install", function (event) {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    Promise.all([
      // Clear all caches
      caches.keys().then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            console.log("Deleting cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Unregister this service worker
      self.registration.unregister().then(function () {
        console.log("Old service worker unregistered");
        // Force reload to get fresh content
        self.clients.matchAll().then(function (clients) {
          clients.forEach(function (client) {
            client.navigate(client.url);
          });
        });
      }),
    ])
  );
});
