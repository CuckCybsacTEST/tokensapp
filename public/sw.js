// Basic placeholder service worker for PWA installability & offline shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

// Redirect legacy /marketing start_url to / for existing PWA installs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/marketing' && event.request.mode === 'navigate') {
    url.pathname = '/';
    event.respondWith(Response.redirect(url.href, 302));
    return;
  }
  // Default: network passthrough
});
