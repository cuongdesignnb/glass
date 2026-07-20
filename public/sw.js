// Migration worker: the storefront does not currently promise offline/PWA mode.
// Existing registrations update to this worker, remove legacy caches, then unregister.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name.startsWith('glass-eyewear-') || name.startsWith('mitoo-store-'))
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.registration.unregister()),
  );
});
