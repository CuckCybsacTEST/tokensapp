// Basic placeholder service worker for PWA installability & offline shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

// Simple fetch passthrough; extend with cache strategy later
self.addEventListener('fetch', () => {});
